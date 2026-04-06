<?php

namespace App\Services;

use App\Models\ImportedSubscriptionContract;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;

class SubscriptionContractImportService
{
    /**
     * @return Collection<int, ImportedSubscriptionContract>
     */
    public function import(User $shop, UploadedFile $file): Collection
    {
        $content = $file->get();

        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('The uploaded CSV file is empty.');
        }

        $rows = $this->parseCsvContent($content);

        if ($rows->count() < 2) {
            throw new RuntimeException('The uploaded CSV file must include a header row and at least one contract row.');
        }

        $headers = $rows->first();

        if (! is_array($headers)) {
            throw new RuntimeException('The uploaded CSV file header could not be read.');
        }

        $requiredHeaders = [
            'handle',
            'currency_code',
            'status',
            'cadence_interval',
            'cadence_interval_count',
            'delivery_price',
            'line_quantity',
            'line_current_price',
            'line_selling_plan_name',
        ];
        $missingHeaders = collect($requiredHeaders)
            ->reject(fn (string $header): bool => in_array($header, $headers, true))
            ->values();

        if ($missingHeaders->isNotEmpty()) {
            throw new RuntimeException('The CSV template is missing required columns: '.$missingHeaders->implode(', '));
        }

        $groupedRecords = $rows
            ->slice(1)
            ->map(function (array $row) use ($headers): array {
                return collect($headers)
                    ->mapWithKeys(fn (string $header, int $index): array => [$header => $row[$index] ?? ''])
                    ->all();
            })
            ->filter(fn (array $record): bool => filled($record['handle'] ?? null))
            ->groupBy('handle');

        if ($groupedRecords->isEmpty()) {
            throw new RuntimeException('No importable contracts were found in the uploaded CSV.');
        }

        return $groupedRecords
            ->map(function (Collection $lines, string $handle) use ($shop): ImportedSubscriptionContract {
                /** @var array<string, string> $firstRow */
                $firstRow = $lines->first();
                $customerName = trim(collect([
                    $firstRow['delivery_address_first_name'] ?? '',
                    $firstRow['delivery_address_last_name'] ?? '',
                ])->filter()->implode(' '));
                $customerName = $customerName !== '' ? $customerName : ($firstRow['customer_id'] ?: 'Imported customer');
                $currencyCode = Str::upper($firstRow['currency_code'] ?: 'USD');
                $deliveryFrequency = $this->formatDeliveryFrequency(
                    $firstRow['cadence_interval'] ?? '',
                    $firstRow['cadence_interval_count'] ?? ''
                );
                $amountValue = $this->calculateAmountValue($lines, $firstRow['delivery_price'] ?? '0');

                return $shop->importedSubscriptionContracts()->updateOrCreate(
                    ['handle' => $handle],
                    [
                        'customer_name' => $customerName,
                        'plan_name' => $firstRow['line_selling_plan_name'] ?: 'Imported subscription plan',
                        'amount' => $this->formatMoney($amountValue, $currencyCode),
                        'amount_value' => $amountValue,
                        'currency_code' => $currencyCode,
                        'status' => $this->formatStatus($firstRow['status'] ?? ''),
                        'delivery_frequency' => $deliveryFrequency,
                        'payload' => [
                            'handle' => $handle,
                            'rows' => $lines->values()->all(),
                        ],
                    ]
                );
            })
            ->values();
    }

    /**
     * @return Collection<int, array<int, string>>
     */
    private function parseCsvContent(string $content): Collection
    {
        $rows = [];
        $currentRow = [];
        $currentValue = '';
        $inQuotes = false;
        $length = strlen($content);

        for ($index = 0; $index < $length; $index += 1) {
            $character = $content[$index];
            $nextCharacter = $content[$index + 1] ?? null;

            if ($character === '"') {
                if ($inQuotes && $nextCharacter === '"') {
                    $currentValue .= '"';
                    $index += 1;
                } else {
                    $inQuotes = ! $inQuotes;
                }

                continue;
            }

            if ($character === ',' && ! $inQuotes) {
                $currentRow[] = $currentValue;
                $currentValue = '';

                continue;
            }

            if (($character === "\n" || $character === "\r") && ! $inQuotes) {
                if ($character === "\r" && $nextCharacter === "\n") {
                    $index += 1;
                }

                $currentRow[] = $currentValue;
                $currentValue = '';

                if (collect($currentRow)->contains(fn (string $field): bool => trim($field) !== '')) {
                    $rows[] = $currentRow;
                }

                $currentRow = [];

                continue;
            }

            $currentValue .= $character;
        }

        if ($currentValue !== '' || $currentRow !== []) {
            $currentRow[] = $currentValue;
        }

        if ($currentRow !== [] && collect($currentRow)->contains(fn (string $field): bool => trim($field) !== '')) {
            $rows[] = $currentRow;
        }

        return collect($rows);
    }

    /**
     * @param  Collection<int, array<string, string>>  $lines
     */
    private function calculateAmountValue(Collection $lines, string $deliveryPrice): float
    {
        $lineTotal = $lines->sum(fn (array $line): float => (float) ($line['line_current_price'] ?? 0) * (int) ($line['line_quantity'] ?? 0));

        return round($lineTotal + (float) $deliveryPrice, 2);
    }

    private function formatMoney(float $amountValue, string $currencyCode): string
    {
        return $currencyCode === 'USD'
            ? '$'.number_format($amountValue, 2)
            : number_format($amountValue, 2).' '.$currencyCode;
    }

    private function formatStatus(string $status): string
    {
        return match (Str::upper(trim($status))) {
            'ACTIVE' => 'Active',
            'PAUSED' => 'Paused',
            'CANCELLED' => 'Canceled',
            'EXPIRED' => 'Expired',
            'FAILED' => 'Failed',
            default => 'Draft',
        };
    }

    private function formatDeliveryFrequency(string $interval, string $count): string
    {
        $intervalCount = max((int) $count, 1);
        $label = match (Str::upper(trim($interval))) {
            'DAY' => $intervalCount === 1 ? 'day' : 'days',
            'WEEK' => $intervalCount === 1 ? 'week' : 'weeks',
            'YEAR' => $intervalCount === 1 ? 'year' : 'years',
            default => $intervalCount === 1 ? 'month' : 'months',
        };

        return "Every {$intervalCount} {$label}";
    }
}

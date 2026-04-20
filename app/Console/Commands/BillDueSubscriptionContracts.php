<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\ShopifyContractService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;
use Throwable;

class BillDueSubscriptionContracts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:bill-due
        {--shop= : Only bill contracts for a specific myshopify.com domain}
        {--limit=100 : Maximum contracts to fetch per shop}
        {--dry-run : List due contracts without creating billing attempts}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create Shopify billing attempts for due subscription contracts.';

    public function __construct(private readonly ShopifyContractService $shopifyContractService)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $limit = max((int) $this->option('limit'), 1);
        $dryRun = (bool) $this->option('dry-run');
        $now = now();
        $processed = 0;
        $billed = 0;
        $failed = 0;

        $query = User::query()
            ->when(
                $this->option('shop'),
                fn (Builder $query, string $shop): Builder => $query->where('name', $shop)
            );

        $query->chunkById(50, function ($shops) use ($limit, $dryRun, $now, &$processed, &$billed, &$failed): void {
            foreach ($shops as $shop) {
                $processed++;

                try {
                    $contracts = $this->shopifyContractService->getBillableContracts($shop, $limit);
                } catch (Throwable $exception) {
                    $failed++;
                    $this->error("Failed to fetch contracts for {$shop->name}: {$exception->getMessage()}");

                    Log::error('Failed to fetch subscription contracts for recurring billing.', [
                        'shop' => $shop->name,
                        'exception' => $exception,
                    ]);

                    continue;
                }

                $dueContracts = $contracts->filter(fn (array $contract): bool => $this->isDue($contract, $now));

                if ($dueContracts->isEmpty()) {
                    $this->line("No due subscription contracts for {$shop->name}.");

                    continue;
                }

                foreach ($dueContracts as $contract) {
                    if ($dryRun) {
                        $this->line("Due: {$shop->name} {$contract['id']} on {$contract['nextBillingDate']}");

                        continue;
                    }

                    try {
                        $billingAttempt = $this->createBillingAttempt($shop, $contract);
                        $followingBillingDate = $this->shopifyContractService->calculateFollowingBillingDate($contract);

                        if ($followingBillingDate !== null) {
                            $this->shopifyContractService->setNextBillingDate($shop, $contract['id'], $followingBillingDate);
                        }

                        $billed++;
                        $this->info("Billing attempt {$billingAttempt['id']} created for {$shop->name} {$contract['id']}.");
                    } catch (Throwable $exception) {
                        $failed++;
                        $this->error("Failed to bill {$shop->name} {$contract['id']}: {$exception->getMessage()}");

                        Log::error('Failed to create recurring subscription billing attempt.', [
                            'shop' => $shop->name,
                            'contract_id' => $contract['id'] ?? null,
                            'next_billing_date' => $contract['nextBillingDate'] ?? null,
                            'exception' => $exception,
                        ]);
                    }
                }
            }
        });

        $summary = $dryRun
            ? "Checked {$processed} shops in dry-run mode."
            : "Checked {$processed} shops. Created {$billed} billing attempts.";

        if ($failed > 0) {
            $this->warn("{$summary} {$failed} failures.");

            return self::FAILURE;
        }

        $this->info($summary);

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $contract
     */
    private function isDue(array $contract, Carbon $now): bool
    {
        if (($contract['status'] ?? '') !== 'Active') {
            return false;
        }

        $nextBillingDate = (string) ($contract['nextBillingDate'] ?? '');

        if ($nextBillingDate === '') {
            return false;
        }

        try {
            return Carbon::parse($nextBillingDate)->lessThanOrEqualTo($now);
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $contract
     * @return array<string, mixed>
     */
    private function createBillingAttempt(User $shop, array $contract): array
    {
        $nextBillingDate = Carbon::parse((string) $contract['nextBillingDate']);

        return $this->shopifyContractService->createBillingAttempt(
            $shop,
            (string) $contract['id'],
            $this->idempotencyKey((string) $contract['id'], $nextBillingDate),
            $nextBillingDate
        );
    }

    private function idempotencyKey(string $contractId, Carbon $nextBillingDate): string
    {
        return 'subscription-billing-'.substr(hash('sha256', $contractId.'|'.$nextBillingDate->toDateString()), 0, 40);
    }
}

<?php

namespace App\Services;

use App\Models\ImportedSubscriptionContract;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ShopifyContractService
{
    public function getContracts(User $shop, int $limit = 25): Collection
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetSubscriptionContracts($first: Int!) {
  subscriptionContracts(first: $first, reverse: true) {
    nodes {
      id
      status
      createdAt
      updatedAt
      nextBillingDate
      customer {
        firstName
        lastName
        email
      }
      billingPolicy {
        interval
        intervalCount
      }
      deliveryPolicy {
        interval
        intervalCount
      }
      deliveryPrice {
        amount
        currencyCode
      }
      deliveryMethod {
        __typename
        ... on SubscriptionDeliveryMethodShipping {
          address {
            name
            address1
            address2
            city
            province
            zip
            country
          }
          shippingOption {
            title
            description
          }
        }
        ... on SubscriptionDeliveryMethodLocalDelivery {
          address {
            name
            address1
            address2
            city
            province
            zip
            country
          }
          localDeliveryOption {
            title
            description
          }
        }
        ... on SubscriptionDeliveryMethodPickup {
          pickupOption {
            title
          }
        }
      }
      lines(first: 10) {
        nodes {
          id
          title
          quantity
          currentPrice {
            amount
            currencyCode
          }
          lineDiscountedPrice {
            amount
            currencyCode
          }
          sellingPlanId
          sellingPlanName
          variantTitle
        }
      }
      originOrder {
        id
        name
        createdAt
      }
      orders(first: 5, reverse: true) {
        nodes {
          id
          name
          createdAt
        }
      }
    }
  }
}
GRAPHQL,
            [
                'first' => $limit,
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        return collect(data_get($body, 'data.subscriptionContracts.nodes', []))
            ->filter(fn (mixed $contract): bool => is_array($contract))
            ->map(fn (array $contract): array => $this->mapContract($contract))
            ->values();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getContract(User $shop, string $contractId): ?array
    {
        if ($contractId === '') {
            return null;
        }

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetSubscriptionContract($id: ID!) {
  subscriptionContract(id: $id) {
    id
    status
    createdAt
    updatedAt
    nextBillingDate
    customer {
      firstName
      lastName
      email
    }
    billingPolicy {
      interval
      intervalCount
    }
    deliveryPolicy {
      interval
      intervalCount
    }
    deliveryPrice {
      amount
      currencyCode
    }
    deliveryMethod {
      __typename
      ... on SubscriptionDeliveryMethodShipping {
        address {
          name
          address1
          address2
          city
          province
          zip
          country
        }
        shippingOption {
          title
          description
        }
      }
      ... on SubscriptionDeliveryMethodLocalDelivery {
        address {
          name
          address1
          address2
          city
          province
          zip
          country
        }
        localDeliveryOption {
          title
          description
        }
      }
      ... on SubscriptionDeliveryMethodPickup {
        pickupOption {
          title
        }
      }
    }
    lines(first: 25) {
      nodes {
        id
        title
        quantity
        currentPrice {
          amount
          currencyCode
        }
        lineDiscountedPrice {
          amount
          currencyCode
        }
        sellingPlanId
        sellingPlanName
        variantTitle
      }
    }
    originOrder {
      id
      name
      createdAt
    }
    orders(first: 10, reverse: true) {
      nodes {
        id
        name
        createdAt
      }
    }
  }
}
GRAPHQL,
            [
                'id' => $contractId,
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        $contract = data_get($body, 'data.subscriptionContract');

        return is_array($contract) ? $this->mapContract($contract) : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function cancelContract(User $shop, string $contractId): ?array
    {
        if ($contractId === '') {
            return null;
        }

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation CancelSubscriptionContract($subscriptionContractId: ID!) {
  subscriptionContractCancel(subscriptionContractId: $subscriptionContractId) {
    contract {
      id
      status
      createdAt
      updatedAt
      nextBillingDate
      customer {
        firstName
        lastName
        email
      }
      billingPolicy {
        interval
        intervalCount
      }
      deliveryPolicy {
        interval
        intervalCount
      }
      deliveryPrice {
        amount
        currencyCode
      }
      deliveryMethod {
        __typename
        ... on SubscriptionDeliveryMethodShipping {
          address {
            name
            address1
            address2
            city
            province
            zip
            country
          }
          shippingOption {
            title
            description
          }
        }
        ... on SubscriptionDeliveryMethodLocalDelivery {
          address {
            name
            address1
            address2
            city
            province
            zip
            country
          }
          localDeliveryOption {
            title
            description
          }
        }
        ... on SubscriptionDeliveryMethodPickup {
          pickupOption {
            title
          }
        }
      }
      lines(first: 25) {
        nodes {
          id
          title
          quantity
          currentPrice {
            amount
            currencyCode
          }
          lineDiscountedPrice {
            amount
            currencyCode
          }
          sellingPlanId
          sellingPlanName
          variantTitle
        }
      }
      originOrder {
        id
        name
        createdAt
      }
      orders(first: 10, reverse: true) {
        nodes {
          id
          name
          createdAt
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'subscriptionContractId' => $contractId,
            ]
        );

        $body = $this->responseBody($response);
        $cancelPayload = data_get($body, 'data.subscriptionContractCancel');

        if (! is_array($cancelPayload)) {
            throw new RuntimeException('Shopify did not return a cancellation response for the selected subscription contract.');
        }

        $messages = collect(data_get($body, 'errors', []))
            ->map(function (mixed $error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify error.');
                }

                return (string) $error;
            })
            ->merge(
                collect(data_get($cancelPayload, 'userErrors', []))
                    ->map(function (mixed $error): string {
                        if (is_array($error)) {
                            return (string) ($error['message'] ?? 'Unknown Shopify validation error.');
                        }

                        return (string) $error;
                    })
            )
            ->filter()
            ->values();

        if ($messages->isNotEmpty()) {
            throw new RuntimeException($this->normalizeShopifyErrorMessage($messages->implode(' ')));
        }

        $contract = data_get($cancelPayload, 'contract');

        return is_array($contract) ? $this->mapContract($contract) : null;
    }

    /**
     * @param  array<string, mixed>  $contract
     * @return array<string, mixed>
     */
    public function mapContract(array $contract): array
    {
        $lines = collect(data_get($contract, 'lines.nodes', []))
            ->filter(fn (mixed $line): bool => is_array($line))
            ->values();
        $firstLine = $lines->first();
        $currencyCode = (string) data_get($firstLine, 'currentPrice.currencyCode', data_get($contract, 'deliveryPrice.currencyCode', 'USD'));
        $lineSubtotal = $lines->sum(fn (array $line): float => (float) data_get($line, 'currentPrice.amount', 0) * (int) data_get($line, 'quantity', 0));
        $discountedSubtotal = $lines->sum(fn (array $line): float => (float) data_get($line, 'lineDiscountedPrice.amount', 0));
        $effectiveSubtotal = $discountedSubtotal > 0 ? $discountedSubtotal : $lineSubtotal;
        $shippingTotal = (float) data_get($contract, 'deliveryPrice.amount', 0);
        $discountTotal = max($lineSubtotal - $effectiveSubtotal, 0);
        $grandTotal = $effectiveSubtotal + $shippingTotal;
        $originOrderName = (string) data_get($contract, 'originOrder.name', data_get($contract, 'orders.nodes.0.name', ''));
        $originOrderCreatedAt = (string) data_get($contract, 'originOrder.createdAt', data_get($contract, 'orders.nodes.0.createdAt', data_get($contract, 'createdAt', '')));
        $deliveryFrequency = $this->deliveryFrequency($contract);
        $createdAt = (string) data_get($contract, 'createdAt', '');
        $updatedAt = (string) data_get($contract, 'updatedAt', $createdAt);
        $nextBillingDate = (string) data_get($contract, 'nextBillingDate', '');
        $lineItems = $this->lineItems($lines, $currencyCode);
        $addressLines = $this->addressLines($contract);
        $orderHistory = $this->orderHistory($contract);

        return [
            'id' => (string) data_get($contract, 'id', ''),
            'displayId' => $this->displayContractId((string) data_get($contract, 'id', '')),
            'customer' => [
                'name' => $this->customerName($contract),
                'email' => (string) data_get($contract, 'customer.email', 'Unavailable'),
                'addressLines' => $addressLines,
            ],
            'planId' => null,
            'plan' => (string) data_get($firstLine, 'sellingPlanName', $deliveryFrequency),
            'nextOrder' => $this->formatDate($nextBillingDate),
            'amount' => $this->formatMoney($grandTotal, $currencyCode),
            'amountValue' => round($grandTotal, 2),
            'currencyCode' => $currencyCode,
            'status' => $this->displayStatus((string) data_get($contract, 'status', '')),
            'deliveryFrequency' => $deliveryFrequency,
            'createdAt' => $createdAt,
            'orderDate' => $this->formatDate($originOrderCreatedAt),
            'orderNumber' => $originOrderName !== '' ? $originOrderName : 'Unavailable',
            'productTitle' => (string) data_get($firstLine, 'title', 'Subscription product'),
            'productSubtitle' => (string) data_get($firstLine, 'variantTitle', data_get($firstLine, 'sellingPlanName', $deliveryFrequency)),
            'productPrice' => $this->formatMoney((float) data_get($firstLine, 'currentPrice.amount', 0), $currencyCode),
            'quantity' => (string) data_get($firstLine, 'quantity', '1'),
            'lineTotal' => $this->formatMoney((float) data_get($firstLine, 'lineDiscountedPrice.amount', (float) data_get($firstLine, 'currentPrice.amount', 0) * (int) data_get($firstLine, 'quantity', 0)), $currencyCode),
            'oneTimePurchasePrice' => 'Unavailable',
            'discount' => $discountTotal > 0 ? $this->formatMoney($discountTotal, $currencyCode).' off' : 'No discount',
            'lineItems' => $lineItems,
            'paymentSummary' => $this->paymentSummary($lineSubtotal, $discountTotal, $shippingTotal, $grandTotal, $currencyCode),
            'paymentMethod' => [
                'brand' => '?',
                'label' => 'Managed in Shopify',
                'expiry' => 'Payment details unavailable',
            ],
            'upcomingOrders' => $nextBillingDate !== '' ? [$this->formatDate($nextBillingDate)] : [],
            'orderHistory' => $orderHistory,
            'deliveryMethod' => $this->deliveryMethodDetails($contract, $addressLines),
            'createdAtLabel' => $this->formatDate($createdAt),
            'updatedAtLabel' => $this->formatDate($updatedAt),
            'timelineDate' => $this->formatDate($updatedAt),
            'timeline' => $this->timeline($createdAt, $updatedAt, (string) data_get($contract, 'status', '')),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function mapImportedContract(ImportedSubscriptionContract $contract): array
    {
        $rows = collect($contract->payload['rows'] ?? [])
            ->filter(fn (mixed $row): bool => is_array($row))
            ->values();
        $firstRow = $rows->first() ?? [];
        $lineItems = $rows->map(function (array $row) use ($contract): array {
            $quantity = (int) ($row['line_quantity'] ?? 1);
            $price = (float) ($row['line_current_price'] ?? 0);

            return [
                'id' => (string) ($row['line_variant_id'] ?? Str::uuid()->toString()),
                'title' => $contract->plan_name,
                'subtitle' => (string) ($row['line_selling_plan_name'] ?? 'Imported subscription line'),
                'quantity' => (string) $quantity,
                'unitPrice' => $this->formatMoney($price, $contract->currency_code),
                'total' => $this->formatMoney($price * $quantity, $contract->currency_code),
            ];
        })->all();
        $addressLines = collect([
            trim(((string) ($firstRow['delivery_address_first_name'] ?? '')).' '.((string) ($firstRow['delivery_address_last_name'] ?? ''))),
            $firstRow['delivery_address_address1'] ?? null,
            $firstRow['delivery_address_address2'] ?? null,
            collect([
                $firstRow['delivery_address_city'] ?? null,
                $firstRow['delivery_address_province_code'] ?? null,
                $firstRow['delivery_address_zip'] ?? null,
            ])->filter()->implode(', '),
            $firstRow['delivery_address_country_code'] ?? null,
        ])->filter(fn (mixed $line): bool => filled($line))->values()->all();

        return [
            'id' => "imported-{$contract->handle}",
            'displayId' => $contract->handle,
            'customer' => [
                'name' => $contract->customer_name,
                'email' => 'Imported by CSV',
                'addressLines' => $addressLines !== [] ? $addressLines : ['Imported by CSV'],
            ],
            'planId' => null,
            'plan' => $contract->plan_name,
            'nextOrder' => $this->formatDate((string) ($firstRow['upcoming_billing_date'] ?? '')),
            'amount' => $contract->amount,
            'amountValue' => (float) $contract->amount_value,
            'currencyCode' => $contract->currency_code,
            'status' => $contract->status,
            'deliveryFrequency' => $contract->delivery_frequency,
            'createdAt' => optional($contract->created_at)?->toISOString() ?? '',
            'orderDate' => 'Imported by CSV',
            'orderNumber' => $contract->handle,
            'productTitle' => $contract->plan_name,
            'productSubtitle' => 'Imported subscription contract',
            'productPrice' => $contract->amount,
            'quantity' => '1',
            'lineTotal' => $contract->amount,
            'oneTimePurchasePrice' => 'Imported by CSV',
            'discount' => 'Imported by CSV',
            'lineItems' => $lineItems,
            'paymentSummary' => [
                ['label' => 'Total', 'value' => $contract->amount],
            ],
            'paymentMethod' => [
                'brand' => '?',
                'label' => 'Imported by CSV',
                'expiry' => 'Imported by CSV',
            ],
            'upcomingOrders' => filled($firstRow['upcoming_billing_date'] ?? null) ? [$this->formatDate((string) $firstRow['upcoming_billing_date'])] : [],
            'orderHistory' => [],
            'deliveryMethod' => [
                'type' => 'Imported by CSV',
                'title' => (string) ($firstRow['delivery_method_type'] ?? 'Imported delivery method'),
                'description' => 'Imported subscription delivery details',
                'addressLines' => $addressLines !== [] ? $addressLines : ['Imported by CSV'],
            ],
            'createdAtLabel' => optional($contract->created_at)?->format('F j, Y') ?? 'Imported',
            'updatedAtLabel' => optional($contract->updated_at)?->format('F j, Y') ?? 'Imported',
            'timelineDate' => 'Imported by CSV',
            'timeline' => [
                [
                    'id' => 'imported',
                    'text' => 'Subscription contract imported by CSV',
                    'time' => 'Imported',
                ],
            ],
            'isImported' => true,
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $lines
     * @return array<int, array<string, string>>
     */
    private function lineItems(Collection $lines, string $currencyCode): array
    {
        return $lines
            ->map(function (array $line) use ($currencyCode): array {
                $quantity = (int) data_get($line, 'quantity', 0);
                $unitPrice = (float) data_get($line, 'currentPrice.amount', 0);
                $lineTotal = (float) data_get($line, 'lineDiscountedPrice.amount', $unitPrice * $quantity);

                return [
                    'id' => (string) data_get($line, 'id', Str::uuid()->toString()),
                    'title' => (string) data_get($line, 'title', 'Subscription item'),
                    'subtitle' => (string) data_get($line, 'variantTitle', data_get($line, 'sellingPlanName', 'Subscription')),
                    'quantity' => (string) $quantity,
                    'unitPrice' => $this->formatMoney($unitPrice, $currencyCode),
                    'total' => $this->formatMoney($lineTotal, $currencyCode),
                ];
            })
            ->all();
    }

    /**
     * @param  array<string, mixed>  $contract
     * @param  array<int, string>  $addressLines
     * @return array<string, mixed>
     */
    private function deliveryMethodDetails(array $contract, array $addressLines): array
    {
        $type = (string) data_get($contract, 'deliveryMethod.__typename', 'SubscriptionDeliveryMethodShipping');

        return match ($type) {
            'SubscriptionDeliveryMethodPickup' => [
                'type' => 'Pickup',
                'title' => (string) data_get($contract, 'deliveryMethod.pickupOption.title', 'Pickup'),
                'description' => 'Customer picks up each recurring order.',
                'addressLines' => [],
            ],
            'SubscriptionDeliveryMethodLocalDelivery' => [
                'type' => 'Local delivery',
                'title' => (string) data_get($contract, 'deliveryMethod.localDeliveryOption.title', 'Local delivery'),
                'description' => (string) data_get($contract, 'deliveryMethod.localDeliveryOption.description', 'Recurring local delivery'),
                'addressLines' => $addressLines,
            ],
            default => [
                'type' => 'Shipping',
                'title' => (string) data_get($contract, 'deliveryMethod.shippingOption.title', 'Shipping'),
                'description' => (string) data_get($contract, 'deliveryMethod.shippingOption.description', 'Recurring shipment'),
                'addressLines' => $addressLines,
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $contract
     * @return array<int, array<string, string>>
     */
    private function orderHistory(array $contract): array
    {
        return collect(data_get($contract, 'orders.nodes', []))
            ->filter(fn (mixed $order): bool => is_array($order))
            ->map(fn (array $order): array => [
                'id' => (string) data_get($order, 'id', Str::uuid()->toString()),
                'name' => (string) data_get($order, 'name', 'Order unavailable'),
                'date' => $this->formatDate((string) data_get($order, 'createdAt', '')),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function assertNoErrors(array $body): void
    {
        $messages = collect(data_get($body, 'errors', []))
            ->map(function (mixed $error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify error.');
                }

                return (string) $error;
            })
            ->filter()
            ->values();

        if ($messages->isNotEmpty()) {
            throw new RuntimeException($this->normalizeShopifyErrorMessage($messages->implode(' ')));
        }
    }

    /**
     * @return array<int, string>
     */
    private function addressLines(array $contract): array
    {
        $address = data_get($contract, 'deliveryMethod.address');

        if (! is_array($address)) {
            return ['Address unavailable'];
        }

        $lines = collect([
            data_get($address, 'name'),
            data_get($address, 'address1'),
            data_get($address, 'address2'),
            $this->formatCityLine($address),
            data_get($address, 'country'),
        ])
            ->filter(fn (mixed $line): bool => filled($line))
            ->values()
            ->all();

        return $lines !== [] ? $lines : ['Address unavailable'];
    }

    private function customerName(array $contract): string
    {
        $name = trim(((string) data_get($contract, 'customer.firstName', '')).' '.((string) data_get($contract, 'customer.lastName', '')));

        return $name !== '' ? $name : 'Unknown customer';
    }

    /**
     * @param  array<string, mixed>  $contract
     */
    private function deliveryFrequency(array $contract): string
    {
        $intervalCount = (int) data_get($contract, 'deliveryPolicy.intervalCount', data_get($contract, 'billingPolicy.intervalCount', 1));
        $interval = (string) data_get($contract, 'deliveryPolicy.interval', data_get($contract, 'billingPolicy.interval', 'MONTH'));
        $label = match (Str::upper($interval)) {
            'DAY' => $intervalCount === 1 ? 'day' : 'days',
            'WEEK' => $intervalCount === 1 ? 'week' : 'weeks',
            'YEAR' => $intervalCount === 1 ? 'year' : 'years',
            default => $intervalCount === 1 ? 'month' : 'months',
        };

        return "Every {$intervalCount} {$label}";
    }

    private function displayContractId(string $contractId): string
    {
        $segments = explode('/', $contractId);
        $numericId = trim((string) end($segments));

        return $numericId !== '' ? "SC-{$numericId}" : 'Subscription contract';
    }

    private function displayStatus(string $status): string
    {
        return match (Str::upper($status)) {
            'ACTIVE' => 'Active',
            'PAUSED' => 'Paused',
            'CANCELLED' => 'Canceled',
            'EXPIRED' => 'Expired',
            'FAILED' => 'Failed',
            default => 'Draft',
        };
    }

    /**
     * @param  array<string, mixed>  $address
     */
    private function formatCityLine(array $address): string
    {
        return collect([
            data_get($address, 'city'),
            data_get($address, 'province'),
            data_get($address, 'zip'),
        ])
            ->filter(fn (mixed $part): bool => filled($part))
            ->implode(', ');
    }

    private function formatDate(string $value): string
    {
        if ($value === '') {
            return 'Unavailable';
        }

        try {
            return Carbon::parse($value)->format('F j, Y');
        } catch (Throwable) {
            return 'Unavailable';
        }
    }

    private function formatMoney(float $amount, string $currencyCode): string
    {
        return match (Str::upper($currencyCode)) {
            'USD' => '$'.number_format($amount, 2),
            default => number_format($amount, 2).' '.Str::upper($currencyCode),
        };
    }

    private function formatTime(string $value): string
    {
        if ($value === '') {
            return 'Unavailable';
        }

        try {
            return Carbon::parse($value)->format('g:i A');
        } catch (Throwable) {
            return 'Unavailable';
        }
    }

    private function normalizeShopifyErrorMessage(string $message): string
    {
        if (
            Str::contains($message, 'Access denied for customer field')
            || Str::contains($message, 'Access denied for orders field')
        ) {
            return 'Access denied for customer field. Required access: `read_customers` access scope. Access denied for orders field. Required access: `read_orders` access scope. Reinstall or re-authenticate the app after updating scopes.';
        }

        if (Str::contains($message, 'This app is not approved to access the SubscriptionContract object')) {
            return 'This app is not approved to access the SubscriptionContract object. See https://shopify.dev/docs/apps/launch/protected-customer-data for more details.';
        }

        if (
            Str::contains($message, [
                'read_own_subscription_contracts',
                'write_own_subscription_contracts',
                'Access denied',
                'access scope',
            ])
        ) {
            return $message.' Update SHOPIFY_API_SCOPES to include read_own_subscription_contracts or write_own_subscription_contracts, then reinstall or re-authenticate the app.';
        }

        return $message;
    }

    /**
     * @return array<int, array{label: string, value: string}>
     */
    private function paymentSummary(float $lineSubtotal, float $discountTotal, float $shippingTotal, float $grandTotal, string $currencyCode): array
    {
        $summary = [
            [
                'label' => 'Subtotal',
                'value' => $this->formatMoney($lineSubtotal, $currencyCode),
            ],
        ];

        if ($discountTotal > 0) {
            $summary[] = [
                'label' => 'Discounts',
                'value' => '-'.$this->formatMoney($discountTotal, $currencyCode),
            ];
        }

        $summary[] = [
            'label' => 'Shipping',
            'value' => $this->formatMoney($shippingTotal, $currencyCode),
        ];

        $summary[] = [
            'label' => 'Total',
            'value' => $this->formatMoney($grandTotal, $currencyCode),
        ];

        return $summary;
    }

    /**
     * @return array<int, array{id: string, text: string, time: string}>
     */
    private function timeline(string $createdAt, string $updatedAt, string $status): array
    {
        $items = [];

        if ($createdAt !== '') {
            $items[] = [
                'id' => 'created',
                'text' => 'Subscription contract created',
                'time' => $this->formatTime($createdAt),
            ];
        }

        if ($updatedAt !== '' && $updatedAt !== $createdAt) {
            $items[] = [
                'id' => 'updated',
                'text' => 'Contract updated to '.$this->displayStatus($status),
                'time' => $this->formatTime($updatedAt),
            ];
        }

        return $items !== [] ? $items : [
            [
                'id' => 'status',
                'text' => 'Subscription status available',
                'time' => 'Unavailable',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $response
     * @return array<string, mixed>
     */
    private function responseBody(array $response): array
    {
        $body = $response['body'] ?? null;

        if ($body === null) {
            return [];
        }

        if (is_array($body)) {
            return $body;
        }

        if (method_exists($body, 'toArray')) {
            try {
                return $body->toArray();
            } catch (Throwable) {
                return [];
            }
        }

        return [];
    }
}

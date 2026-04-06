<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ShopifyPlanServices
{
    public function getPlans(User $shop, int $limit = 12): Collection
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetSellingPlans($first: Int!, $query: String!) {
  sellingPlanGroups(first: $first, query: $query) {
    nodes {
      id
      appId
      name
      options
      products(first: 25) {
        nodes {
          id
        }
      }
      sellingPlans(first: 10) {
        nodes {
          id
          name
          description
          options
          billingPolicy {
            __typename
            ... on SellingPlanRecurringBillingPolicy {
              interval
              intervalCount
            }
            ... on SellingPlanFixedBillingPolicy {
              checkoutCharge {
                type
              }
              remainingBalanceChargeExactTime
              remainingBalanceChargeTimeAfterCheckout
              remainingBalanceChargeTrigger
            }
          }
          deliveryPolicy {
            __typename
            ... on SellingPlanRecurringDeliveryPolicy {
              interval
              intervalCount
            }
            ... on SellingPlanFixedDeliveryPolicy {
              intent
              preAnchorBehavior
              fulfillmentTrigger
              fulfillmentExactTime
              cutoff
            }
          }
          pricingPolicies {
            __typename
            ... on SellingPlanFixedPricingPolicy {
              adjustmentType
              adjustmentValue {
                __typename
                ... on SellingPlanPricingPolicyPercentageValue {
                  percentage
                }
                ... on MoneyV2 {
                  amount
                  currencyCode
                }
              }
            }
            ... on SellingPlanRecurringPricingPolicy {
              adjustmentType
              afterCycle
              adjustmentValue {
                __typename
                ... on SellingPlanPricingPolicyPercentageValue {
                  percentage
                }
                ... on MoneyV2 {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
}
GRAPHQL,
            [
                'first' => $limit,
                'query' => 'app_id:ALL category:SUBSCRIPTION',
            ]
        );

        //        dd($this->responseBody($response));
        $groups = data_get($this->responseBody($response), 'data.sellingPlanGroups.nodes', []);

        //        dd($groups);

        return collect($groups)
            ->map(function ($group): array {
                return [
                    'id' => $group['id'],
                    'appId' => $group['appId'] ?? null,
                    'name' => $group['name'],
                    'options' => $group['options'] ?? [],
                    'productCount' => count($group['products']['nodes'] ?? []),
                    'firstProductId' => data_get($group, 'products.nodes.0.id'),
                    'plans' => collect($group['sellingPlans']['nodes'] ?? [])
                        ->map(fn (array $plan): array => $this->mapSellingPlan($plan))
                        ->values(),
                ];
            })
            ->values();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getPlan(User $shop, string $planId): ?array
    {
        if ($planId === '') {
            return null;
        }

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetSellingPlanGroup($id: ID!) {
  node(id: $id) {
    ... on SellingPlanGroup {
      id
      name
      description
      merchantCode
      summary
      options
      products(first: 25) {
        nodes {
          id
          title
          totalVariants
          featuredImage {
            url
          }
        }
      }
      sellingPlans(first: 25) {
        nodes {
          id
          name
          description
          options
          billingPolicy {
            __typename
            ... on SellingPlanRecurringBillingPolicy {
              interval
              intervalCount
            }
            ... on SellingPlanFixedBillingPolicy {
              checkoutCharge {
                type
              }
              remainingBalanceChargeExactTime
              remainingBalanceChargeTimeAfterCheckout
              remainingBalanceChargeTrigger
            }
          }
          deliveryPolicy {
            __typename
            ... on SellingPlanRecurringDeliveryPolicy {
              interval
              intervalCount
            }
            ... on SellingPlanFixedDeliveryPolicy {
              intent
              preAnchorBehavior
              fulfillmentTrigger
              fulfillmentExactTime
              cutoff
            }
          }
          pricingPolicies {
            __typename
            ... on SellingPlanFixedPricingPolicy {
              adjustmentType
              adjustmentValue {
                __typename
                ... on SellingPlanPricingPolicyPercentageValue {
                  percentage
                }
                ... on MoneyV2 {
                  amount
                  currencyCode
                }
              }
            }
            ... on SellingPlanRecurringPricingPolicy {
              adjustmentType
              afterCycle
              adjustmentValue {
                __typename
                ... on SellingPlanPricingPolicyPercentageValue {
                  percentage
                }
                ... on MoneyV2 {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
}
GRAPHQL,
            [
                'id' => $planId,
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        $group = data_get($body, 'data.node');

        return is_array($group) ? $group : null;
    }

    public function updateSellingPlanGroup(User $shop, array $payload): array
    {
        $existingGroup = $this->getPlan($shop, $payload['planId']);

        if ($existingGroup === null) {
            throw new RuntimeException('The selected subscription plan could not be found.');
        }

        $currentSellingPlans = collect($existingGroup['sellingPlans']['nodes'] ?? []);
        $currentProductIds = collect($existingGroup['products']['nodes'] ?? [])
            ->pluck('id')
            ->filter()
            ->values();

        $payloadOptions = collect($payload['options']);
        $payloadExistingOptions = $payloadOptions
            ->filter(fn (array $option): bool => filled($option['id']) && ! Str::startsWith((string) $option['id'], 'draft-'))
            ->values();

        $payloadNewOptions = $payloadOptions
            ->filter(fn (array $option): bool => blank($option['id']) || Str::startsWith((string) $option['id'], 'draft-'))
            ->values();

        $sellingPlanIdsToDelete = $currentSellingPlans
            ->pluck('id')
            ->filter()
            ->reject(fn (string $id): bool => $payloadExistingOptions->contains(fn (array $option): bool => $option['id'] === $id))
            ->values()
            ->all();

        $input = [
            'name' => $payload['title'],
            'description' => $payload['internalDescription'] ?: null,
            'merchantCode' => $this->merchantCode($payload['internalDescription'] ?: $payload['title']),
            'options' => ['Delivery frequency'],
            'sellingPlansToUpdate' => $this->buildSellingPlans($payloadExistingOptions, $payload['title'], $payload['internalDescription'], $payload['discountType'], false),
            'sellingPlansToCreate' => $this->buildSellingPlans($payloadNewOptions, $payload['title'], $payload['internalDescription'], $payload['discountType'], true),
            'sellingPlansToDelete' => $sellingPlanIdsToDelete,
        ];

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation UpdateSellingPlanGroup($id: ID!, $input: SellingPlanGroupInput!) {
  sellingPlanGroupUpdate(id: $id, input: $input) {
    sellingPlanGroup {
      id
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'id' => $payload['planId'],
                'input' => $input,
            ]
        );

        $updatePayload = data_get($this->responseBody($response), 'data.sellingPlanGroupUpdate');

        if (! is_array($updatePayload)) {
            throw new RuntimeException('Shopify did not return an updated selling plan group.');
        }

        $this->assertNoErrors($this->responseBody($response), data_get($updatePayload, 'userErrors', []));

        $nextProductIds = collect($payload['products'])
            ->pluck('id')
            ->filter()
            ->values();

        $productIdsToAdd = $nextProductIds
            ->diff($currentProductIds)
            ->values()
            ->all();

        $productIdsToRemove = $currentProductIds
            ->diff($nextProductIds)
            ->values()
            ->all();

        if ($productIdsToAdd !== []) {
            $addResponse = $shop->api()->graph(
                <<<'GRAPHQL'
mutation AddProductsToSellingPlanGroup($id: ID!, $productIds: [ID!]!) {
  sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
                [
                    'id' => $payload['planId'],
                    'productIds' => $productIdsToAdd,
                ]
            );

            $this->assertNoErrors($this->responseBody($addResponse), data_get($this->responseBody($addResponse), 'data.sellingPlanGroupAddProducts.userErrors', []));
        }

        if ($productIdsToRemove !== []) {
            $removeResponse = $shop->api()->graph(
                <<<'GRAPHQL'
mutation RemoveProductsFromSellingPlanGroup($id: ID!, $productIds: [ID!]!) {
  sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
                [
                    'id' => $payload['planId'],
                    'productIds' => $productIdsToRemove,
                ]
            );

            $this->assertNoErrors($this->responseBody($removeResponse), data_get($this->responseBody($removeResponse), 'data.sellingPlanGroupRemoveProducts.userErrors', []));
        }

        $updatedGroup = $this->getPlan($shop, $payload['planId']);

        if ($updatedGroup === null) {
            throw new RuntimeException('Shopify updated the plan, but the latest details could not be loaded.');
        }

        return $this->mapPlanGroup($updatedGroup);
    }

    /**
     * @return array<string, string>
     */
    public function deletePlanGroup(User $shop, string $planId): array
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation DeleteSellingPlanGroup($id: ID!) {
  sellingPlanGroupDelete(id: $id) {
    deletedSellingPlanGroupId
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'id' => $planId,
            ]
        );

        $body = $this->responseBody($response);
        $deletePayload = data_get($body, 'data.sellingPlanGroupDelete');

        if (! is_array($deletePayload)) {
            throw new RuntimeException('Shopify did not return a delete response for the selected subscription plan.');
        }

        $this->assertNoErrors($body, data_get($deletePayload, 'userErrors', []));

        $deletedSellingPlanGroupId = (string) data_get($deletePayload, 'deletedSellingPlanGroupId', '');

        if ($deletedSellingPlanGroupId === '') {
            throw new RuntimeException('Shopify did not confirm deletion of the selected subscription plan.');
        }

        return [
            'deletedSellingPlanGroupId' => $deletedSellingPlanGroupId,
        ];
    }

    /**
     * @param  array<string, mixed>  $group
     * @return array<string, mixed>
     */
    public function mapPlanDetail(array $group): array
    {
        return $this->mapPlanGroup($group);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $options
     * @return array<int, array<string, mixed>>
     */
    private function buildSellingPlans(Collection $options, string $title, ?string $internalDescription, string $discountType, bool $creating): array
    {
        return $options
            ->values()
            ->map(function (array $option, int $index) use ($creating, $discountType, $internalDescription, $title): array {
                $interval = $this->normalizeInterval($option['frequencyUnit']);
                $intervalCount = (int) $option['frequencyValue'];
                $optionLabel = $this->optionLabel($intervalCount, $option['frequencyUnit']);
                $pricingPolicies = $this->buildPricingPolicies($discountType, $option['percentageOff'] ?? null);

                $sellingPlan = [
                    'name' => $title,
                    'description' => $internalDescription ?: $optionLabel,
                    'options' => [$optionLabel],
                    'position' => $index + 1,
                    'billingPolicy' => [
                        'recurring' => [
                            'interval' => $interval,
                            'intervalCount' => $intervalCount,
                        ],
                    ],
                    'deliveryPolicy' => [
                        'recurring' => [
                            'intent' => 'FULFILLMENT_BEGIN',
                            'interval' => $interval,
                            'intervalCount' => $intervalCount,
                            'preAnchorBehavior' => 'ASAP',
                        ],
                    ],
                ];

                if ($creating) {
                    $sellingPlan['category'] = 'SUBSCRIPTION';
                    $sellingPlan['inventoryPolicy'] = [
                        'reserve' => 'ON_SALE',
                    ];
                } else {
                    $sellingPlan['id'] = $option['id'];
                }

                if ($pricingPolicies->isNotEmpty()) {
                    $sellingPlan['pricingPolicies'] = $pricingPolicies->values()->all();
                } elseif (! $creating) {
                    $sellingPlan['pricingPolicies'] = [];
                }

                return $sellingPlan;
            })
            ->all();
    }

    private function buildPricingPolicies(string $discountType, mixed $discountValue): Collection
    {
        if ($discountType === 'No discount' || blank($discountValue) || (float) $discountValue <= 0) {
            return collect();
        }

        if ($discountType === 'Percentage off') {
            return collect([
                [
                    'fixed' => [
                        'adjustmentType' => 'PERCENTAGE',
                        'adjustmentValue' => [
                            'percentage' => (float) $discountValue,
                        ],
                    ],
                ],
            ]);
        }

        return collect([
            [
                'fixed' => [
                    'adjustmentType' => 'FIXED_AMOUNT',
                    'adjustmentValue' => [
                        'fixedValue' => (float) $discountValue,
                    ],
                ],
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $group
     * @return array<string, mixed>
     */
    private function mapPlanGroup(array $group): array
    {
        return [
            'id' => $group['id'],
            'name' => $group['name'],
            'description' => $group['description'] ?? '',
            'merchantCode' => $group['merchantCode'] ?? '',
            'summary' => $group['summary'] ?? '',
            'options' => $group['options'] ?? [],
            'products' => collect($group['products']['nodes'] ?? [])
                ->map(fn ($product): array => $this->mapProduct($product))
                ->values(),
            'plans' => collect($group['sellingPlans']['nodes'] ?? [])
                ->map(fn (array $plan): array => $this->mapSellingPlan($plan))
                ->values(),
        ];
    }

    /**
     * @param  array<string, mixed>  $plan
     * @return array<string, mixed>
     */
    private function mapSellingPlan(array $plan): array
    {
        $intervalDetails = $this->extractIntervalDetails($plan);
        $discountDetails = $this->extractDiscountDetails($plan);

        return [
            'id' => $plan['id'],
            'name' => $plan['name'],
            'description' => $plan['description'] ?? '',
            'options' => $plan['options'] ?? [],
            'frequencyValue' => $intervalDetails['frequencyValue'],
            'frequencyUnit' => $intervalDetails['frequencyUnit'],
            'paymentFrequencyValue' => $intervalDetails['paymentFrequencyValue'],
            'paymentFrequencyUnit' => $intervalDetails['paymentFrequencyUnit'],
            'deliveryFrequencyValue' => $intervalDetails['deliveryFrequencyValue'],
            'deliveryFrequencyUnit' => $intervalDetails['deliveryFrequencyUnit'],
            'paymentPolicy' => $intervalDetails['billingPolicy'],
            'billingPolicy' => $intervalDetails['billingPolicy'],
            'deliveryPolicy' => $intervalDetails['deliveryPolicy'],
            'discountType' => $discountDetails['discountType'],
            'percentageOff' => $discountDetails['percentageOff'],
            'pricingPolicy' => $discountDetails['pricingPolicy'],
            'pricingPolicies' => $discountDetails['pricingPolicies'],
        ];
    }

    /**
     * @param  array<string, mixed>  $product
     * @return array<string, mixed>
     */
    private function mapProduct(array $product): array
    {
        $variantCount = (int) data_get($product, 'totalVariants', 0);

        return [
            'id' => (string) data_get($product, 'id'),
            'title' => (string) data_get($product, 'title'),
            'variants' => $variantCount === 1 ? '1 variant available' : "{$variantCount} variants available",
            'imageUrl' => data_get($product, 'featuredImage.url'),
            'swatch' => $this->makeSwatch((string) data_get($product, 'id')),
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @param  array<int, mixed>  $userErrors
     */
    private function assertNoErrors(array $body, array $userErrors = []): void
    {
        $topLevelErrors = collect(data_get($body, 'errors', []))
            ->map(function ($error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify error.');
                }

                return (string) $error;
            })
            ->filter()
            ->values();

        if ($topLevelErrors->isNotEmpty()) {
            throw new RuntimeException($this->normalizeShopifyErrorMessage($topLevelErrors->implode(' ')));
        }

        $mutationErrors = collect($userErrors)
            ->map(function ($error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify validation error.');
                }

                return (string) $error;
            })
            ->filter()
            ->values();

        if ($mutationErrors->isNotEmpty()) {
            throw new RuntimeException($this->normalizeShopifyErrorMessage($mutationErrors->implode(' ')));
        }
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

    private function makeSwatch(string $seed): string
    {
        $palette = [
            ['#ffd1d1', '#fff5bf'],
            ['#e4b640', '#b8860b'],
            ['#a7f3d0', '#22d3ee'],
            ['#bfdbfe', '#60a5fa'],
            ['#fecdd3', '#fb7185'],
            ['#ddd6fe', '#8b5cf6'],
        ];

        $index = abs(crc32(Str::lower($seed))) % count($palette);
        [$start, $end] = $palette[$index];

        return "linear-gradient(135deg, {$start} 0%, {$end} 100%)";
    }

    private function merchantCode(string $value): string
    {
        $merchantCode = Str::slug($value);

        return Str::limit($merchantCode !== '' ? $merchantCode : 'subscription-plan', 20, '');
    }

    private function normalizeInterval(string $unit): string
    {
        return match ($unit) {
            'Days' => 'DAY',
            'Weeks' => 'WEEK',
            'Months' => 'MONTH',
            'Years' => 'YEAR',
            default => throw new RuntimeException("Unsupported interval unit [{$unit}]."),
        };
    }

    private function optionLabel(int $frequencyValue, string $frequencyUnit): string
    {
        $singularUnit = match ($frequencyUnit) {
            'Days' => 'day',
            'Weeks' => 'week',
            'Months' => 'month',
            'Years' => 'year',
            default => Str::lower($frequencyUnit),
        };

        $labelUnit = $frequencyValue === 1 ? $singularUnit : Str::plural($singularUnit);

        return "Every {$frequencyValue} {$labelUnit}";
    }

    private function normalizeShopifyErrorMessage(string $message): string
    {
        if (
            Str::contains($message, [
                'write_own_subscription_contracts',
                'write_purchase_options',
                'access scope',
                'Access denied',
            ])
        ) {
            return $message.' Update SHOPIFY_API_SCOPES to include write_purchase_options or write_own_subscription_contracts, then reinstall or re-authenticate the app.';
        }

        return $message;
    }

    /**
     * @param  array<string, mixed>  $plan
     * @return array{
     *     frequencyValue: string,
     *     frequencyUnit: string,
     *     paymentFrequencyValue: string,
     *     paymentFrequencyUnit: string,
     *     deliveryFrequencyValue: string,
     *     deliveryFrequencyUnit: string,
     *     billingPolicy: array<string, mixed>,
     *     deliveryPolicy: array<string, mixed>
     * }
     */
    private function extractIntervalDetails(array $plan): array
    {
        $billingPolicy = is_array($plan['billingPolicy'] ?? null) ? $plan['billingPolicy'] : [];
        $deliveryPolicy = is_array($plan['deliveryPolicy'] ?? null) ? $plan['deliveryPolicy'] : [];
        $paymentFrequencyValue = (string) data_get($billingPolicy, 'intervalCount', '1');
        $paymentFrequencyUnit = $this->displayInterval((string) data_get($billingPolicy, 'interval', 'WEEK'));
        $deliveryFrequencyValue = (string) data_get($deliveryPolicy, 'intervalCount', '1');
        $deliveryFrequencyUnit = $this->displayInterval((string) data_get($deliveryPolicy, 'interval', 'WEEK'));
        $policy = $deliveryPolicy !== [] ? $deliveryPolicy : $billingPolicy;

        if ($policy !== []) {
            return [
                'frequencyValue' => (string) data_get($policy, 'intervalCount', '1'),
                'frequencyUnit' => $this->displayInterval((string) data_get($policy, 'interval', 'WEEK')),
                'paymentFrequencyValue' => $paymentFrequencyValue,
                'paymentFrequencyUnit' => $paymentFrequencyUnit,
                'deliveryFrequencyValue' => $deliveryFrequencyValue,
                'deliveryFrequencyUnit' => $deliveryFrequencyUnit,
                'billingPolicy' => $billingPolicy,
                'deliveryPolicy' => $deliveryPolicy,
            ];
        }

        $label = (string) collect($plan['options'] ?? [])->filter()->first();

        if (preg_match('/Every\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)/i', $label, $matches) === 1) {
            return [
                'frequencyValue' => $matches[1],
                'frequencyUnit' => $this->displayInterval($matches[2]),
                'paymentFrequencyValue' => $paymentFrequencyValue,
                'paymentFrequencyUnit' => $paymentFrequencyUnit,
                'deliveryFrequencyValue' => $deliveryFrequencyValue,
                'deliveryFrequencyUnit' => $deliveryFrequencyUnit,
                'billingPolicy' => $billingPolicy,
                'deliveryPolicy' => $deliveryPolicy,
            ];
        }

        return [
            'frequencyValue' => '1',
            'frequencyUnit' => 'Weeks',
            'paymentFrequencyValue' => $paymentFrequencyValue,
            'paymentFrequencyUnit' => $paymentFrequencyUnit,
            'deliveryFrequencyValue' => $deliveryFrequencyValue,
            'deliveryFrequencyUnit' => $deliveryFrequencyUnit,
            'billingPolicy' => $billingPolicy,
            'deliveryPolicy' => $deliveryPolicy,
        ];
    }

    /**
     * @param  array<string, mixed>  $plan
     * @return array{
     *     discountType: string,
     *     percentageOff: string,
     *     pricingPolicy: array<string, mixed>,
     *     pricingPolicies: array<int, array<string, mixed>>
     * }
     */
    private function extractDiscountDetails(array $plan): array
    {
        $pricingPolicies = collect($plan['pricingPolicies'] ?? [])
            ->filter(fn (mixed $policy): bool => is_array($policy))
            ->values();
        $pricingPolicy = $pricingPolicies
            ->first(fn (array $policy): bool => filled($policy['adjustmentType'] ?? null));

        if (is_array($pricingPolicy)) {
            $adjustmentType = (string) ($pricingPolicy['adjustmentType'] ?? '');

            if ($adjustmentType === 'PERCENTAGE') {
                return [
                    'discountType' => 'Percentage off',
                    'percentageOff' => (string) data_get($pricingPolicy, 'adjustmentValue.percentage', ''),
                    'pricingPolicy' => $pricingPolicy,
                    'pricingPolicies' => $pricingPolicies->all(),
                ];
            }

            if ($adjustmentType === 'FIXED_AMOUNT') {
                return [
                    'discountType' => 'Fixed amount off',
                    'percentageOff' => (string) data_get($pricingPolicy, 'adjustmentValue.amount', ''),
                    'pricingPolicy' => $pricingPolicy,
                    'pricingPolicies' => $pricingPolicies->all(),
                ];
            }
        }

        return [
            'discountType' => 'No discount',
            'percentageOff' => '',
            'pricingPolicy' => [],
            'pricingPolicies' => $pricingPolicies->all(),
        ];
    }

    private function displayInterval(string $interval): string
    {
        return match (Str::upper($interval)) {
            'DAY', 'DAYS' => 'Days',
            'WEEK', 'WEEKS' => 'Weeks',
            'MONTH', 'MONTHS' => 'Months',
            'YEAR', 'YEARS' => 'Years',
            default => 'Weeks',
        };
    }
}

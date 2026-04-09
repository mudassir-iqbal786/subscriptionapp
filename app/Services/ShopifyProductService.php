<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ShopifyProductService
{
    public function searchProducts(User $shop, ?string $query = null, int $limit = 12): array
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query SearchProducts($first: Int!, $query: String) {
  products(first: $first, query: $query, sortKey: TITLE) {
    nodes {
      id
      title
      totalVariants
      featuredImage {
        url
      }
      variants(first: 25) {
        nodes {
          id
          title
          image {
            url
          }
        }
      }
    }
  }
}
GRAPHQL,
            [
                'first' => $limit,
                'query' => filled($query) ? $query : null,
            ]
        );
        $products = $response['body']['data']['products']['nodes']->toArray();

        return collect($products)
            ->map(function (array $product): array {
                $variantCount = (int) data_get($product, 'totalVariants', 0);

                return [
                    'id' => (string) data_get($product, 'id'),
                    'title' => (string) data_get($product, 'title'),
                    'variants' => $variantCount === 1 ? '1 variant available' : "{$variantCount} variants available",
                    'imageUrl' => data_get($product, 'featuredImage.url'),
                    'swatch' => $this->makeSwatch((string) data_get($product, 'id')),
                    'variantOptions' => collect(data_get($product, 'variants.nodes', []))
                        ->map(function (array $variant) use ($product): array {
                            return [
                                'id' => (string) data_get($variant, 'id'),
                                'title' => (string) data_get($variant, 'title'),
                                'productId' => (string) data_get($product, 'id'),
                                'productTitle' => (string) data_get($product, 'title'),
                                'imageUrl' => data_get($variant, 'image.url', data_get($product, 'featuredImage.url')),
                                'swatch' => $this->makeSwatch((string) data_get($variant, 'id', data_get($product, 'id'))),
                            ];
                        })
                        ->filter(fn (array $variant): bool => filled($variant['id']) && filled($variant['productId']))
                        ->values()
                        ->all(),
                ];
            })
            ->filter(fn (array $product): bool => filled($product['id']) && filled($product['title']))
            ->values()
            ->all();
    }

    public function createSellingPlanGroup(User $shop, array $payload): array
    {

        $input = [
            'name' => $payload['title'],
            'description' => $payload['internalDescription'] ?: null,
            'merchantCode' => $this->merchantCode($payload['internalDescription'] ?: $payload['title']),
            'options' => ['Delivery frequency'],
            'sellingPlansToCreate' => $this->buildSellingPlans($payload),
        ];

        //        dd($payload,$input);
        $resources = [
            'productIds' => collect($payload['products'] ?? [])->pluck('id')->values()->all(),
            'productVariantIds' => collect($payload['productVariants'] ?? [])->pluck('id')->values()->all(),
        ];

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation CreateSellingPlanGroup($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput) {
  sellingPlanGroupCreate(input: $input, resources: $resources) {
    sellingPlanGroup {
      id
      name
      description
      sellingPlans(first: 10) {
        nodes {
          id
          name
          description
          options
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
                'input' => $input,
                'resources' => $resources,
            ]
        );

        $responseBody = $this->responseBody($response);
        $topLevelErrors = collect(data_get($responseBody, 'errors', []))
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

        $createPayload = data_get($responseBody, 'data.sellingPlanGroupCreate');

        if (! is_array($createPayload)) {
            throw new RuntimeException(
                'Shopify did not return a selling plan payload. This usually means the app is missing required subscription scopes such as write_purchase_options or write_own_subscription_contracts.'
            );
        }

        $errors = collect(data_get($createPayload, 'userErrors', []))
            ->map(function ($error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify validation error.');
                }

                return (string) $error;
            })
            ->filter()
            ->values();

        if ($errors->isNotEmpty()) {
            throw new RuntimeException($this->normalizeShopifyErrorMessage($errors->implode(' ')));
        }

        $sellingPlanGroup = data_get($createPayload, 'sellingPlanGroup');

        if ($sellingPlanGroup === null) {
            throw new RuntimeException('Shopify did not return the created selling plan group.');
        }

        return is_array($sellingPlanGroup) ? $sellingPlanGroup : $sellingPlanGroup->toArray();
    }

    private function buildSellingPlans(array $payload): array
    {
        return collect($payload['options'])
            ->map(function (array $option, int $index) use ($payload): array {
                $interval = $this->normalizeInterval($option['frequencyUnit']);
                $intervalCount = (int) $option['frequencyValue'];
                $pricingPolicies = $this->buildPricingPolicies($payload['discountType'], $option['percentageOff']);
                $optionLabel = $this->optionLabel($intervalCount, $option['frequencyUnit']);

                $sellingPlan = [
                    'name' => $this->sellingPlanName($payload['title'], $optionLabel),
                    'options' => [$optionLabel],
                    'position' => $index + 1,
                    'category' => 'SUBSCRIPTION',
                    'description' => $payload['internalDescription'] ?: $optionLabel,
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
                    'inventoryPolicy' => [
                        'reserve' => 'ON_SALE',
                    ],
                ];

                if ($pricingPolicies->isNotEmpty()) {
                    $sellingPlan['pricingPolicies'] = $pricingPolicies->values()->all();
                }

                return $sellingPlan;
            })
            ->values()
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

    private function sellingPlanName(string $title, string $optionLabel): string
    {
        $normalizedTitle = trim($title);

        if ($normalizedTitle === '') {
            return $optionLabel;
        }

        return "{$normalizedTitle} - {$optionLabel}";
    }
}

<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\ShopifyPlanServices;
use Gnikyt\BasicShopifyAPI\BasicShopifyAPI;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase;

class ShopifyPlanServicesTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    public function test_it_fetches_paginated_selling_plan_groups(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $user = Mockery::mock(User::class);
        $user->shouldReceive('api')->once()->andReturn($api);

        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query, array $variables): bool {
                return str_contains($query, 'pageInfo')
                    && $variables['first'] === 12
                    && $variables['last'] === null
                    && $variables['after'] === 'cursor-1'
                    && $variables['before'] === null;
            })
            ->andReturn([
                'body' => [
                    'data' => [
                        'sellingPlanGroups' => [
                            'pageInfo' => [
                                'hasNextPage' => true,
                                'hasPreviousPage' => true,
                                'startCursor' => 'cursor-2',
                                'endCursor' => 'cursor-3',
                            ],
                            'nodes' => [
                                [
                                    'id' => 'gid://shopify/SellingPlanGroup/1',
                                    'appId' => 'app-1',
                                    'name' => 'Weekly subscription',
                                    'options' => ['Delivery frequency'],
                                    'products' => [
                                        'nodes' => [
                                            ['id' => 'gid://shopify/Product/1'],
                                        ],
                                    ],
                                    'productVariants' => [
                                        'nodes' => [],
                                    ],
                                    'sellingPlans' => [
                                        'nodes' => [
                                            [
                                                'id' => 'gid://shopify/SellingPlan/1',
                                                'createdAt' => '2026-04-14T00:00:00Z',
                                                'name' => 'Weekly',
                                                'description' => 'Weekly delivery',
                                                'options' => ['Weekly'],
                                                'billingPolicy' => [
                                                    '__typename' => 'SellingPlanRecurringBillingPolicy',
                                                    'interval' => 'WEEK',
                                                    'intervalCount' => 1,
                                                ],
                                                'deliveryPolicy' => [
                                                    '__typename' => 'SellingPlanRecurringDeliveryPolicy',
                                                    'interval' => 'WEEK',
                                                    'intervalCount' => 1,
                                                ],
                                                'pricingPolicies' => [],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $service = new ShopifyPlanServices;

        $plansPage = $service->getPlansPage($user, 12, 'cursor-1');

        $this->assertTrue($plansPage['pagination']['hasNextPage']);
        $this->assertTrue($plansPage['pagination']['hasPreviousPage']);
        $this->assertSame('cursor-2', $plansPage['pagination']['startCursor']);
        $this->assertSame('cursor-3', $plansPage['pagination']['endCursor']);
        $this->assertSame('gid://shopify/SellingPlanGroup/1', $plansPage['sellingPlanGroup'][0]['id']);
        $this->assertSame(1, $plansPage['sellingPlanGroup'][0]['productCount']);
    }

    public function test_map_plan_detail_includes_payment_delivery_and_pricing_policy_data(): void
    {
        $service = new ShopifyPlanServices;

        $mappedPlan = $service->mapPlanDetail([
            'id' => 'group-1',
            'name' => 'Weekly plan',
            'description' => 'Weekly subscription',
            'merchantCode' => 'weekly-plan',
            'summary' => 'Summary',
            'options' => ['Delivery frequency'],
            'products' => [
                'nodes' => [
                    [
                        'id' => 'gid://shopify/Product/1',
                        'title' => 'Coffee',
                        'totalVariants' => 2,
                        'featuredImage' => [
                            'url' => 'https://example.com/product.jpg',
                        ],
                    ],
                ],
            ],
            'productVariants' => [
                'nodes' => [
                    [
                        'id' => 'gid://shopify/ProductVariant/10',
                        'title' => 'Dark Roast',
                        'image' => [
                            'url' => 'https://example.com/variant.jpg',
                        ],
                        'product' => [
                            'id' => 'gid://shopify/Product/1',
                            'title' => 'Coffee',
                            'featuredImage' => [
                                'url' => 'https://example.com/product.jpg',
                            ],
                        ],
                    ],
                ],
            ],
            'sellingPlans' => [
                'nodes' => [
                    [
                        'id' => 'plan-1',
                        'name' => 'Pay weekly',
                        'description' => 'Delivered every 2 weeks',
                        'options' => ['Every 2 weeks'],
                        'billingPolicy' => [
                            '__typename' => 'SellingPlanRecurringBillingPolicy',
                            'interval' => 'WEEK',
                            'intervalCount' => 2,
                            'minCycles' => 1,
                            'maxCycles' => 12,
                        ],
                        'deliveryPolicy' => [
                            '__typename' => 'SellingPlanRecurringDeliveryPolicy',
                            'intent' => 'FULFILLMENT_BEGIN',
                            'interval' => 'MONTH',
                            'intervalCount' => 1,
                            'preAnchorBehavior' => 'ASAP',
                        ],
                        'pricingPolicies' => [
                            [
                                '__typename' => 'SellingPlanFixedPricingPolicy',
                                'adjustmentType' => 'PERCENTAGE',
                                'adjustmentValue' => [
                                    '__typename' => 'SellingPlanPricingPolicyPercentageValue',
                                    'percentage' => 15,
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $plan = $mappedPlan['plans'][0];
        $product = $mappedPlan['products'][0];
        $productVariant = $mappedPlan['productVariants'][0];

        $this->assertSame('2', $plan['paymentFrequencyValue']);
        $this->assertSame('Weeks', $plan['paymentFrequencyUnit']);
        $this->assertSame('1', $plan['deliveryFrequencyValue']);
        $this->assertSame('Months', $plan['deliveryFrequencyUnit']);
        $this->assertSame($plan['billingPolicy'], $plan['paymentPolicy']);
        $this->assertSame('Percentage off', $plan['discountType']);
        $this->assertSame('15', $plan['percentageOff']);
        $this->assertCount(1, $plan['pricingPolicies']);
        $this->assertSame('Coffee', $product['title']);
        $this->assertSame('Dark Roast', $productVariant['title']);
        $this->assertSame('gid://shopify/Product/1', $productVariant['productId']);
    }
}

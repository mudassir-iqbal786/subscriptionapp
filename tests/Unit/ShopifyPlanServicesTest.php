<?php

namespace Tests\Unit;

use App\Services\ShopifyPlanServices;
use PHPUnit\Framework\TestCase;

class ShopifyPlanServicesTest extends TestCase
{
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

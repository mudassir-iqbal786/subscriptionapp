<?php

namespace Tests\Unit;

use App\Services\ShopifyContractService;
use PHPUnit\Framework\TestCase;

class ShopifyContractServiceTest extends TestCase
{
    public function test_map_contract_includes_customer_financial_and_timeline_data(): void
    {
        $service = new ShopifyContractService;

        $contract = $service->mapContract([
            'id' => 'gid://shopify/SubscriptionContract/593791907',
            'status' => 'ACTIVE',
            'createdAt' => '2026-04-02T10:31:00Z',
            'updatedAt' => '2026-04-03T12:15:00Z',
            'nextBillingDate' => '2026-04-12T00:00:00Z',
            'customer' => [
                'firstName' => 'Ava',
                'lastName' => 'Thompson',
                'email' => 'ava.thompson@example.com',
            ],
            'deliveryPolicy' => [
                'interval' => 'WEEK',
                'intervalCount' => 1,
            ],
            'deliveryPrice' => [
                'amount' => '8.00',
                'currencyCode' => 'USD',
            ],
            'deliveryMethod' => [
                'address' => [
                    'name' => 'Ava Thompson',
                    'address1' => '112 River Lane',
                    'city' => 'Austin',
                    'province' => 'TX',
                    'zip' => '78701',
                    'country' => 'United States',
                ],
            ],
            'lines' => [
                'nodes' => [
                    [
                        'id' => 'line-1',
                        'title' => 'Gift Card',
                        'quantity' => 2,
                        'currentPrice' => [
                            'amount' => '24.00',
                            'currencyCode' => 'USD',
                        ],
                        'lineDiscountedPrice' => [
                            'amount' => '40.00',
                            'currencyCode' => 'USD',
                        ],
                        'sellingPlanId' => 'gid://shopify/SellingPlan/1',
                        'sellingPlanName' => 'Starter Delivery',
                        'variantTitle' => 'Default Title',
                    ],
                ],
            ],
            'originOrder' => [
                'name' => '#1001',
                'createdAt' => '2026-04-02T10:31:00Z',
            ],
            'orders' => [
                'nodes' => [],
            ],
        ]);

        $this->assertSame('SC-593791907', $contract['displayId']);
        $this->assertSame('Ava Thompson', $contract['customer']['name']);
        $this->assertSame('Starter Delivery', $contract['plan']);
        $this->assertSame('$48.00', $contract['amount']);
        $this->assertSame('Active', $contract['status']);
        $this->assertSame('Every 1 week', $contract['deliveryFrequency']);
        $this->assertSame('$8.00 off', $contract['discount']);
        $this->assertSame('#1001', $contract['orderNumber']);
        $this->assertCount(4, $contract['paymentSummary']);
        $this->assertSame('Shipping', $contract['deliveryMethod']['type']);
        $this->assertSame('Recurring shipment', $contract['deliveryMethod']['description']);
        $this->assertCount(1, $contract['lineItems']);
        $this->assertSame('$24.00', $contract['lineItems'][0]['unitPrice']);
        $this->assertSame('Subscription contract created', $contract['timeline'][0]['text']);
    }

    public function test_it_normalizes_the_subscription_contract_approval_error(): void
    {
        $service = new ShopifyContractService;
        $method = new \ReflectionMethod($service, 'normalizeShopifyErrorMessage');
        $method->setAccessible(true);

        $message = $method->invoke(
            $service,
            'Access denied. This app is not approved to access the SubscriptionContract object.'
        );

        $this->assertSame(
            'This app is not approved to access the SubscriptionContract object. See https://shopify.dev/docs/apps/launch/protected-customer-data for more details.',
            $message
        );
    }

    public function test_it_normalizes_customer_and_order_scope_errors(): void
    {
        $service = new ShopifyContractService;
        $method = new \ReflectionMethod($service, 'normalizeShopifyErrorMessage');
        $method->setAccessible(true);

        $message = $method->invoke(
            $service,
            'Access denied for customer field. Required access: read_customers access scope. Access denied for orders field.'
        );

        $this->assertSame(
            'Access denied for customer field. Required access: `read_customers` access scope. Access denied for orders field. Required access: `read_orders` access scope. Reinstall or re-authenticate the app after updating scopes.',
            $message
        );
    }
}

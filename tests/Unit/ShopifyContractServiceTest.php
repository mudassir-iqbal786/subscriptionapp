<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\ShopifyContractService;
use Carbon\Carbon;
use Gnikyt\BasicShopifyAPI\BasicShopifyAPI;
use Mockery;
use PHPUnit\Framework\TestCase;

class ShopifyContractServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

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
                        'productId' => 'gid://shopify/Product/44',
                        'productTitle' => 'Gift Card Product',
                        'imageUrl' => 'https://example.com/gift-card.png',
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

        $this->assertSame('593791907', $contract['displayId']);
        $this->assertSame('Ava Thompson', $contract['customer']['name']);
        $this->assertSame('Starter Delivery', $contract['plan']);
        $this->assertSame('$48.00', $contract['amount']);
        $this->assertSame('Active', $contract['status']);
        $this->assertSame('Every 1 week', $contract['deliveryFrequency']);
        $this->assertSame('$8.00 off', $contract['discount']);
        $this->assertSame('#1001', $contract['orderNumber']);
        $this->assertSame('Gift Card Product', $contract['productTitle']);
        $this->assertSame('https://example.com/gift-card.png', $contract['productImageUrl']);
        $this->assertCount(5, $contract['paymentSummary']);
        $this->assertSame('Shipping', $contract['deliveryMethod']['type']);
        $this->assertSame('Recurring shipment', $contract['deliveryMethod']['description']);
        $this->assertCount(1, $contract['lineItems']);
        $this->assertSame('Gift Card Product', $contract['lineItems'][0]['productTitle']);
        $this->assertSame('https://example.com/gift-card.png', $contract['lineItems'][0]['imageUrl']);
        $this->assertSame('$24.00', $contract['lineItems'][0]['unitPrice']);
        $this->assertSame(40.0, $contract['lineItems'][0]['totalValue']);
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

    public function test_it_normalizes_numeric_subscription_contract_ids_to_shopify_gids(): void
    {
        $service = new ShopifyContractService;

        $this->assertSame(
            'gid://shopify/SubscriptionContract/26207453383',
            $service->normalizeContractId('26207453383')
        );
        $this->assertSame(
            'gid://shopify/SubscriptionContract/26207453383',
            $service->normalizeContractId('gid://shopify/SubscriptionContract/26207453383')
        );
    }

    public function test_it_calculates_the_following_billing_date_from_the_billing_policy(): void
    {
        $service = new ShopifyContractService;

        $date = $service->calculateFollowingBillingDate([
            'nextBillingDate' => '2026-01-31T00:00:00Z',
            'billingPolicy' => [
                'interval' => 'MONTH',
                'intervalCount' => 1,
            ],
        ]);

        $this->assertSame('2026-02-28', $date?->toDateString());
    }

    public function test_it_creates_a_subscription_billing_attempt(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $api->shouldReceive('graph')
            ->once()
            ->with(
                Mockery::on(fn (string $query): bool => str_contains($query, 'subscriptionBillingAttemptCreate')),
                [
                    'subscriptionContractId' => 'gid://shopify/SubscriptionContract/123',
                    'input' => [
                        'idempotencyKey' => 'subscription-billing-test',
                        'originTime' => '2026-04-20T00:00:00.000000Z',
                    ],
                ]
            )
            ->andReturn([
                'body' => [
                    'data' => [
                        'subscriptionBillingAttemptCreate' => [
                            'subscriptionBillingAttempt' => [
                                'id' => 'gid://shopify/SubscriptionBillingAttempt/1',
                                'ready' => false,
                            ],
                            'userErrors' => [],
                        ],
                    ],
                ],
            ]);

        $shop = Mockery::mock(User::class);
        $shop->shouldReceive('api')->once()->andReturn($api);

        $attempt = (new ShopifyContractService)->createBillingAttempt(
            $shop,
            '123',
            'subscription-billing-test',
            Carbon::parse('2026-04-20T00:00:00Z')
        );

        $this->assertSame('gid://shopify/SubscriptionBillingAttempt/1', $attempt['id']);
        $this->assertFalse($attempt['ready']);
    }

    public function test_it_fetches_billable_subscription_contract_fields(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $api->shouldReceive('graph')
            ->once()
            ->with(
                Mockery::on(fn (string $query): bool => str_contains($query, 'GetBillableSubscriptionContracts')),
                ['first' => 50]
            )
            ->andReturn([
                'body' => [
                    'data' => [
                        'subscriptionContracts' => [
                            'nodes' => [
                                [
                                    'id' => 'gid://shopify/SubscriptionContract/123',
                                    'status' => 'ACTIVE',
                                    'nextBillingDate' => '2026-04-20T00:00:00Z',
                                    'billingPolicy' => [
                                        'interval' => 'WEEK',
                                        'intervalCount' => 2,
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $shop = Mockery::mock(User::class);
        $shop->shouldReceive('api')->once()->andReturn($api);

        $contracts = (new ShopifyContractService)->getBillableContracts($shop, 50);

        $this->assertCount(1, $contracts);
        $this->assertSame('Active', $contracts->first()['status']);
        $this->assertSame('WEEK', $contracts->first()['billingPolicy']['interval']);
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ShopifyContractService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Osiset\ShopifyApp\Http\Middleware\VerifyShopify;
use Tests\TestCase;

class CustomerAccountSubscriptionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_subscription_products_for_the_authenticated_customer(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifyContractService::class);
        $service->shouldReceive('getContracts')
            ->once()
            ->with($user, 100)
            ->andReturn(collect([
                [
                    'id' => 'gid://shopify/SubscriptionContract/1',
                    'displayId' => '1',
                    'customer' => [
                        'id' => 'gid://shopify/Customer/123',
                        'email' => 'customer@example.com',
                    ],
                    'status' => 'Active',
                    'plan' => 'Weekly delivery',
                    'nextOrder' => 'April 20, 2026',
                    'amount' => '$24.00',
                    'deliveryFrequency' => 'Every 1 week',
                    'productTitle' => 'Coffee Beans',
                    'productSubtitle' => 'Default Title',
                    'productImageUrl' => '',
                    'quantity' => '1',
                    'lineItems' => [
                        [
                            'id' => 'gid://shopify/SubscriptionLine/1',
                            'productTitle' => 'Coffee Beans',
                            'subtitle' => 'Default Title',
                            'imageUrl' => '',
                            'quantity' => '1',
                            'unitPrice' => '$24.00',
                            'total' => '$24.00',
                            'sellingPlanName' => 'Weekly delivery',
                        ],
                    ],
                ],
                [
                    'id' => 'gid://shopify/SubscriptionContract/2',
                    'customer' => [
                        'id' => 'gid://shopify/Customer/999',
                    ],
                    'lineItems' => [],
                ],
            ]));

        $this->app->instance(ShopifyContractService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/customer-account/subscriptions', [
            'customerId' => '123',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Customer subscriptions fetched successfully.')
            ->assertJsonCount(1, 'subscriptions')
            ->assertJsonPath('subscriptions.0.productTitle', 'Coffee Beans')
            ->assertJsonPath('subscriptions.0.lineItems.0.sellingPlanName', 'Weekly delivery');
    }

    public function test_it_validates_the_customer_id(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifyContractService::class);
        $service->shouldNotReceive('getContracts');

        $this->app->instance(ShopifyContractService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/customer-account/subscriptions', [
            'customerId' => 'invalid',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['customerId']);
    }
}

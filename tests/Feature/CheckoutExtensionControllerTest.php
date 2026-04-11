<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\CheckoutShippingProfileService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Osiset\ShopifyApp\Http\Middleware\VerifyShopify;
use Tests\TestCase;

class CheckoutExtensionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_shipping_profiles_for_the_current_shop(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(CheckoutShippingProfileService::class);
        $service->shouldReceive('getProfilesForVariants')
            ->once()
            ->with($user, ['gid://shopify/ProductVariant/123'])
            ->andReturn([
                'items' => [
                    [
                        'variantId' => 'gid://shopify/ProductVariant/123',
                        'variantTitle' => 'Default Title',
                        'productTitle' => 'Test product',
                        'profileId' => 'gid://shopify/DeliveryProfile/1',
                        'profileName' => 'Subscription Shipping',
                    ],
                ],
                'profiles' => [
                    [
                        'profileId' => 'gid://shopify/DeliveryProfile/1',
                        'name' => 'Subscription Shipping',
                        'shippingZones' => [
                            [
                                'zoneId' => 'gid://shopify/DeliveryZone/1',
                                'name' => 'United States',
                                'rates' => [
                                    [
                                        'handle' => 'gid://shopify/DeliveryMethodDefinition/1',
                                        'price' => '5.00 USD',
                                        'title' => 'Standard',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $this->app->instance(CheckoutShippingProfileService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/checkout/shipping-profiles', [
            'checkoutId' => 'checkout-token-123',
            'variantIds' => ['gid://shopify/ProductVariant/123'],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Checkout shipping profiles fetched successfully.')
            ->assertJsonPath('checkoutId', 'checkout-token-123')
            ->assertJsonPath('items.0.profileName', 'Subscription Shipping')
            ->assertJsonPath('profiles.0.profileId', 'gid://shopify/DeliveryProfile/1')
            ->assertJsonPath('profiles.0.shippingZones.0.rates.0.title', 'Standard');
    }

    public function test_it_validates_variant_ids_for_checkout_shipping_profiles(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(CheckoutShippingProfileService::class);
        $service->shouldNotReceive('getProfilesForVariants');

        $this->app->instance(CheckoutShippingProfileService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/checkout/shipping-profiles', [
            'variantIds' => ['invalid-variant-id'],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variantIds.0']);
    }

    public function test_it_returns_shopify_errors_as_unprocessable_responses(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(CheckoutShippingProfileService::class);
        $service->shouldReceive('getProfilesForVariants')
            ->once()
            ->andThrow(new \RuntimeException('Shipping scope is missing.'));

        $this->app->instance(CheckoutShippingProfileService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/checkout/shipping-profiles', [
            'variantIds' => ['gid://shopify/ProductVariant/123'],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Shipping scope is missing.');
    }
}

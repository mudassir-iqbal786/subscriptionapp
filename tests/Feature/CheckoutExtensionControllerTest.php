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
                [
                    'id' => 'gid://shopify/ProductVariant/123',
                    'title' => 'Coffee / Default Title',
                    'shippingProfile' => [
                        'id' => 'gid://shopify/DeliveryProfile/1',
                        'name' => 'Subscription Shipping',
                    ],
                ],
            ]);

        $this->app->instance(CheckoutShippingProfileService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/checkout/shipping-profiles', [
            'variantIds' => ['gid://shopify/ProductVariant/123'],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Checkout shipping profiles fetched successfully.')
            ->assertJsonPath('profiles.0.id', 'gid://shopify/ProductVariant/123')
            ->assertJsonPath('profiles.0.shippingProfile.name', 'Subscription Shipping');
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

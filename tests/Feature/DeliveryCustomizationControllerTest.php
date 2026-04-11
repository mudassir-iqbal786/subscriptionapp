<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ShopifyDeliveryCustomizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Osiset\ShopifyApp\Http\Middleware\VerifyShopify;
use Tests\TestCase;

class DeliveryCustomizationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_default_delivery_customization_settings_for_create_screen(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifyDeliveryCustomizationService::class);
        $service->shouldReceive('defaultConfiguration')
            ->once()
            ->andReturn([
                'id' => null,
                'title' => 'Subscription delivery customization',
                'enabled' => true,
                'hiddenDeliveryOptionTitles' => [],
                'hiddenDeliveryOptionHandles' => [],
            ]);

        $this->app->instance(ShopifyDeliveryCustomizationService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->getJson('/api/delivery-customization');

        $response
            ->assertOk()
            ->assertJsonPath('deliveryCustomization.title', 'Subscription delivery customization')
            ->assertJsonPath('deliveryCustomization.enabled', true);
    }

    public function test_it_saves_delivery_customization_settings(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifyDeliveryCustomizationService::class);
        $service->shouldReceive('save')
            ->once()
            ->with($user, Mockery::on(function (array $payload): bool {
                return $payload['id'] === 'gid://shopify/DeliveryCustomization/123'
                    && $payload['hiddenDeliveryOptionTitles'] === ['Express'];
            }))
            ->andReturn([
                'id' => 'gid://shopify/DeliveryCustomization/123',
                'title' => 'Subscription shipping rules',
                'enabled' => true,
                'hiddenDeliveryOptionTitles' => ['Express'],
                'hiddenDeliveryOptionHandles' => ['overnight'],
            ]);

        $this->app->instance(ShopifyDeliveryCustomizationService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->putJson('/api/delivery-customization', [
            'id' => 'gid://shopify/DeliveryCustomization/123',
            'title' => 'Subscription shipping rules',
            'enabled' => true,
            'hiddenDeliveryOptionTitles' => ['Express'],
            'hiddenDeliveryOptionHandles' => ['overnight'],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Delivery customization saved successfully.')
            ->assertJsonPath('deliveryCustomization.hiddenDeliveryOptionHandles.0', 'overnight');
    }

    public function test_it_accepts_numeric_delivery_customization_ids(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifyDeliveryCustomizationService::class);
        $service->shouldReceive('save')
            ->once()
            ->with($user, Mockery::on(function (array $payload): bool {
                return $payload['id'] === '123';
            }))
            ->andReturn([
                'id' => 'gid://shopify/DeliveryCustomization/123',
                'title' => 'Subscription shipping rules',
                'enabled' => true,
                'hiddenDeliveryOptionTitles' => [],
                'hiddenDeliveryOptionHandles' => [],
            ]);

        $this->app->instance(ShopifyDeliveryCustomizationService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->putJson('/api/delivery-customization', [
            'id' => '123',
            'title' => 'Subscription shipping rules',
            'enabled' => true,
            'hiddenDeliveryOptionTitles' => [],
            'hiddenDeliveryOptionHandles' => [],
        ]);

        $response->assertOk();
    }

    public function test_it_validates_delivery_customization_settings(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifyDeliveryCustomizationService::class);
        $service->shouldNotReceive('save');

        $this->app->instance(ShopifyDeliveryCustomizationService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->putJson('/api/delivery-customization', [
            'id' => 'invalid',
            'title' => '',
            'enabled' => true,
            'hiddenDeliveryOptionTitles' => [],
            'hiddenDeliveryOptionHandles' => [],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['id', 'title']);
    }
}

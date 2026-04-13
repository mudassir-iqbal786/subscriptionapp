<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ShopifyMetaobjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Osiset\ShopifyApp\Http\Middleware\VerifyShopify;
use Tests\TestCase;

class ShopifyMetaobjectControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_subscription_metaobject(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifyMetaobjectService::class);
        $service->shouldReceive('createSubscriptionMetaobject')
            ->once()
            ->with($user, Mockery::on(function (array $payload): bool {
                return $payload['title'] === 'VIP subscription'
                    && $payload['description'] === 'Created from the app'
                    && $payload['handle'] === 'vip-subscription';
            }))
            ->andReturn([
                'id' => 'gid://shopify/Metaobject/123',
                'handle' => 'vip-subscription',
                'type' => '$app:subscription_metaobject',
            ]);

        $this->app->instance(ShopifyMetaobjectService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/metaobjects/subscription', [
            'title' => 'VIP subscription',
            'description' => 'Created from the app',
            'handle' => 'vip-subscription',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Metaobject created successfully.')
            ->assertJsonPath('metaobject.id', 'gid://shopify/Metaobject/123');
    }

    public function test_it_validates_metaobject_payload(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifyMetaobjectService::class);
        $service->shouldNotReceive('createSubscriptionMetaobject');

        $this->app->instance(ShopifyMetaobjectService::class, $service);
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/metaobjects/subscription', [
            'title' => '',
            'handle' => '-bad-handle',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'handle']);
    }
}

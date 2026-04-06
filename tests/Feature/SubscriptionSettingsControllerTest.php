<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ShopifySubscriptionSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Osiset\ShopifyApp\Http\Middleware\VerifyShopify;
use Tests\TestCase;

class SubscriptionSettingsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_default_settings_for_the_current_shop(): void
    {
        config()->set('shopify-app.subscription_management_settings_url', 'https://example.test/manage');

        $user = User::factory()->create();
        $service = Mockery::mock(ShopifySubscriptionSettingsService::class);
        $service->shouldReceive('fetchSettings')->once()->andReturn(null);
        $this->app->instance(ShopifySubscriptionSettingsService::class, $service);

        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->getJson('/api/settings');

        $response
            ->assertOk()
            ->assertJsonPath('settings.paymentMethodFailure.retryAttempts', 3)
            ->assertJsonPath('settings.paymentMethodFailure.retryDays', 7)
            ->assertJsonPath('settings.inventoryFailure.retryAttempts', 5)
            ->assertJsonPath('settings.inventoryFailure.staffNotifications', 'weekly')
            ->assertJsonPath('settings.managementUrl', 'https://example.test/manage')
            ->assertJsonPath('settings.setupProgress.accountAccessEnabled', true)
            ->assertJsonPath('settings.setupProgress.notificationsCustomized', false);
    }

    public function test_it_updates_and_returns_persisted_settings_for_the_current_shop(): void
    {
        config()->set('shopify-app.subscription_management_settings_url', 'https://example.test/manage');

        $user = User::factory()->create();
        $service = Mockery::mock(ShopifySubscriptionSettingsService::class);
        $service->shouldReceive('syncSettings')->once();
        $this->app->instance(ShopifySubscriptionSettingsService::class, $service);

        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->putJson('/api/settings', [
            'paymentMethodFailure' => [
                'retryAttempts' => 4,
                'retryDays' => 3,
                'failedAction' => 'pause',
            ],
            'inventoryFailure' => [
                'retryAttempts' => 2,
                'retryDays' => 6,
                'failedAction' => 'pause',
                'staffNotifications' => 'daily',
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('settings.paymentMethodFailure.retryAttempts', 4)
            ->assertJsonPath('settings.paymentMethodFailure.failedAction', 'pause')
            ->assertJsonPath('settings.inventoryFailure.retryAttempts', 2)
            ->assertJsonPath('settings.inventoryFailure.failedAction', 'pause')
            ->assertJsonPath('settings.inventoryFailure.staffNotifications', 'daily')
            ->assertJsonPath('settings.setupProgress.notificationsCustomized', true);

        $this->assertDatabaseHas('subscription_settings', [
            'user_id' => $user->id,
            'payment_method_retry_attempts' => 4,
            'payment_method_retry_days' => 3,
            'payment_method_failed_action' => 'pause',
            'inventory_retry_attempts' => 2,
            'inventory_retry_days' => 6,
            'inventory_failed_action' => 'pause',
            'inventory_staff_notifications' => 'daily',
        ]);
    }

    public function test_it_validates_settings_payloads(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(ShopifySubscriptionSettingsService::class);
        $service->shouldNotReceive('syncSettings');
        $this->app->instance(ShopifySubscriptionSettingsService::class, $service);

        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->putJson('/api/settings', [
            'paymentMethodFailure' => [
                'retryAttempts' => 11,
                'retryDays' => 0,
                'failedAction' => 'archive',
            ],
            'inventoryFailure' => [
                'retryAttempts' => -1,
                'retryDays' => 15,
                'failedAction' => 'archive',
                'staffNotifications' => 'monthly',
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'paymentMethodFailure.retryAttempts',
                'paymentMethodFailure.retryDays',
                'paymentMethodFailure.failedAction',
                'inventoryFailure.retryAttempts',
                'inventoryFailure.retryDays',
                'inventoryFailure.failedAction',
                'inventoryFailure.staffNotifications',
            ]);

        $this->assertDatabaseCount('subscription_settings', 0);
    }
}

<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\ShopifySubscriptionSettingsService;
use Gnikyt\BasicShopifyAPI\BasicShopifyAPI;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase;

class ShopifySubscriptionSettingsServiceTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    public function test_it_fetches_settings_from_the_shopify_app_metafield(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $user = Mockery::mock(User::class);
        $user->shouldReceive('api')->once()->andReturn($api);
        $api->shouldReceive('graph')
            ->once()
            ->andReturn([
                'body' => [
                    'data' => [
                        'currentAppInstallation' => [
                            'metafield' => [
                                'value' => json_encode([
                                    'paymentMethodFailure' => [
                                        'retryAttempts' => 4,
                                        'retryDays' => 3,
                                        'failedAction' => 'skip',
                                    ],
                                    'inventoryFailure' => [
                                        'retryAttempts' => 2,
                                        'retryDays' => 6,
                                        'failedAction' => 'cancel',
                                        'staffNotifications' => 'daily',
                                    ],
                                ], JSON_THROW_ON_ERROR),
                            ],
                        ],
                    ],
                ],
            ]);

        $service = new ShopifySubscriptionSettingsService;

        $settings = $service->fetchSettings($user);

        $this->assertSame(4, $settings['paymentMethodFailure']['retryAttempts']);
        $this->assertSame('daily', $settings['inventoryFailure']['staffNotifications']);
    }

    public function test_it_syncs_settings_to_the_shopify_app_metafield(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $user = Mockery::mock(User::class);
        $user->shouldReceive('api')->twice()->andReturn($api);

        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query): bool {
                return str_contains($query, 'currentAppInstallation') && str_contains($query, 'id');
            })
            ->andReturn([
                'body' => [
                    'data' => [
                        'currentAppInstallation' => [
                            'id' => 'gid://shopify/AppInstallation/123',
                        ],
                    ],
                ],
            ]);

        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query, array $variables): bool {
                if (! str_contains($query, 'metafieldsSet')) {
                    return false;
                }

                $metafield = $variables['metafields'][0] ?? null;

                return is_array($metafield)
                    && $metafield['ownerId'] === 'gid://shopify/AppInstallation/123'
                    && $metafield['namespace'] === 'subscription_app'
                    && $metafield['key'] === 'settings'
                    && $metafield['type'] === 'json';
            })
            ->andReturn([
                'body' => [
                    'data' => [
                        'metafieldsSet' => [
                            'metafields' => [
                                [
                                    'id' => 'gid://shopify/Metafield/1',
                                ],
                            ],
                            'userErrors' => [],
                        ],
                    ],
                ],
            ]);

        $service = new ShopifySubscriptionSettingsService;

        $service->syncSettings($user, [
            'paymentMethodFailure' => [
                'retryAttempts' => 4,
                'retryDays' => 3,
                'failedAction' => 'skip',
            ],
            'inventoryFailure' => [
                'retryAttempts' => 2,
                'retryDays' => 6,
                'failedAction' => 'cancel',
                'staffNotifications' => 'daily',
            ],
        ]);

        $this->addToAssertionCount(1);
    }
}

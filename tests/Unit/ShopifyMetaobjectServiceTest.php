<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\ShopifyMetaobjectService;
use Gnikyt\BasicShopifyAPI\BasicShopifyAPI;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase;

class ShopifyMetaobjectServiceTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    public function test_it_creates_definition_before_creating_metaobject_when_missing(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $user = Mockery::mock(User::class);
        $user->shouldReceive('api')->times(3)->andReturn($api);

        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query, array $variables): bool {
                return str_contains($query, 'metaobjectDefinitionByType')
                    && $variables['type'] === '$app:subscription_metaobject';
            })
            ->andReturn([
                'body' => [
                    'data' => [
                        'metaobjectDefinitionByType' => null,
                    ],
                ],
            ]);

        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query, array $variables): bool {
                return str_contains($query, 'metaobjectDefinitionCreate')
                    && data_get($variables, 'definition.type') === '$app:subscription_metaobject'
                    && data_get($variables, 'definition.fieldDefinitions.0.key') === 'title';
            })
            ->andReturn([
                'body' => [
                    'data' => [
                        'metaobjectDefinitionCreate' => [
                            'metaobjectDefinition' => [
                                'id' => 'gid://shopify/MetaobjectDefinition/123',
                                'type' => '$app:subscription_metaobject',
                            ],
                            'userErrors' => [],
                        ],
                    ],
                ],
            ]);

        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query, array $variables): bool {
                return str_contains($query, 'metaobjectCreate')
                    && data_get($variables, 'metaobject.handle') === 'vip-subscription'
                    && data_get($variables, 'metaobject.fields.0.value') === 'VIP subscription';
            })
            ->andReturn([
                'body' => [
                    'data' => [
                        'metaobjectCreate' => [
                            'metaobject' => [
                                'id' => 'gid://shopify/Metaobject/456',
                                'handle' => 'vip-subscription',
                                'type' => '$app:subscription_metaobject',
                                'fields' => [
                                    [
                                        'key' => 'title',
                                        'value' => 'VIP subscription',
                                    ],
                                ],
                            ],
                            'userErrors' => [],
                        ],
                    ],
                ],
            ]);

        $service = new ShopifyMetaobjectService;

        $metaobject = $service->createSubscriptionMetaobject($user, [
            'title' => 'VIP subscription',
            'description' => 'Created from the app',
            'handle' => 'vip-subscription',
        ]);

        $this->assertSame('gid://shopify/Metaobject/456', $metaobject['id']);
        $this->assertSame('vip-subscription', $metaobject['handle']);
    }
}

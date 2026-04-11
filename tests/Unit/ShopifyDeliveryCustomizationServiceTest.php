<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\ShopifyDeliveryCustomizationService;
use Gnikyt\BasicShopifyAPI\BasicShopifyAPI;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase;

class ShopifyDeliveryCustomizationServiceTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    public function test_it_fetches_delivery_customization_configuration(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $user = Mockery::mock(User::class);
        $user->shouldReceive('api')->once()->andReturn($api);
        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query, array $variables): bool {
                return str_contains($query, 'GetDeliveryCustomization')
                    && $variables['id'] === 'gid://shopify/DeliveryCustomization/123';
            })
            ->andReturn([
                'body' => [
                    'data' => [
                        'node' => [
                            'id' => 'gid://shopify/DeliveryCustomization/123',
                            'title' => 'Subscription shipping rules',
                            'enabled' => true,
                            'metafield' => [
                                'value' => json_encode([
                                    'hiddenDeliveryOptionTitles' => ['Express'],
                                    'hiddenDeliveryOptionHandles' => ['overnight'],
                                ], JSON_THROW_ON_ERROR),
                            ],
                        ],
                    ],
                ],
            ]);

        $service = new ShopifyDeliveryCustomizationService;

        $configuration = $service->get($user, '123');

        $this->assertSame('Subscription shipping rules', $configuration['title']);
        $this->assertSame(['Express'], $configuration['hiddenDeliveryOptionTitles']);
        $this->assertSame(['overnight'], $configuration['hiddenDeliveryOptionHandles']);
    }

    public function test_it_creates_delivery_customization_configuration(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $user = Mockery::mock(User::class);
        $user->shouldReceive('api')->once()->andReturn($api);
        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query, array $variables): bool {
                $deliveryCustomization = $variables['deliveryCustomization'] ?? [];
                $metafield = $deliveryCustomization['metafields'][0] ?? [];
                $value = json_decode($metafield['value'] ?? '{}', true);

                return str_contains($query, 'deliveryCustomizationCreate')
                    && $deliveryCustomization['functionHandle'] === 'subscription-delivery-customization'
                    && $deliveryCustomization['title'] === 'Subscription shipping rules'
                    && $deliveryCustomization['enabled'] === true
                    && $metafield['namespace'] === '$app:subscription-delivery-customization'
                    && $metafield['key'] === 'function-configuration'
                    && $value['hiddenDeliveryOptionTitles'] === ['Express'];
            })
            ->andReturn([
                'body' => [
                    'data' => [
                        'deliveryCustomizationCreate' => [
                            'deliveryCustomization' => [
                                'id' => 'gid://shopify/DeliveryCustomization/123',
                                'title' => 'Subscription shipping rules',
                                'enabled' => true,
                                'metafield' => [
                                    'value' => json_encode([
                                        'hiddenDeliveryOptionTitles' => ['Express'],
                                        'hiddenDeliveryOptionHandles' => ['overnight'],
                                    ], JSON_THROW_ON_ERROR),
                                ],
                            ],
                            'userErrors' => [],
                        ],
                    ],
                ],
            ]);

        $service = new ShopifyDeliveryCustomizationService;

        $configuration = $service->save($user, [
            'title' => 'Subscription shipping rules',
            'enabled' => true,
            'hiddenDeliveryOptionTitles' => ['Express'],
            'hiddenDeliveryOptionHandles' => ['overnight'],
        ]);

        $this->assertSame('gid://shopify/DeliveryCustomization/123', $configuration['id']);
    }
}

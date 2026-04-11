<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\CheckoutShippingProfileService;
use Gnikyt\BasicShopifyAPI\BasicShopifyAPI;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use Osiset\ShopifyApp\Contracts\Objects\Values\ShopDomain;
use Tests\TestCase;

class CheckoutShippingProfileServiceTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    public function test_it_reads_shipping_profiles_from_wrapped_shopify_responses(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $domain = Mockery::mock(ShopDomain::class);
        $user = Mockery::mock(User::class);
        $domain->shouldReceive('toNative')->twice()->andReturn('example.myshopify.com');
        $user->shouldReceive('getDomain')->twice()->andReturn($domain);
        $user->shouldReceive('api')->once()->andReturn($api);

        $api->shouldReceive('graph')
            ->once()
            ->withArgs(function (string $query, array $variables): bool {
                return str_contains($query, 'deliveryProfile')
                    && $variables['variantIds'] === ['gid://shopify/ProductVariant/47658359947415'];
            })
            ->andReturn([
                'body' => [
                    'Gnikyt\\BasicShopifyAPI\\ResponseAccess' => [
                        'data' => [
                            'nodes' => [
                                [
                                    'id' => 'gid://shopify/ProductVariant/47658359947415',
                                    'title' => '$25',
                                    'product' => [
                                        'title' => 'Gift Card',
                                    ],
                                    'deliveryProfile' => null,
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $shippingProfileData = (new CheckoutShippingProfileService)->getProfilesForVariants($user, [
            'gid://shopify/ProductVariant/47658359947415',
        ]);

        $this->assertSame([], $shippingProfileData['profiles']);
        $this->assertSame('gid://shopify/ProductVariant/47658359947415', $shippingProfileData['items'][0]['variantId']);
        $this->assertSame('Gift Card', $shippingProfileData['items'][0]['productTitle']);
        $this->assertSame('', $shippingProfileData['items'][0]['profileName']);
    }

    public function test_it_reads_shipping_profiles_from_single_key_wrapped_responses(): void
    {
        $api = Mockery::mock(BasicShopifyAPI::class);
        $domain = Mockery::mock(ShopDomain::class);
        $user = Mockery::mock(User::class);
        $domain->shouldReceive('toNative')->twice()->andReturn('example.myshopify.com');
        $user->shouldReceive('getDomain')->twice()->andReturn($domain);
        $user->shouldReceive('api')->once()->andReturn($api);

        $api->shouldReceive('graph')
            ->once()
            ->andReturn([
                'body' => [
                    'Some\\Response\\Wrapper' => [
                        'data' => [
                            'nodes' => [
                                [
                                    'id' => 'gid://shopify/ProductVariant/47658359947415',
                                    'title' => '$25',
                                    'product' => [
                                        'title' => 'Gift Card',
                                    ],
                                    'deliveryProfile' => [
                                        'id' => 'gid://shopify/DeliveryProfile/1',
                                        'name' => 'General Profile',
                                        'profileLocationGroups' => [
                                            [
                                                'locationGroupZones' => [
                                                    'nodes' => [
                                                        [
                                                            'zone' => [
                                                                'id' => 'gid://shopify/DeliveryZone/1',
                                                                'name' => 'United States',
                                                            ],
                                                            'methodDefinitions' => [
                                                                'nodes' => [
                                                                    [
                                                                        'id' => 'gid://shopify/DeliveryMethodDefinition/1',
                                                                        'name' => 'Standard',
                                                                        'rateProvider' => [
                                                                            '__typename' => 'DeliveryRateDefinition',
                                                                            'id' => 'gid://shopify/DeliveryRateDefinition/1',
                                                                            'price' => [
                                                                                'amount' => '5.00',
                                                                                'currencyCode' => 'USD',
                                                                            ],
                                                                        ],
                                                                    ],
                                                                ],
                                                            ],
                                                        ],
                                                    ],
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $shippingProfileData = (new CheckoutShippingProfileService)->getProfilesForVariants($user, [
            'gid://shopify/ProductVariant/47658359947415',
        ]);

        $this->assertSame('General Profile', $shippingProfileData['items'][0]['profileName']);
        $this->assertSame('General Profile', $shippingProfileData['profiles'][0]['name']);
        $this->assertSame('United States', $shippingProfileData['profiles'][0]['shippingZones'][0]['name']);
        $this->assertSame('5.00 USD', $shippingProfileData['profiles'][0]['shippingZones'][0]['rates'][0]['price']);
    }
}

<?php

namespace Tests\Feature;

use Osiset\ShopifyApp\Http\Middleware\VerifyShopify;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SubscriptionPagesTest extends TestCase
{
    /**
     * @return array<string, array{0: string}>
     */
    public static function subscriptionPagesProvider(): array
    {
        return [
            'overview page' => ['/'],
            'plans page' => ['/plans'],
            'create plan page' => ['/plans/create'],
            'plan description page' => ['/plans/description/gid%3A%2F%2Fshopify%2FSellingPlanGroup%2F1687912647'],
            'contracts page' => ['/contracts'],
            'contract detail page' => ['/contracts/detail/SC-1042'],
            'settings page' => ['/settings'],
        ];
    }

    #[DataProvider('subscriptionPagesProvider')]
    public function test_subscription_pages_render_successfully(string $uri): void
    {
        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->get($uri);

        $response->assertStatus(200);
    }
}

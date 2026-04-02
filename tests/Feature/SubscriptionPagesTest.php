<?php

namespace Tests\Feature;

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
            'contracts page' => ['/contracts'],
            'settings page' => ['/settings'],
        ];
    }

    #[DataProvider('subscriptionPagesProvider')]
    public function test_subscription_pages_render_successfully(string $uri): void
    {
        $response = $this->get($uri);

        $response->assertStatus(200);
    }
}

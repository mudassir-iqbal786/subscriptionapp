<?php

namespace Tests\Unit;

use Tests\TestCase;

class ShopifyConfigTest extends TestCase
{
    public function test_app_uninstalled_webhook_is_configured(): void
    {
        $webhook = config('shopify-app.webhooks.app-uninstalled');

        $this->assertIsArray($webhook);
        $this->assertSame('APP_UNINSTALLED', $webhook['topic']);
        $this->assertSame(
            sprintf('%s/webhook/app-uninstalled', config('app.url')),
            $webhook['address'],
        );
    }
}

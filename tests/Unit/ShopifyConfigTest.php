<?php

namespace Tests\Unit;

use App\Jobs\SubscriptionContractCreateJob;
use App\Jobs\SubscriptionContractUpdateJob;
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

    public function test_subscription_contract_create_webhook_is_configured(): void
    {
        $webhook = config('shopify-app.webhooks.subscription-contract-create');

        $this->assertIsArray($webhook);
        $this->assertSame('SUBSCRIPTION_CONTRACTS_CREATE', $webhook['topic']);
        $this->assertSame(
            sprintf('%s/webhook/subscription-contract-create', config('app.url')),
            $webhook['address'],
        );
        $this->assertSame(SubscriptionContractCreateJob::class, $webhook['class']);
    }

    public function test_subscription_contract_update_webhook_is_configured(): void
    {
        $webhook = config('shopify-app.webhooks.subscription-contract-update');

        $this->assertIsArray($webhook);
        $this->assertSame('SUBSCRIPTION_CONTRACTS_UPDATE', $webhook['topic']);
        $this->assertSame(
            sprintf('%s/webhook/subscription-contract-update', config('app.url')),
            $webhook['address'],
        );
        $this->assertSame(SubscriptionContractUpdateJob::class, $webhook['class']);
    }
}

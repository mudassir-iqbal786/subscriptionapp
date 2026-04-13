<?php

namespace Tests\Feature;

use Tests\TestCase;

class CustomerAccountSubscriptionCorsTest extends TestCase
{
    public function test_customer_account_subscription_endpoint_allows_shopify_extension_preflight(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://extensions.shopifycdn.com',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'authorization,content-type,accept',
        ])->options('/api/customer-account/subscriptions');

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeader('Access-Control-Allow-Methods')
            ->assertHeader('Access-Control-Allow-Headers');
    }
}

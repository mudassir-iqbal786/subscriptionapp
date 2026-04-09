<?php

namespace Tests\Feature\Jobs;

use App\Jobs\SubscriptionContractCreateJob;
use App\Support\SubscriptionContractStream;
use stdClass;
use Tests\TestCase;

class SubscriptionContractCreateJobTest extends TestCase
{
    public function test_it_publishes_a_contract_create_event_to_the_stream(): void
    {
        $payload = new stdClass;
        $payload->admin_graphql_api_id = 'gid://shopify/SubscriptionContract/123';

        $job = new SubscriptionContractCreateJob('example-shop.myshopify.com', $payload);
        $job->handle(app(SubscriptionContractStream::class));

        $event = app(SubscriptionContractStream::class)->latest('example-shop.myshopify.com');

        $this->assertIsArray($event);
        $this->assertSame('subscription_contracts/create', $event['topic']);
        $this->assertSame('gid://shopify/SubscriptionContract/123', $event['contractId']);
        $this->assertSame('example-shop.myshopify.com', $event['shop']);
    }
}

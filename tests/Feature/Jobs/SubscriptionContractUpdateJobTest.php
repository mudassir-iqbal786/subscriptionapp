<?php

namespace Tests\Feature\Jobs;

use App\Jobs\SubscriptionContractUpdateJob;
use App\Support\SubscriptionContractStream;
use stdClass;
use Tests\TestCase;

class SubscriptionContractUpdateJobTest extends TestCase
{
    public function test_it_publishes_a_contract_update_event_to_the_stream(): void
    {
        $payload = new stdClass;
        $payload->id = 456;

        $job = new SubscriptionContractUpdateJob('example-shop.myshopify.com', $payload);
        $job->handle(app(SubscriptionContractStream::class));

        $event = app(SubscriptionContractStream::class)->latest('example-shop.myshopify.com');

        $this->assertIsArray($event);
        $this->assertSame('subscription_contracts/update', $event['topic']);
        $this->assertSame('gid://shopify/SubscriptionContract/456', $event['contractId']);
        $this->assertSame('example-shop.myshopify.com', $event['shop']);
    }
}

<?php

namespace Tests\Unit;

use App\Support\SubscriptionContractStream;
use Illuminate\Support\Str;
use Tests\TestCase;

class SubscriptionContractStreamTest extends TestCase
{
    public function test_it_returns_the_latest_event_for_a_shop(): void
    {
        $stream = app(SubscriptionContractStream::class);

        $publishedEvent = $stream->publish(
            'example-shop.myshopify.com',
            'subscription_contracts/update',
            'gid://shopify/SubscriptionContract/'.Str::random(6),
        );

        $latestEvent = $stream->latest('example-shop.myshopify.com');

        $this->assertSame($publishedEvent, $latestEvent);
    }
}

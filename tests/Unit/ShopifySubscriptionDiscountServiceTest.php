<?php

namespace Tests\Unit;

use App\Services\ShopifySubscriptionDiscountService;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class ShopifySubscriptionDiscountServiceTest extends TestCase
{
    #[Test]
    public function it_returns_default_configuration(): void
    {
        $service = new ShopifySubscriptionDiscountService;

        $this->assertSame([
            'id' => null,
            'title' => 'Subscription discount',
            'enabled' => true,
            'percentage' => 10.0,
            'message' => 'Subscription discount',
        ], $service->defaultConfiguration());
    }

    #[Test]
    public function it_normalizes_stored_configuration(): void
    {
        $service = new ShopifySubscriptionDiscountService;
        $method = new ReflectionMethod($service, 'decodeConfiguration');

        $configuration = $method->invoke($service, json_encode([
            'enabled' => true,
            'percentage' => 250,
            'message' => '  Subscribe and save  ',
        ], JSON_THROW_ON_ERROR));

        $this->assertSame([
            'enabled' => true,
            'percentage' => 100.0,
            'message' => 'Subscribe and save',
        ], $configuration);
    }

    #[Test]
    public function it_uses_defaults_for_invalid_stored_configuration(): void
    {
        $service = new ShopifySubscriptionDiscountService;
        $method = new ReflectionMethod($service, 'decodeConfiguration');

        $configuration = $method->invoke($service, '{invalid-json');

        $this->assertSame([
            'enabled' => true,
            'percentage' => 10.0,
            'message' => 'Subscription discount',
        ], $configuration);
    }
}

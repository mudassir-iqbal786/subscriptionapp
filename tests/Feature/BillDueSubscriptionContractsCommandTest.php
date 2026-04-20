<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ShopifyContractService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class BillDueSubscriptionContractsCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_it_creates_billing_attempts_for_due_active_subscription_contracts(): void
    {
        Carbon::setTestNow('2026-04-20 10:00:00');

        User::factory()->create([
            'name' => 'example-shop.myshopify.com',
        ]);

        $service = Mockery::mock(ShopifyContractService::class);
        $service->shouldReceive('getBillableContracts')
            ->once()
            ->with(Mockery::type(User::class), 100)
            ->andReturn(collect([
                [
                    'id' => 'gid://shopify/SubscriptionContract/123',
                    'status' => 'Active',
                    'nextBillingDate' => '2026-04-20T00:00:00Z',
                    'billingPolicy' => [
                        'interval' => 'MONTH',
                        'intervalCount' => 1,
                    ],
                ],
                [
                    'id' => 'gid://shopify/SubscriptionContract/456',
                    'status' => 'Active',
                    'nextBillingDate' => '2026-04-21T00:00:00Z',
                    'billingPolicy' => [
                        'interval' => 'MONTH',
                        'intervalCount' => 1,
                    ],
                ],
                [
                    'id' => 'gid://shopify/SubscriptionContract/789',
                    'status' => 'Canceled',
                    'nextBillingDate' => '2026-04-19T00:00:00Z',
                    'billingPolicy' => [
                        'interval' => 'MONTH',
                        'intervalCount' => 1,
                    ],
                ],
            ]));
        $service->shouldReceive('createBillingAttempt')
            ->once()
            ->with(
                Mockery::type(User::class),
                'gid://shopify/SubscriptionContract/123',
                Mockery::pattern('/^subscription-billing-[a-f0-9]{40}$/'),
                Mockery::on(fn (CarbonInterface $date): bool => $date->toDateString() === '2026-04-20')
            )
            ->andReturn([
                'id' => 'gid://shopify/SubscriptionBillingAttempt/1',
                'ready' => false,
            ]);
        $service->shouldReceive('calculateFollowingBillingDate')
            ->once()
            ->andReturn(Carbon::parse('2026-05-20T00:00:00Z'));
        $service->shouldReceive('setNextBillingDate')
            ->once()
            ->with(
                Mockery::type(User::class),
                'gid://shopify/SubscriptionContract/123',
                Mockery::on(fn (CarbonInterface $date): bool => $date->toDateString() === '2026-05-20')
            )
            ->andReturn([
                'id' => 'gid://shopify/SubscriptionContract/123',
                'nextBillingDate' => '2026-05-20T00:00:00Z',
            ]);

        $this->app->instance(ShopifyContractService::class, $service);

        $this->artisan('subscriptions:bill-due')
            ->expectsOutputToContain('Billing attempt gid://shopify/SubscriptionBillingAttempt/1 created')
            ->assertExitCode(0);
    }

    public function test_it_can_run_without_charging_in_dry_run_mode(): void
    {
        Carbon::setTestNow('2026-04-20 10:00:00');

        User::factory()->create([
            'name' => 'example-shop.myshopify.com',
        ]);

        $service = Mockery::mock(ShopifyContractService::class);
        $service->shouldReceive('getBillableContracts')
            ->once()
            ->andReturn(collect([
                [
                    'id' => 'gid://shopify/SubscriptionContract/123',
                    'status' => 'Active',
                    'nextBillingDate' => '2026-04-20T00:00:00Z',
                ],
            ]));
        $service->shouldNotReceive('createBillingAttempt');
        $service->shouldNotReceive('setNextBillingDate');

        $this->app->instance(ShopifyContractService::class, $service);

        $this->artisan('subscriptions:bill-due --dry-run')
            ->expectsOutputToContain('Due: example-shop.myshopify.com gid://shopify/SubscriptionContract/123')
            ->assertExitCode(0);
    }
}

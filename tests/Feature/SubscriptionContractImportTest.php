<?php

namespace Tests\Feature;

use App\Models\ImportedSubscriptionContract;
use App\Models\User;
use App\Services\ShopifyContractService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Mockery;
use Osiset\ShopifyApp\Http\Middleware\VerifyShopify;
use Tests\TestCase;

class SubscriptionContractImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_imports_subscription_contracts_from_the_csv_template(): void
    {
        $user = User::factory()->create();

        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->post('/api/contracts/import', [
            'file' => UploadedFile::fake()->createWithContent('contracts.csv', <<<'CSV'
handle,upcoming_billing_date,customer_id,currency_code,status,cadence_interval,cadence_interval_count,customer_payment_method_id,delivery_price,delivery_method_type,delivery_address_first_name,delivery_address_last_name,delivery_address_address1,delivery_address_address2,delivery_address_city,delivery_address_province_code,delivery_address_country_code,delivery_address_company,delivery_address_zip,delivery_address_phone,delivery_local_delivery_phone,delivery_local_delivery_instructions,delivery_pickup_method_location_id,line_variant_id,line_quantity,line_current_price,line_selling_plan_id,line_selling_plan_name
Example-beverage-contract,2024-04-12T17:00:00Z,6320530986896,USD,ACTIVE,MONTH,3,24e8c839c47ef47d30ad28346d130e74,0,SHIPPING,Jane,Doe,2470 Bedford Ave,,Buffalo,NY,US,,11226,,,,,53154087005812,1,50,3607724288,"Subscription, delivery every 3 months, save 10%"
Example-beverage-contract,,,,,,,,,,,,,,,,,,,,,,,53174099004429,1,60,3607724288,"Subscription, delivery every 3 months, save 10%"
CSV),
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('contracts.0.displayId', 'Example-beverage-contract')
            ->assertJsonPath('contracts.0.customer.name', 'Jane Doe')
            ->assertJsonPath('contracts.0.amount', '$110.00')
            ->assertJsonPath('contracts.0.deliveryFrequency', 'Every 3 months');

        $this->assertDatabaseHas('imported_subscription_contracts', [
            'user_id' => $user->id,
            'handle' => 'Example-beverage-contract',
            'customer_name' => 'Jane Doe',
            'amount' => '$110.00',
            'status' => 'Active',
        ]);
    }

    public function test_contracts_index_includes_imported_contracts(): void
    {
        $user = User::factory()->create();
        ImportedSubscriptionContract::factory()->create([
            'user_id' => $user->id,
            'handle' => 'Example-beauty-contract',
        ]);
        $service = Mockery::mock(ShopifyContractService::class);
        $service->shouldReceive('getContracts')->once()->andReturn(collect());
        $service->shouldReceive('mapImportedContract')->once()->andReturnUsing(
            fn (ImportedSubscriptionContract $contract): array => [
                'id' => "imported-{$contract->handle}",
                'displayId' => $contract->handle,
                'customer' => [
                    'name' => $contract->customer_name,
                ],
                'plan' => $contract->plan_name,
                'amount' => $contract->amount,
                'deliveryFrequency' => $contract->delivery_frequency,
                'status' => $contract->status,
                'isImported' => true,
            ]
        );
        $this->app->instance(ShopifyContractService::class, $service);

        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->getJson('/api/contracts');

        $response
            ->assertOk()
            ->assertJsonPath('contracts.0.displayId', 'Example-beauty-contract')
            ->assertJsonPath('contracts.0.isImported', true);
    }

    public function test_contracts_index_reports_pagination_metadata_for_additional_pages(): void
    {
        $user = User::factory()->create();

        ImportedSubscriptionContract::factory()->create([
            'user_id' => $user->id,
            'handle' => 'contract-one',
        ]);
        ImportedSubscriptionContract::factory()->create([
            'user_id' => $user->id,
            'handle' => 'contract-two',
        ]);

        $service = Mockery::mock(ShopifyContractService::class);
        $service->shouldReceive('getContracts')->twice()->andReturn(collect());
        $service->shouldReceive('mapImportedContract')->times(4)->andReturnUsing(
            fn (ImportedSubscriptionContract $contract): array => [
                'id' => "imported-{$contract->handle}",
                'displayId' => $contract->handle,
                'customer' => [
                    'name' => $contract->customer_name,
                ],
                'plan' => $contract->plan_name,
                'amount' => $contract->amount,
                'deliveryFrequency' => $contract->delivery_frequency,
                'status' => $contract->status,
                'isImported' => true,
            ]
        );
        $this->app->instance(ShopifyContractService::class, $service);

        $this->withoutMiddleware(VerifyShopify::class);

        $firstPageResponse = $this->actingAs($user)->getJson('/api/contracts?perPage=1&page=1');
        $secondPageResponse = $this->actingAs($user)->getJson('/api/contracts?perPage=1&page=2');

        $firstPageResponse
            ->assertOk()
            ->assertJsonPath('contracts.0.displayId', 'contract-one')
            ->assertJsonPath('pagination.hasNextPage', true)
            ->assertJsonPath('pagination.page', 1)
            ->assertJsonPath('pagination.perPage', 1);

        $secondPageResponse
            ->assertOk()
            ->assertJsonPath('contracts.0.displayId', 'contract-two')
            ->assertJsonPath('pagination.hasNextPage', false)
            ->assertJsonPath('pagination.page', 2)
            ->assertJsonPath('pagination.perPage', 1);
    }

    public function test_it_validates_that_a_csv_file_is_uploaded(): void
    {
        $user = User::factory()->create();

        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->postJson('/api/contracts/import', []);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }
}

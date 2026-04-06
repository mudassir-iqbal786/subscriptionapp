<?php

namespace Tests\Feature;

use App\Models\ImportedSubscriptionContract;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Osiset\ShopifyApp\Http\Middleware\VerifyShopify;
use Tests\TestCase;

class SubscriptionContractDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_imported_contract_detail_from_the_app_database(): void
    {
        $user = User::factory()->create();

        ImportedSubscriptionContract::factory()->create([
            'user_id' => $user->id,
            'handle' => 'Example-beverage-contract',
            'customer_name' => 'Jane Doe',
            'plan_name' => 'Subscription, delivery every 3 months, save 10%',
            'amount' => '$110.00',
            'amount_value' => 110,
            'currency_code' => 'USD',
            'status' => 'Active',
            'delivery_frequency' => 'Every 3 months',
            'payload' => [
                'handle' => 'Example-beverage-contract',
                'rows' => [
                    [
                        'upcoming_billing_date' => '2024-04-12T17:00:00Z',
                        'delivery_method_type' => 'SHIPPING',
                        'delivery_address_first_name' => 'Jane',
                        'delivery_address_last_name' => 'Doe',
                        'delivery_address_address1' => '2470 Bedford Ave',
                        'delivery_address_city' => 'Buffalo',
                        'delivery_address_province_code' => 'NY',
                        'delivery_address_country_code' => 'US',
                        'delivery_address_zip' => '11226',
                        'line_variant_id' => '53154087005812',
                        'line_quantity' => '1',
                        'line_current_price' => '50',
                        'line_selling_plan_name' => 'Subscription, delivery every 3 months, save 10%',
                    ],
                ],
            ],
        ]);

        $this->withoutMiddleware(VerifyShopify::class);

        $response = $this->actingAs($user)->getJson('/api/contracts/imported-Example-beverage-contract');

        $response
            ->assertOk()
            ->assertJsonPath('contract.displayId', 'Example-beverage-contract')
            ->assertJsonPath('contract.isImported', true)
            ->assertJsonPath('contract.customer.name', 'Jane Doe')
            ->assertJsonPath('contract.deliveryMethod.type', 'Imported by CSV')
            ->assertJsonPath('contract.lineItems.0.quantity', '1');
    }
}

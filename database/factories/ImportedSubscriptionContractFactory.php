<?php

namespace Database\Factories;

use App\Models\ImportedSubscriptionContract;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ImportedSubscriptionContract>
 */
class ImportedSubscriptionContractFactory extends Factory
{
    protected $model = ImportedSubscriptionContract::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'handle' => 'Example-beverage-contract',
            'customer_name' => 'Jane Doe',
            'plan_name' => 'Subscription, delivery every 3 months, save 10%',
            'amount' => '$110.00',
            'amount_value' => 110,
            'currency_code' => 'USD',
            'status' => 'Active',
            'delivery_frequency' => 'Every 3 months',
            'payload' => ['handle' => 'Example-beverage-contract'],
        ];
    }
}

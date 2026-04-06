<?php

namespace Database\Factories;

use App\Models\SubscriptionSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SubscriptionSetting>
 */
class SubscriptionSettingFactory extends Factory
{
    protected $model = SubscriptionSetting::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'payment_method_retry_attempts' => 3,
            'payment_method_retry_days' => 7,
            'payment_method_failed_action' => 'cancel',
            'inventory_retry_attempts' => 5,
            'inventory_retry_days' => 1,
            'inventory_failed_action' => 'skip',
            'inventory_staff_notifications' => 'weekly',
        ];
    }
}

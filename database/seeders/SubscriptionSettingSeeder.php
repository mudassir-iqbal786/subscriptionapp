<?php

namespace Database\Seeders;

use App\Models\SubscriptionSetting;
use Illuminate\Database\Seeder;

class SubscriptionSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        SubscriptionSetting::factory()->count(5)->create();
    }
}

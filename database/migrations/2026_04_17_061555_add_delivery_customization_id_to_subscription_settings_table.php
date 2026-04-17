<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subscription_settings', function (Blueprint $table) {
            $table->string('delivery_customization_id')->nullable()->after('subscription_discount_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscription_settings', function (Blueprint $table) {
            $table->dropColumn('delivery_customization_id');
        });
    }
};

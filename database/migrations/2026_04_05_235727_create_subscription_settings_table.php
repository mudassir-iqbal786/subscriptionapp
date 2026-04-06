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
        Schema::create('subscription_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();
            $table->unsignedTinyInteger('payment_method_retry_attempts')->default(3);
            $table->unsignedTinyInteger('payment_method_retry_days')->default(7);
            $table->string('payment_method_failed_action')->default('cancel');
            $table->unsignedTinyInteger('inventory_retry_attempts')->default(5);
            $table->unsignedTinyInteger('inventory_retry_days')->default(1);
            $table->string('inventory_failed_action')->default('skip');
            $table->string('inventory_staff_notifications')->default('weekly');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_settings');
    }
};

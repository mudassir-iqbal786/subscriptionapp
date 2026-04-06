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
        Schema::create('imported_subscription_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('handle');
            $table->string('customer_name');
            $table->string('plan_name');
            $table->string('amount');
            $table->decimal('amount_value', 10, 2)->default(0);
            $table->string('currency_code', 3)->default('USD');
            $table->string('status');
            $table->string('delivery_frequency');
            $table->json('payload');
            $table->timestamps();

            $table->unique(['user_id', 'handle']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('imported_subscription_contracts');
    }
};

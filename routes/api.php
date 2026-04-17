<?php

use App\Http\Controllers\CheckoutExtensionController;
use App\Http\Controllers\CustomerAccountSubscriptionController;
use App\Http\Controllers\DeliveryCustomizationController;
use App\Http\Controllers\ShopifyContractController;
use App\Http\Controllers\ShopifyMetaobjectController;
use App\Http\Controllers\ShopifyProductSearchController;
use App\Http\Controllers\SubscriptionDiscountController;
use App\Http\Controllers\SubscriptionPlanPageController;
use App\Http\Controllers\SubscriptionSettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'API is available.',
    ]);
});

Route::middleware(['verify.shopify'])->group(function (): void {
    Route::get('/get-products', [ShopifyProductSearchController::class, 'index']);
    Route::get('/search-products', [ShopifyProductSearchController::class, 'search']);
    Route::post('/checkout/shipping-profiles', [CheckoutExtensionController::class, 'shippingProfiles']);
    Route::post('/customer-account/subscriptions', [CustomerAccountSubscriptionController::class, 'index']);
    Route::post('/metaobjects/subscription', [ShopifyMetaobjectController::class, 'store']);
    Route::get('/delivery-customization', [DeliveryCustomizationController::class, 'show']);
    Route::put('/delivery-customization', [DeliveryCustomizationController::class, 'update']);
    Route::get('/subscription-discount', [SubscriptionDiscountController::class, 'show']);
    Route::put('/subscription-discount', [SubscriptionDiscountController::class, 'update']);
    Route::get('/contracts', [ShopifyContractController::class, 'index']);
    Route::post('/contracts/import', [ShopifyContractController::class, 'import']);
    Route::get('/contracts/{contractId}', [ShopifyContractController::class, 'show'])->where('contractId', '.*');
    Route::post('/contracts/{contractId}/cancel', [ShopifyContractController::class, 'cancel'])->where('contractId', '.*');
    Route::post('/contracts/{contractId}/pause', [ShopifyContractController::class, 'pause'])->where('contractId', '.*');
    Route::post('/contracts/{contractId}/resume', [ShopifyContractController::class, 'resume'])->where('contractId', '.*');
    Route::get('/settings', [SubscriptionSettingsController::class, 'show']);
    Route::put('/settings', [SubscriptionSettingsController::class, 'update']);
    Route::get('/plan-detail', [SubscriptionPlanPageController::class, 'show']);
    Route::post('/create-plan', [SubscriptionPlanPageController::class, 'store']);
    Route::post('/update-plan', [SubscriptionPlanPageController::class, 'update']);
    Route::delete('/delete-plan', [SubscriptionPlanPageController::class, 'destroy']);
    Route::post('/getplans', [SubscriptionPlanPageController::class, 'getPlans']);
});

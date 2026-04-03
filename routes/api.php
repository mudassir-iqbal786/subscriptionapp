<?php

use App\Http\Controllers\ShopifyProductSearchController;
use App\Http\Controllers\SubscriptionPlanPageController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'API is available.',
    ]);
});

Route::middleware(['verify.shopify'])->group(function (): void {
    Route::get('/get-products', [ShopifyProductSearchController::class, 'index']);
    Route::get('/search-products', [ShopifyProductSearchController::class, 'search']);
    Route::get('/plan-detail', [SubscriptionPlanPageController::class, 'show']);
    Route::post('/create-plan', [SubscriptionPlanPageController::class, 'store']);
    Route::post('/update-plan', [SubscriptionPlanPageController::class, 'update']);
    Route::delete('/delete-plan', [SubscriptionPlanPageController::class, 'destroy']);
    Route::post('/getplans', [SubscriptionPlanPageController::class, 'getPlans']);
});

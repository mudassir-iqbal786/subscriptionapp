<?php

use App\Http\Controllers\SubscriptionPlanPageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['verify.shopify'])->group(function (): void {
    Route::view('/', 'app')->name('home');
    Route::view('/plans', 'app')->name('plans');
    Route::get('/plans/create', [SubscriptionPlanPageController::class, 'create'])->name('plans.create');
    Route::view('/plans/description', 'app')->name('plans.description');
    Route::view('/contracts', 'app')->name('contracts');
    Route::view('/contracts/detail', 'app')->name('contracts.detail');
    Route::view('/settings', 'app')->name('settings');
});

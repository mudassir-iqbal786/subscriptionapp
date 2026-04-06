<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['verify.shopify'])->group(function (): void {
    Route::view('/', 'app')->name('home');
    Route::view('/plans', 'app')->name('plans');
    Route::view('/plans/create', 'app')->name('plans.create');
    Route::view('/plans/description/{planId}', 'app')->where('planId', '.*')->name('plans.description');
    Route::view('/contracts', 'app')->name('contracts');
    Route::view('/contracts/detail/{contractId}', 'app')->where('contractId', '.*')->name('contracts.detail');
    Route::view('/settings', 'app')->name('settings');
});

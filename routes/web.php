<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'app')->name('home');
Route::view('/plans', 'app')->name('plans');
Route::view('/contracts', 'app')->name('contracts');
Route::view('/settings', 'app')->name('settings');
//    ->middleware(['verify.shopify']);

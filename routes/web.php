<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'app')->name('home');
//    ->middleware(['verify.shopify']);

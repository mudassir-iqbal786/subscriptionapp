<?php

use App\Http\Controllers\ShopifyContractController;
use App\Http\Controllers\ShopifyWebhookController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['verify.shopify'])->group(function (): void {
    Route::view('/', 'app')->name('home');
    Route::view('/plans', 'app')->name('plans');
    Route::view('/metaobject', 'app')->name('pra');
    Route::view('/plans/create', 'app')->name('plans.create');
    Route::view('/plans/description/{planId}', 'app')->where('planId', '.*')->name('plans.description');
    Route::view('/contracts', 'app')->name('contracts');
    Route::view('/contracts/detail/{contractId}', 'app')->where('contractId', '.*')->name('contracts.detail');
    Route::view('/delivery-customization/create', 'app')->name('delivery-customization.create');
    Route::view('/delivery-customization/{deliveryCustomizationId}', 'app')->where('deliveryCustomizationId', '.*')->name('delivery-customization.details');
    Route::get('/contracts/stream', [ShopifyContractController::class, 'stream'])->name('contracts.stream');
    Route::post('/webhooks/shopify/contract-create', [ShopifyWebhookController::class, 'contractCreate']);

    Route::get('/subscriptions', function (Request $request) {
        $contractId = (string) $request->query('id', '');

        abort_if($contractId === '', 404);

        $query = [];

        foreach (['shop', 'host', 'locale'] as $parameter) {
            $value = $request->query($parameter);

            if (is_string($value) && $value !== '') {
                $query[$parameter] = $value;
            }
        }

        $target = '/contracts/detail/'.rawurlencode($contractId);

        if ($query !== []) {
            $target .= '?'.http_build_query($query);
        }

        return redirect($target);
    })->name('subscriptions.redirect');
    Route::view('/settings', 'app')->name('settings');
});

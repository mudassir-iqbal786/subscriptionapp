<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSubscriptionSettingsRequest;
use App\Models\SubscriptionSetting;
use App\Services\ShopifySubscriptionSettingsService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class SubscriptionSettingsController extends Controller
{
    public function show(ShopifySubscriptionSettingsService $shopifySubscriptionSettingsService): JsonResponse
    {
        $user = request()->user();
        $setting = $user?->subscriptionSetting;

        if ($user !== null && $setting === null) {
            try {
                $shopifySettings = $shopifySubscriptionSettingsService->fetchSettings($user);
            } catch (RuntimeException) {
                $shopifySettings = null;
            }

            if (is_array($shopifySettings)) {
                $setting = $user->subscriptionSetting()->create([
                    'payment_method_retry_attempts' => $shopifySettings['paymentMethodFailure']['retryAttempts'] ?? SubscriptionSetting::defaults()['payment_method_retry_attempts'],
                    'payment_method_retry_days' => $shopifySettings['paymentMethodFailure']['retryDays'] ?? SubscriptionSetting::defaults()['payment_method_retry_days'],
                    'payment_method_failed_action' => $shopifySettings['paymentMethodFailure']['failedAction'] ?? SubscriptionSetting::defaults()['payment_method_failed_action'],
                    'inventory_retry_attempts' => $shopifySettings['inventoryFailure']['retryAttempts'] ?? SubscriptionSetting::defaults()['inventory_retry_attempts'],
                    'inventory_retry_days' => $shopifySettings['inventoryFailure']['retryDays'] ?? SubscriptionSetting::defaults()['inventory_retry_days'],
                    'inventory_failed_action' => $shopifySettings['inventoryFailure']['failedAction'] ?? SubscriptionSetting::defaults()['inventory_failed_action'],
                    'inventory_staff_notifications' => $shopifySettings['inventoryFailure']['staffNotifications'] ?? SubscriptionSetting::defaults()['inventory_staff_notifications'],
                ]);
            }
        }

        return response()->json([
            'message' => 'Subscription settings fetched successfully.',
            'settings' => $this->transformSettings($setting),
        ]);
    }

    public function update(UpdateSubscriptionSettingsRequest $request, ShopifySubscriptionSettingsService $shopifySubscriptionSettingsService): JsonResponse
    {
        $validated = $request->validated();
        $remoteSettings = [
            'paymentMethodFailure' => [
                'retryAttempts' => $validated['paymentMethodFailure']['retryAttempts'],
                'retryDays' => $validated['paymentMethodFailure']['retryDays'],
                'failedAction' => $validated['paymentMethodFailure']['failedAction'],
            ],
            'inventoryFailure' => [
                'retryAttempts' => $validated['inventoryFailure']['retryAttempts'],
                'retryDays' => $validated['inventoryFailure']['retryDays'],
                'failedAction' => $validated['inventoryFailure']['failedAction'],
                'staffNotifications' => $validated['inventoryFailure']['staffNotifications'],
            ],
        ];

        try {
            $shopifySubscriptionSettingsService->syncSettings($request->user(), $remoteSettings);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $setting = $request->user()->subscriptionSetting()->updateOrCreate(
            [],
            [
                'payment_method_retry_attempts' => $validated['paymentMethodFailure']['retryAttempts'],
                'payment_method_retry_days' => $validated['paymentMethodFailure']['retryDays'],
                'payment_method_failed_action' => $validated['paymentMethodFailure']['failedAction'],
                'inventory_retry_attempts' => $validated['inventoryFailure']['retryAttempts'],
                'inventory_retry_days' => $validated['inventoryFailure']['retryDays'],
                'inventory_failed_action' => $validated['inventoryFailure']['failedAction'],
                'inventory_staff_notifications' => $validated['inventoryFailure']['staffNotifications'],
            ]
        );

        return response()->json([
            'message' => 'Subscription settings updated successfully.',
            'settings' => $this->transformSettings($setting),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformSettings(?SubscriptionSetting $setting): array
    {
        $defaults = SubscriptionSetting::defaults();
        $managementUrl = (string) config('shopify-app.subscription_management_settings_url', '');

        return [
            'paymentMethodFailure' => [
                'retryAttempts' => $setting?->payment_method_retry_attempts ?? $defaults['payment_method_retry_attempts'],
                'retryDays' => $setting?->payment_method_retry_days ?? $defaults['payment_method_retry_days'],
                'failedAction' => $setting?->payment_method_failed_action ?? $defaults['payment_method_failed_action'],
            ],
            'inventoryFailure' => [
                'retryAttempts' => $setting?->inventory_retry_attempts ?? $defaults['inventory_retry_attempts'],
                'retryDays' => $setting?->inventory_retry_days ?? $defaults['inventory_retry_days'],
                'failedAction' => $setting?->inventory_failed_action ?? $defaults['inventory_failed_action'],
                'staffNotifications' => $setting?->inventory_staff_notifications ?? $defaults['inventory_staff_notifications'],
            ],
            'managementUrl' => $managementUrl,
            'setupProgress' => [
                'accountAccessEnabled' => $managementUrl !== '',
                'notificationsCustomized' => $setting !== null,
            ],
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSubscriptionDiscountRequest;
use App\Services\ShopifySubscriptionDiscountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class SubscriptionDiscountController extends Controller
{
    public function show(Request $request, ShopifySubscriptionDiscountService $service): JsonResponse
    {
        $shop = $request->user();
        $discountId = (string) ($request->query('discountId') ?: $shop?->subscriptionSetting?->subscription_discount_id ?: '');

        if ($discountId === '') {
            try {
                $subscriptionDiscount = $service->findExisting($shop);
            } catch (RuntimeException) {
                $subscriptionDiscount = null;
            }

            if (is_array($subscriptionDiscount)) {
                $shop->subscriptionSetting()->updateOrCreate(
                    [],
                    [
                        'subscription_discount_id' => $subscriptionDiscount['id'],
                    ]
                );

                return response()->json([
                    'message' => 'Subscription discount fetched successfully.',
                    'subscriptionDiscount' => $subscriptionDiscount,
                ]);
            }

            return response()->json([
                'message' => 'Subscription discount defaults fetched successfully.',
                'subscriptionDiscount' => $service->defaultConfiguration(),
            ]);
        }

        try {
            $subscriptionDiscount = $service->get($shop, $discountId);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Subscription discount fetched successfully.',
            'subscriptionDiscount' => $subscriptionDiscount,
        ]);
    }

    public function update(UpdateSubscriptionDiscountRequest $request, ShopifySubscriptionDiscountService $service): JsonResponse
    {
        try {
            $subscriptionDiscount = $service->save($request->user(), $request->validated());
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        if (($subscriptionDiscount['id'] ?? '') !== '') {
            $request->user()->subscriptionSetting()->updateOrCreate(
                [],
                [
                    'subscription_discount_id' => $subscriptionDiscount['id'],
                ]
            );
        }

        return response()->json([
            'message' => 'Subscription discount saved successfully.',
            'subscriptionDiscount' => $subscriptionDiscount,
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateDeliveryCustomizationRequest;
use App\Services\ShopifyDeliveryCustomizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class DeliveryCustomizationController extends Controller
{
    public function show(Request $request, ShopifyDeliveryCustomizationService $service): JsonResponse
    {
        $shop = $request->user();
        $deliveryCustomizationId = (string) ($request->query('deliveryCustomizationId') ?: $shop?->subscriptionSetting?->delivery_customization_id ?: '');

        if ($deliveryCustomizationId === '') {
            try {
                $deliveryCustomization = $service->findExisting($shop);
            } catch (RuntimeException) {
                $deliveryCustomization = null;
            }

            if (is_array($deliveryCustomization)) {
                $shop->subscriptionSetting()->updateOrCreate(
                    [],
                    [
                        'delivery_customization_id' => $deliveryCustomization['id'],
                    ]
                );

                return response()->json([
                    'message' => 'Delivery customization fetched successfully.',
                    'deliveryCustomization' => $deliveryCustomization,
                ]);
            }

            return response()->json([
                'message' => 'Delivery customization defaults fetched successfully.',
                'deliveryCustomization' => $service->defaultConfiguration(),
            ]);
        }

        try {
            $deliveryCustomization = $service->get($shop, $deliveryCustomizationId);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Delivery customization fetched successfully.',
            'deliveryCustomization' => $deliveryCustomization,
        ]);
    }

    public function update(UpdateDeliveryCustomizationRequest $request, ShopifyDeliveryCustomizationService $service): JsonResponse
    {
        try {
            $deliveryCustomization = $service->save($request->user(), $request->validated());
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        if (($deliveryCustomization['id'] ?? '') !== '') {
            $request->user()->subscriptionSetting()->updateOrCreate(
                [],
                [
                    'delivery_customization_id' => $deliveryCustomization['id'],
                ]
            );
        }

        return response()->json([
            'message' => 'Delivery customization saved successfully.',
            'deliveryCustomization' => $deliveryCustomization,
        ]);
    }
}

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
        $deliveryCustomizationId = (string) $request->query('deliveryCustomizationId', '');

        if ($deliveryCustomizationId === '') {
            return response()->json([
                'message' => 'Delivery customization defaults fetched successfully.',
                'deliveryCustomization' => $service->defaultConfiguration(),
            ]);
        }

        try {
            $deliveryCustomization = $service->get($request->user(), $deliveryCustomizationId);
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

        return response()->json([
            'message' => 'Delivery customization saved successfully.',
            'deliveryCustomization' => $deliveryCustomization,
        ]);
    }
}

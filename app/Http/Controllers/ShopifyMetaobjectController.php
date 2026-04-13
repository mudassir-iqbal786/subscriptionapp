<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreShopifyMetaobjectRequest;
use App\Services\ShopifyMetaobjectService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class ShopifyMetaobjectController extends Controller
{
    public function store(StoreShopifyMetaobjectRequest $request, ShopifyMetaobjectService $shopifyMetaobjectService): JsonResponse
    {
        try {
            $metaobject = $shopifyMetaobjectService->createSubscriptionMetaobject(
                $request->user(),
                $request->validated()
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Metaobject created successfully.',
            'metaobject' => $metaobject,
        ], 201);
    }
}

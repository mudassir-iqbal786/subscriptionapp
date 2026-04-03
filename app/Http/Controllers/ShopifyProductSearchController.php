<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchShopifyProductsRequest;
use App\Services\ShopifyProductService;
use Illuminate\Http\JsonResponse;

class ShopifyProductSearchController extends Controller
{
    public function index(
        SearchShopifyProductsRequest $request,
        ShopifyProductService $shopifyProductService
    ): JsonResponse {
        return response()->json([
            'products' => $shopifyProductService->searchProducts(
                $request->user(),
                null,
                (int) ($request->validated('limit') ?? 12)
            ),
        ]);
    }

    public function search(
        SearchShopifyProductsRequest $request,
        ShopifyProductService $shopifyProductService
    ): JsonResponse {
        return response()->json([
            'products' => $shopifyProductService->searchProducts(
                $request->user(),
                $request->validated('query'),
                (int) ($request->validated('limit') ?? 12)
            ),
        ]);
    }
}

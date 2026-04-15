<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSubscriptionPlanRequest;
use App\Http\Requests\UpdateSubscriptionPlanRequest;
use App\Services\ShopifyPlanServices;
use App\Services\ShopifyProductService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class SubscriptionPlanPageController extends Controller
{
    public function store(StoreSubscriptionPlanRequest $request, ShopifyProductService $shopifyProductService): JsonResponse
    {
        //        dd($request->all());
        $validated = $request->validated();

        try {
            $sellingPlanGroup = $shopifyProductService->createSellingPlanGroup(
                $request->user(),
                $validated
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Subscription plan created successfully.',
            'sellingPlanGroup' => $sellingPlanGroup,
        ]);
    }

    public function getPlans(ShopifyPlanServices $shopifyPlanServices): JsonResponse
    {
        $limit = min(max((int) request()->integer('limit', 12), 1), 50);
        $after = request()->filled('after') ? (string) request()->input('after') : null;
        $before = request()->filled('before') ? (string) request()->input('before') : null;

        try {
            $plansPage = $shopifyPlanServices->getPlansPage(request()->user(), $limit, $after, $before);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Plan Fetch successfully.',
            'sellingPlanGroup' => $plansPage['sellingPlanGroup'],
            'pagination' => $plansPage['pagination'],
        ]);
    }

    public function show(ShopifyPlanServices $shopifyPlanServices): JsonResponse
    {
        $planId = (string) request()->query('planId', '');

        try {
            $plan = $shopifyPlanServices->getPlan(request()->user(), $planId);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        if ($plan === null) {
            return response()->json([
                'message' => 'The selected subscription plan could not be found.',
            ], 404);
        }

        return response()->json([
            'message' => 'Plan fetched successfully.',
            'sellingPlanGroup' => $shopifyPlanServices->mapPlanDetail($plan),
        ]);
    }

    public function update(UpdateSubscriptionPlanRequest $request, ShopifyPlanServices $shopifyPlanServices): JsonResponse
    {
        try {
            $sellingPlanGroup = $shopifyPlanServices->updateSellingPlanGroup(
                $request->user(),
                $request->validated()
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Subscription plan updated successfully.',
            'sellingPlanGroup' => $sellingPlanGroup,
        ]);
    }

    public function destroy(ShopifyPlanServices $shopifyPlanServices): JsonResponse
    {
        $planId = (string) request()->input('planId', '');

        try {
            $deletedPlan = $shopifyPlanServices->deletePlanGroup(request()->user(), $planId);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Subscription plan deleted successfully.',
            'sellingPlanGroup' => $deletedPlan,
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\FetchCheckoutShippingProfilesRequest;
use App\Services\CheckoutShippingProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class CheckoutExtensionController extends Controller
{
    public function shippingProfiles(
        FetchCheckoutShippingProfilesRequest $request,
        CheckoutShippingProfileService $checkoutShippingProfileService
    ): JsonResponse {

        Log::info('Fetching shipping profiles', ['request' => $request->all()]);
        try {
            $profiles = $checkoutShippingProfileService->getProfilesForVariants(
                $request->user(),
                $request->validated('variantIds')
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Checkout shipping profiles fetched successfully.',
            'profiles' => $profiles,
        ]);
    }
}

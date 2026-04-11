<?php

namespace App\Http\Controllers;

use App\Http\Requests\FetchCustomerAccountSubscriptionsRequest;
use App\Services\ShopifyContractService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class CustomerAccountSubscriptionController extends Controller
{
    public function index(
        FetchCustomerAccountSubscriptionsRequest $request,
        ShopifyContractService $shopifyContractService
    ): JsonResponse {
        $customerId = (string) $request->validated('customerId');
        $customerNumericId = $this->numericShopifyId($customerId);

        try {
            $contracts = $shopifyContractService->getContracts($request->user(), 100);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $subscriptions = $contracts
            ->filter(function (array $contract) use ($customerId, $customerNumericId): bool {
                $contractCustomerId = (string) data_get($contract, 'customer.id', '');

                return $contractCustomerId === $customerId
                    || ($customerNumericId !== '' && $this->numericShopifyId($contractCustomerId) === $customerNumericId);
            })
            ->map(function (array $contract): array {
                return [
                    'id' => (string) data_get($contract, 'id', ''),
                    'displayId' => (string) data_get($contract, 'displayId', ''),
                    'status' => (string) data_get($contract, 'status', ''),
                    'plan' => (string) data_get($contract, 'plan', ''),
                    'nextOrder' => (string) data_get($contract, 'nextOrder', ''),
                    'amount' => (string) data_get($contract, 'amount', ''),
                    'deliveryFrequency' => (string) data_get($contract, 'deliveryFrequency', ''),
                    'productTitle' => (string) data_get($contract, 'productTitle', ''),
                    'productSubtitle' => (string) data_get($contract, 'productSubtitle', ''),
                    'productImageUrl' => (string) data_get($contract, 'productImageUrl', ''),
                    'quantity' => (string) data_get($contract, 'quantity', ''),
                    'lineItems' => collect(data_get($contract, 'lineItems', []))
                        ->filter(fn (mixed $lineItem): bool => is_array($lineItem))
                        ->map(fn (array $lineItem): array => [
                            'id' => (string) data_get($lineItem, 'id', ''),
                            'productTitle' => (string) data_get($lineItem, 'productTitle', data_get($lineItem, 'title', 'Subscription product')),
                            'subtitle' => (string) data_get($lineItem, 'subtitle', ''),
                            'imageUrl' => (string) data_get($lineItem, 'imageUrl', ''),
                            'quantity' => (string) data_get($lineItem, 'quantity', ''),
                            'unitPrice' => (string) data_get($lineItem, 'unitPrice', ''),
                            'total' => (string) data_get($lineItem, 'total', ''),
                            'sellingPlanName' => (string) data_get($lineItem, 'sellingPlanName', ''),
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->values();

        return response()->json([
            'message' => 'Customer subscriptions fetched successfully.',
            'subscriptions' => $subscriptions,
        ]);
    }

    private function numericShopifyId(string $shopifyId): string
    {
        if (preg_match('/(\d+)$/', $shopifyId, $matches) !== 1) {
            return '';
        }

        return $matches[1];
    }
}

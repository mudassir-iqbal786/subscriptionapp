<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportSubscriptionContractsRequest;
use App\Services\ShopifyContractService;
use App\Services\SubscriptionContractImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ShopifyContractController extends Controller
{
    public function index(Request $request, ShopifyContractService $shopifyContractService): JsonResponse
    {
        try {
            $contracts = $shopifyContractService->getContracts(
                $request->user(),
                (int) $request->integer('limit', 25)
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Contracts fetched successfully.',
            'contracts' => $request->user()
                ->importedSubscriptionContracts
                ->map(fn ($contract): array => $shopifyContractService->mapImportedContract($contract))
                ->concat($contracts)
                ->values(),
        ]);
    }

    public function import(
        ImportSubscriptionContractsRequest $request,
        SubscriptionContractImportService $subscriptionContractImportService,
        ShopifyContractService $shopifyContractService
    ): JsonResponse {
        try {
            $contracts = $subscriptionContractImportService->import(
                $request->user(),
                $request->file('file')
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Subscription contracts imported successfully.',
            'contracts' => $contracts
                ->map(fn ($contract): array => $shopifyContractService->mapImportedContract($contract))
                ->values(),
        ]);
    }

    public function show(string $contractId, Request $request, ShopifyContractService $shopifyContractService): JsonResponse
    {
        if (Str::startsWith($contractId, 'imported-')) {
            $handle = Str::after($contractId, 'imported-');
            $importedContract = $request->user()
                ->importedSubscriptionContracts()
                ->where('handle', $handle)
                ->first();

            if ($importedContract === null) {
                return response()->json([
                    'message' => 'The selected subscription contract could not be found.',
                ], 404);
            }

            return response()->json([
                'message' => 'Contract fetched successfully.',
                'contract' => $shopifyContractService->mapImportedContract($importedContract),
            ]);
        }

        try {
            $contract = $shopifyContractService->getContract(
                $request->user(),
                $contractId
            );
//            dd($contract);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        if ($contract === null) {
            return response()->json([
                'message' => 'The selected subscription contract could not be found.',
            ], 404);
        }

        return response()->json([
            'message' => 'Contract fetched successfully.',
            'contract' => $contract,
        ]);
    }

    public function cancel(string $contractId, Request $request, ShopifyContractService $shopifyContractService): JsonResponse
    {
        try {
            $contract = $shopifyContractService->cancelContract(
                $request->user(),
                $contractId
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        if ($contract === null) {
            return response()->json([
                'message' => 'The selected subscription contract could not be canceled.',
            ], 404);
        }

        return response()->json([
            'message' => 'Subscription canceled successfully.',
            'contract' => $contract,
        ]);
    }

    public function pause(string $contractId, Request $request): JsonResponse
    {
        if ($contractId === '') {
            return response()->json([
                'message' => 'The selected subscription contract could not be paused.',
            ], 404);
        }

        $response = $request->user()->api()->graph(
            <<<'GRAPHQL'
mutation PauseSubscriptionContract($subscriptionContractId: ID!) {
  subscriptionContractPause(subscriptionContractId: $subscriptionContractId) {
    contract {
      id
      status
      updatedAt
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'subscriptionContractId' => $contractId,
            ]
        );

        $body = $response['body'] ?? null;

        if (! is_array($body) && method_exists($body, 'toArray')) {
            try {
                $body = $body->toArray();
            } catch (Throwable) {
                $body = [];
            }
        }

        if (! is_array($body)) {
            $body = [];
        }

        $pausePayload = data_get($body, 'data.subscriptionContractPause');

        if (! is_array($pausePayload)) {
            return response()->json([
                'message' => 'Shopify did not return a pause response for the selected subscription contract.',
            ], 422);
        }

        $messages = collect(data_get($body, 'errors', []))
            ->map(function (mixed $error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify error.');
                }

                return (string) $error;
            })
            ->merge(
                collect(data_get($pausePayload, 'userErrors', []))
                    ->map(function (mixed $error): string {
                        if (is_array($error)) {
                            return (string) ($error['message'] ?? 'Unknown Shopify validation error.');
                        }

                        return (string) $error;
                    })
            )
            ->filter()
            ->values();

        if ($messages->isNotEmpty()) {
            $message = $messages->implode(' ');

            if (
                Str::contains($message, 'Access denied for customer field')
                || Str::contains($message, 'Access denied for orders field')
            ) {
                $message = 'Access denied for customer field. Required access: `read_customers` access scope. Access denied for orders field. Required access: `read_orders` access scope. Reinstall or re-authenticate the app after updating scopes.';
            } elseif (Str::contains($message, 'This app is not approved to access the SubscriptionContract object')) {
                $message = 'This app is not approved to access the SubscriptionContract object. See https://shopify.dev/docs/apps/launch/protected-customer-data for more details.';
            } elseif (
                Str::contains($message, [
                    'read_own_subscription_contracts',
                    'write_own_subscription_contracts',
                    'access scope',
                    'Access denied',
                ])
            ) {
                $message .= ' Update SHOPIFY_API_SCOPES to include read_own_subscription_contracts or write_own_subscription_contracts, then reinstall or re-authenticate the app.';
            }

            return response()->json([
                'message' => $message,
            ], 422);
        }

        return response()->json([
            'message' => 'Subscription paused successfully.',
            'contract' => data_get($pausePayload, 'contract'),
        ]);
    }

    public function resume(string $contractId, Request $request): JsonResponse
    {
        if ($contractId === '') {
            return response()->json([
                'message' => 'The selected subscription contract could not be resumed.',
            ], 404);
        }

        $response = $request->user()->api()->graph(
            <<<'GRAPHQL'
mutation ResumeSubscriptionContract($subscriptionContractId: ID!) {
  subscriptionContractActivate(subscriptionContractId: $subscriptionContractId) {
    contract {
      id
      status
      updatedAt
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'subscriptionContractId' => $contractId,
            ]
        );

        $body = $response['body'] ?? null;

        if (! is_array($body) && method_exists($body, 'toArray')) {
            try {
                $body = $body->toArray();
            } catch (Throwable) {
                $body = [];
            }
        }

        if (! is_array($body)) {
            $body = [];
        }

        $resumePayload = data_get($body, 'data.subscriptionContractActivate');

        if (! is_array($resumePayload)) {
            return response()->json([
                'message' => 'Shopify did not return a resume response for the selected subscription contract.',
            ], 422);
        }

        $messages = collect(data_get($body, 'errors', []))
            ->map(function (mixed $error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify error.');
                }

                return (string) $error;
            })
            ->merge(
                collect(data_get($resumePayload, 'userErrors', []))
                    ->map(function (mixed $error): string {
                        if (is_array($error)) {
                            return (string) ($error['message'] ?? 'Unknown Shopify validation error.');
                        }

                        return (string) $error;
                    })
            )
            ->filter()
            ->values();

        if ($messages->isNotEmpty()) {
            $message = $messages->implode(' ');

            if (
                Str::contains($message, 'Access denied for customer field')
                || Str::contains($message, 'Access denied for orders field')
            ) {
                $message = 'Access denied for customer field. Required access: `read_customers` access scope. Access denied for orders field. Required access: `read_orders` access scope. Reinstall or re-authenticate the app after updating scopes.';
            } elseif (Str::contains($message, 'This app is not approved to access the SubscriptionContract object')) {
                $message = 'This app is not approved to access the SubscriptionContract object. See https://shopify.dev/docs/apps/launch/protected-customer-data for more details.';
            } elseif (
                Str::contains($message, [
                    'read_own_subscription_contracts',
                    'write_own_subscription_contracts',
                    'access scope',
                    'Access denied',
                ])
            ) {
                $message .= ' Update SHOPIFY_API_SCOPES to include read_own_subscription_contracts or write_own_subscription_contracts, then reinstall or re-authenticate the app.';
            }

            return response()->json([
                'message' => $message,
            ], 422);
        }

        return response()->json([
            'message' => 'Subscription resumed successfully.',
            'contract' => data_get($resumePayload, 'contract'),
        ]);
    }
}

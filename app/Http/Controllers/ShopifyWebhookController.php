<?php

namespace App\Http\Controllers;

use App\Events\ContractCreated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ShopifyWebhookController extends Controller
{
    public function contractCreate(Request $request)
    {
        // Optional: verify webhook signature

        // 🚀 Just broadcast event (no DB storage)
        broadcast(new ContractCreated)->toOthers();

        return response()->json(['success' => true]);
    }


    public function getCatalogProduct(Request $request)
    {
        try {
            $query = $request->input('query', 'dresses');

            $tokenResponse = Http::asJson()->post('https://api.shopify.com/auth/access_token', [
                'grant_type' => 'client_credentials'
            ]);

            if (!$tokenResponse->successful()) {
                return response()->json([
                    'error' => 'Failed to get access token',
                    'details' => $tokenResponse->body()
                ], 500);
            }

            $token = $tokenResponse->json('access_token');

            $response = Http::withToken($token)
                ->acceptJson()
                ->get('https://discover.shopifyapps.com/global/v2/search/01kpfh3dtz5af0dnwq1hm5vsbp', [
                    'query' => $query,
                    'limit' => 10,
                    'min_price' => 1,
                    'max_price' => 4000,
                    'offset' => $request->input('offset', 0),
                ]);

            if (!$response->successful()) {
                return response()->json([
                    'error' => 'Shopify API failed',
                    'details' => $response->body()
                ], $response->status());
            }

            return response()->json($response->json());

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Server error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

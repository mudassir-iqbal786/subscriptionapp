<?php

namespace App\Http\Controllers;

use App\Events\ContractCreated;
use Illuminate\Http\Request;

class ShopifyWebhookController extends Controller
{
    public function contractCreate(Request $request)
    {
        // Optional: verify webhook signature

        // 🚀 Just broadcast event (no DB storage)
        broadcast(new ContractCreated)->toOthers();

        return response()->json(['success' => true]);
    }
}

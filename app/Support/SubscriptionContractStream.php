<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SubscriptionContractStream
{
    /**
     * @return array{id: string, contractId: ?string, topic: string, shop: string, occurredAt: string}
     */
    public function publish(string $shopDomain, string $topic, ?string $contractId = null): array
    {
        $event = [
            'id' => (string) Str::uuid(),
            'contractId' => $contractId,
            'topic' => $topic,
            'shop' => Str::lower(trim($shopDomain)),
            'occurredAt' => now()->toIso8601String(),
        ];

        Log::info(['SubscriptionContractStream', $event]);
        Cache::forever($this->cacheKey($shopDomain), $event);

        return $event;
    }

    /**
     * @return array{id: string, contractId: ?string, topic: string, shop: string, occurredAt: string}|null
     */
    public function latest(string $shopDomain): ?array
    {
        $event = Cache::get($this->cacheKey($shopDomain));

        return is_array($event) ? $event : null;
    }

    private function cacheKey(string $shopDomain): string
    {
        return 'subscription-contract-stream:'.sha1(Str::lower(trim($shopDomain)));
    }
}

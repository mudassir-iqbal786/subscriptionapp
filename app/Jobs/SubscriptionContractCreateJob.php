<?php

namespace App\Jobs;

use App\Events\ContractCreated;
use App\Support\SubscriptionContractStream;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;
use stdClass;

class SubscriptionContractCreateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $shopDomain,
        public stdClass $data,
    ) {}

    public function handle(SubscriptionContractStream $subscriptionContractStream): void
    {
        $shopDomain = ShopDomain::fromNative($this->shopDomain)->toNative();
        $contractId = $this->resolveContractId();

        Log::info('Subscription contract create webhook job started.', [
            'shopDomain' => $shopDomain,
            'contractId' => $contractId,
            'payloadId' => $this->data->id ?? null,
            'payloadGraphqlId' => $this->data->admin_graphql_api_id ?? null,
        ]);

        $subscriptionContractStream->publish(
            $shopDomain,
            'subscription_contracts/create',
            $contractId,
        );

        Log::info('Subscription contract create webhook job broadcasting event.', [
            'shopDomain' => $shopDomain,
            'contractId' => $contractId,
        ]);

        event(new ContractCreated($shopDomain, $contractId, 'subscription_contracts/create'));
    }

    private function resolveContractId(): ?string
    {
        $contractId = $this->data->admin_graphql_api_id ?? null;

        if (is_string($contractId) && $contractId !== '') {
            return $contractId;
        }

        $numericId = $this->data->id ?? null;

        if (is_numeric($numericId)) {
            return 'gid://shopify/SubscriptionContract/'.(string) $numericId;
        }

        return null;
    }
}

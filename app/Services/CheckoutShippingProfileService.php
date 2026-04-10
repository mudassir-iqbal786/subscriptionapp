<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class CheckoutShippingProfileService
{
    /**
     * @param  array<int, string>  $variantIds
     * @return array<int, array{id: string, title: string, shippingProfile: array{id: string, name: string}|null}>
     */
    public function getProfilesForVariants(User $shop, array $variantIds): array
    {
        Log::info('Checkout shipping profiles request received.', [
            'shopDomain' => $shop->getDomain()?->toNative(),
            'variantIds' => $variantIds,
        ]);

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetCheckoutShippingProfiles($variantIds: [ID!]!) {
  nodes(ids: $variantIds) {
    ... on ProductVariant {
      id
      title
      product {
        title
      }
      deliveryProfile {
        id
        name
      }
    }
  }
}
GRAPHQL,
            ['variantIds' => array_values(array_unique($variantIds))]
        );

        $body = $this->responseBody($response);
        $errors = data_get($body, 'errors');
        $nodes = data_get($body, 'data.nodes', []);

        Log::info('Checkout shipping profiles Shopify response.', [
            'shopDomain' => $shop->getDomain()?->toNative(),
            'errors' => $errors,
            'nodes' => $nodes,
            'body' => $response,
        ]);

        if (is_array($errors) && $errors !== []) {
            $firstErrorMessage = (string) data_get($errors, '0.message', 'Unable to fetch shipping profiles from Shopify.');

            throw new RuntimeException($firstErrorMessage);
        }

        return collect(data_get($body, 'data.nodes', []))
            ->filter(static fn ($node): bool => is_array($node) && filled($node['id'] ?? null))
            ->map(static function (array $variant): array {
                $deliveryProfile = $variant['deliveryProfile'] ?? null;
                $productTitle = (string) data_get($variant, 'product.title', '');
                $variantTitle = (string) ($variant['title'] ?? '');
                $title = trim($productTitle !== '' && $variantTitle !== '' && $variantTitle !== 'Default Title'
                    ? "{$productTitle} / {$variantTitle}"
                    : ($productTitle !== '' ? $productTitle : $variantTitle));

                return [
                    'id' => (string) $variant['id'],
                    'title' => $title,
                    'shippingProfile' => is_array($deliveryProfile)
                        ? [
                            'id' => (string) ($deliveryProfile['id'] ?? ''),
                            'name' => (string) ($deliveryProfile['name'] ?? ''),
                        ]
                        : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $response
     * @return array<string, mixed>
     */
    private function responseBody(array $response): array
    {
        $body = $response['body'] ?? [];

        return is_array($body) ? $body : [];
    }
}

<?php

namespace App\Services;

use App\Models\User;
use RuntimeException;
use Throwable;

class ShopifySubscriptionDiscountService
{
    private const FUNCTION_HANDLE = 'subscription-discount';

    private const METAFIELD_NAMESPACE = '$app:subscription-discount';

    private const METAFIELD_KEY = 'function-configuration';

    /**
     * @return array<string, mixed>
     */
    public function defaultConfiguration(): array
    {
        return [
            'id' => null,
            'title' => 'Subscription discount',
            'enabled' => true,
            'percentage' => 10.0,
            'message' => 'Subscription discount',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function get(User $shop, string $discountId): array
    {
        $discountId = $this->normalizeDiscountId($discountId);

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetSubscriptionDiscount($id: ID!, $namespace: String!, $key: String!) {
  node(id: $id) {
    ... on DiscountAutomaticNode {
      id
      metafield(namespace: $namespace, key: $key) {
        value
      }
      automaticDiscount {
        ... on DiscountAutomaticApp {
          discountId
          title
          status
          startsAt
          endsAt
        }
      }
    }
  }
}
GRAPHQL,
            [
                'id' => $discountId,
                'namespace' => self::METAFIELD_NAMESPACE,
                'key' => self::METAFIELD_KEY,
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        $discount = data_get($body, 'data.node');

        if (! is_array($discount)) {
            throw new RuntimeException('The selected subscription discount could not be found.');
        }

        return $this->mapDiscountNode($discount);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findExisting(User $shop): ?array
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query FindSubscriptionDiscount($namespace: String!, $key: String!) {
  automaticDiscountNodes(first: 50, query: "type:app") {
    nodes {
      id
      metafield(namespace: $namespace, key: $key) {
        value
      }
      automaticDiscount {
        ... on DiscountAutomaticApp {
          discountId
          title
          status
          startsAt
          endsAt
        }
      }
    }
  }
}
GRAPHQL,
            [
                'namespace' => self::METAFIELD_NAMESPACE,
                'key' => self::METAFIELD_KEY,
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        $discountNode = collect(data_get($body, 'data.automaticDiscountNodes.nodes', []))
            ->first(function (mixed $node): bool {
                return is_array($node)
                    && is_array(data_get($node, 'automaticDiscount'))
                    && (string) data_get($node, 'metafield.value', '') !== '';
            });

        return is_array($discountNode) ? $this->mapDiscountNode($discountNode) : null;
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @return array<string, mixed>
     */
    public function save(User $shop, array $configuration): array
    {
        $id = (string) ($configuration['id'] ?? '');

        if ($id === '') {
            $existingDiscount = $this->findExisting($shop);

            if (is_array($existingDiscount) && ($existingDiscount['id'] ?? '') !== '') {
                return $this->update($shop, $this->normalizeDiscountId((string) $existingDiscount['id']), $configuration);
            }

            return $this->create($shop, $configuration);
        }

        return $this->update($shop, $this->normalizeDiscountId($id), $configuration);
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @return array<string, mixed>
     */
    private function create(User $shop, array $configuration): array
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation CreateSubscriptionDiscount($automaticAppDiscount: DiscountAutomaticAppInput!) {
  discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
    automaticAppDiscount {
      discountId
      title
      status
      startsAt
      endsAt
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'automaticAppDiscount' => [
                    'title' => (string) $configuration['title'],
                    'functionHandle' => self::FUNCTION_HANDLE,
                    'discountClasses' => ['PRODUCT'],
                    'startsAt' => now()->toIso8601String(),
                    'appliesOnOneTimePurchase' => false,
                    'appliesOnSubscription' => true,
                    'recurringCycleLimit' => 0,
                    'combinesWith' => [
                        'orderDiscounts' => true,
                        'productDiscounts' => true,
                        'shippingDiscounts' => true,
                    ],
                    'metafields' => [
                        $this->buildConfigurationMetafield($configuration),
                    ],
                ],
            ]
        );

        $body = $this->responseBody($response);
        $payload = data_get($body, 'data.discountAutomaticAppCreate');
        $this->assertNoErrors($body, data_get($payload, 'userErrors', []));

        $discount = data_get($payload, 'automaticAppDiscount');

        if (! is_array($discount)) {
            throw new RuntimeException('Shopify did not return the created subscription discount.');
        }

        return $this->mapSavedDiscount($discount, $configuration);
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @return array<string, mixed>
     */
    private function update(User $shop, string $id, array $configuration): array
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation UpdateSubscriptionDiscount($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
  discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
    automaticAppDiscount {
      discountId
      title
      status
      startsAt
      endsAt
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'id' => $id,
                'automaticAppDiscount' => [
                    'title' => (string) $configuration['title'],
                    'appliesOnOneTimePurchase' => false,
                    'appliesOnSubscription' => true,
                    'recurringCycleLimit' => 0,
                    'combinesWith' => [
                        'orderDiscounts' => true,
                        'productDiscounts' => true,
                        'shippingDiscounts' => true,
                    ],
                    'metafields' => [
                        $this->buildConfigurationMetafield($configuration),
                    ],
                ],
            ]
        );

        $body = $this->responseBody($response);
        $payload = data_get($body, 'data.discountAutomaticAppUpdate');
        $this->assertNoErrors($body, data_get($payload, 'userErrors', []));

        $discount = data_get($payload, 'automaticAppDiscount');

        if (! is_array($discount)) {
            throw new RuntimeException('Shopify did not return the updated subscription discount.');
        }

        return $this->mapSavedDiscount($discount, $configuration);
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @return array<string, string>
     */
    private function buildConfigurationMetafield(array $configuration): array
    {
        return [
            'namespace' => self::METAFIELD_NAMESPACE,
            'key' => self::METAFIELD_KEY,
            'type' => 'json',
            'value' => json_encode([
                'enabled' => (bool) $configuration['enabled'],
                'percentage' => $this->normalizePercentage($configuration['percentage'] ?? 0),
                'message' => trim((string) $configuration['message']),
            ], JSON_THROW_ON_ERROR),
        ];
    }

    /**
     * @param  array<string, mixed>  $discount
     * @return array<string, mixed>
     */
    private function mapDiscountNode(array $discountNode): array
    {
        $discount = data_get($discountNode, 'automaticDiscount');

        if (! is_array($discount)) {
            throw new RuntimeException('The selected subscription discount could not be found.');
        }

        $configuration = $this->decodeConfiguration((string) data_get($discountNode, 'metafield.value', ''));
        $status = (string) data_get($discount, 'status', '');

        return [
            'id' => (string) (data_get($discount, 'discountId') ?: data_get($discountNode, 'id')),
            'title' => (string) data_get($discount, 'title', 'Subscription discount'),
            'enabled' => $configuration['enabled'] && $status !== 'EXPIRED',
            'percentage' => $configuration['percentage'],
            'message' => $configuration['message'],
            'status' => $status,
        ];
    }

    /**
     * @param  array<string, mixed>  $discount
     * @param  array<string, mixed>  $configuration
     * @return array<string, mixed>
     */
    private function mapSavedDiscount(array $discount, array $configuration): array
    {
        $status = (string) data_get($discount, 'status', '');

        return [
            'id' => (string) data_get($discount, 'discountId'),
            'title' => (string) data_get($discount, 'title', $configuration['title'] ?? 'Subscription discount'),
            'enabled' => (bool) $configuration['enabled'] && $status !== 'EXPIRED',
            'percentage' => $this->normalizePercentage($configuration['percentage'] ?? 0),
            'message' => trim((string) ($configuration['message'] ?? '')) ?: 'Subscription discount',
            'status' => $status,
        ];
    }

    /**
     * @return array{enabled: bool, percentage: float, message: string}
     */
    private function decodeConfiguration(string $value): array
    {
        $defaults = $this->defaultConfiguration();

        if ($value === '') {
            return [
                'enabled' => (bool) $defaults['enabled'],
                'percentage' => (float) $defaults['percentage'],
                'message' => (string) $defaults['message'],
            ];
        }

        try {
            $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            $decoded = [];
        }

        return [
            'enabled' => (bool) data_get($decoded, 'enabled', $defaults['enabled']),
            'percentage' => $this->normalizePercentage(data_get($decoded, 'percentage', $defaults['percentage'])),
            'message' => trim((string) data_get($decoded, 'message', $defaults['message'])) ?: (string) $defaults['message'],
        ];
    }

    private function normalizePercentage(mixed $percentage): float
    {
        if (! is_numeric($percentage)) {
            return 0.0;
        }

        return max(0.0, min(100.0, (float) $percentage));
    }

    private function normalizeDiscountId(string $discountId): string
    {
        $discountId = trim($discountId);

        if (preg_match('/^\d+$/', $discountId) === 1) {
            return "gid://shopify/DiscountAutomaticNode/{$discountId}";
        }

        return $discountId;
    }

    /**
     * @param  array<string, mixed>  $body
     * @param  array<int, mixed>  $userErrors
     */
    private function assertNoErrors(array $body, array $userErrors = []): void
    {
        $topLevelErrors = collect(data_get($body, 'errors', []))
            ->map(function (mixed $error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify error.');
                }

                return (string) $error;
            })
            ->filter()
            ->values();

        if ($topLevelErrors->isNotEmpty()) {
            throw new RuntimeException($topLevelErrors->implode(' '));
        }

        $mutationErrors = collect($userErrors)
            ->map(function (mixed $error): string {
                if (is_array($error)) {
                    return (string) ($error['message'] ?? 'Unknown Shopify validation error.');
                }

                return (string) $error;
            })
            ->filter()
            ->values();

        if ($mutationErrors->isNotEmpty()) {
            $message = $mutationErrors->implode(' ');

            if (str_contains(strtolower($message), 'title must be unique for automatic discount')) {
                throw new RuntimeException('A Shopify automatic discount with this title already exists. Open the existing discount from the Discount page or use a different title.');
            }

            throw new RuntimeException($message);
        }
    }

    /**
     * @param  array<string, mixed>  $response
     * @return array<string, mixed>
     */
    private function responseBody(array $response): array
    {
        $body = $response['body'] ?? null;

        if ($body === null) {
            return [];
        }

        if (is_array($body)) {
            $wrappedBody = $body['Gnikyt\\BasicShopifyAPI\\ResponseAccess'] ?? null;

            return is_array($wrappedBody) ? $wrappedBody : $body;
        }

        if (method_exists($body, 'toArray')) {
            try {
                return $body->toArray();
            } catch (Throwable) {
                return [];
            }
        }

        return [];
    }
}

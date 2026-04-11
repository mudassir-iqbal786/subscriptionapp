<?php

namespace App\Services;

use App\Models\User;
use RuntimeException;
use Throwable;

class ShopifyDeliveryCustomizationService
{
    private const FUNCTION_HANDLE = 'subscription-delivery-customization';

    private const METAFIELD_NAMESPACE = '$app:subscription-delivery-customization';

    private const METAFIELD_KEY = 'function-configuration';

    /**
     * @return array<string, mixed>
     */
    public function defaultConfiguration(): array
    {
        return [
            'id' => null,
            'title' => 'Subscription delivery customization',
            'enabled' => true,
            'hiddenDeliveryOptionTitles' => [],
            'hiddenDeliveryOptionHandles' => [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function get(User $shop, string $deliveryCustomizationId): array
    {
        $deliveryCustomizationId = $this->normalizeDeliveryCustomizationId($deliveryCustomizationId);

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetDeliveryCustomization($id: ID!, $namespace: String!, $key: String!) {
  node(id: $id) {
    ... on DeliveryCustomization {
      id
      title
      enabled
      metafield(namespace: $namespace, key: $key) {
        value
      }
    }
  }
}
GRAPHQL,
            [
                'id' => $deliveryCustomizationId,
                'namespace' => self::METAFIELD_NAMESPACE,
                'key' => self::METAFIELD_KEY,
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        $deliveryCustomization = data_get($body, 'data.node');

        if (! is_array($deliveryCustomization)) {
            throw new RuntimeException('The selected delivery customization could not be found.');
        }

        return $this->mapDeliveryCustomization($deliveryCustomization);
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @return array<string, mixed>
     */
    public function save(User $shop, array $configuration): array
    {
        $id = (string) ($configuration['id'] ?? '');

        if ($id === '') {
            return $this->create($shop, $configuration);
        }

        return $this->update($shop, $this->normalizeDeliveryCustomizationId($id), $configuration);
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @return array<string, mixed>
     */
    private function create(User $shop, array $configuration): array
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation CreateDeliveryCustomization($deliveryCustomization: DeliveryCustomizationInput!) {
  deliveryCustomizationCreate(deliveryCustomization: $deliveryCustomization) {
    deliveryCustomization {
      id
      title
      enabled
      metafield(namespace: "$app:subscription-delivery-customization", key: "function-configuration") {
        value
      }
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'deliveryCustomization' => [
                    'functionHandle' => self::FUNCTION_HANDLE,
                    'title' => (string) $configuration['title'],
                    'enabled' => (bool) $configuration['enabled'],
                    'metafields' => [
                        $this->buildConfigurationMetafield($configuration),
                    ],
                ],
            ]
        );

        $body = $this->responseBody($response);
        $payload = data_get($body, 'data.deliveryCustomizationCreate');
        $this->assertNoErrors($body, data_get($payload, 'userErrors', []));

        $deliveryCustomization = data_get($payload, 'deliveryCustomization');

        if (! is_array($deliveryCustomization)) {
            throw new RuntimeException('Shopify did not return the created delivery customization.');
        }

        return $this->mapDeliveryCustomization($deliveryCustomization);
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @return array<string, mixed>
     */
    private function update(User $shop, string $id, array $configuration): array
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation UpdateDeliveryCustomization($id: ID!, $deliveryCustomization: DeliveryCustomizationInput!) {
  deliveryCustomizationUpdate(id: $id, deliveryCustomization: $deliveryCustomization) {
    deliveryCustomization {
      id
      title
      enabled
      metafield(namespace: "$app:subscription-delivery-customization", key: "function-configuration") {
        value
      }
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
                'deliveryCustomization' => [
                    'title' => (string) $configuration['title'],
                    'enabled' => (bool) $configuration['enabled'],
                    'metafields' => [
                        $this->buildConfigurationMetafield($configuration),
                    ],
                ],
            ]
        );

        $body = $this->responseBody($response);
        $payload = data_get($body, 'data.deliveryCustomizationUpdate');
        $this->assertNoErrors($body, data_get($payload, 'userErrors', []));

        $deliveryCustomization = data_get($payload, 'deliveryCustomization');

        if (! is_array($deliveryCustomization)) {
            throw new RuntimeException('Shopify did not return the updated delivery customization.');
        }

        return $this->mapDeliveryCustomization($deliveryCustomization);
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
                'hiddenDeliveryOptionTitles' => $this->normalizeList($configuration['hiddenDeliveryOptionTitles'] ?? []),
                'hiddenDeliveryOptionHandles' => $this->normalizeList($configuration['hiddenDeliveryOptionHandles'] ?? []),
            ], JSON_THROW_ON_ERROR),
        ];
    }

    /**
     * @param  array<string, mixed>  $deliveryCustomization
     * @return array<string, mixed>
     */
    private function mapDeliveryCustomization(array $deliveryCustomization): array
    {
        $configuration = $this->decodeConfiguration((string) data_get($deliveryCustomization, 'metafield.value', ''));

        return [
            'id' => (string) data_get($deliveryCustomization, 'id'),
            'title' => (string) data_get($deliveryCustomization, 'title', 'Subscription delivery customization'),
            'enabled' => (bool) data_get($deliveryCustomization, 'enabled', true),
            'hiddenDeliveryOptionTitles' => $configuration['hiddenDeliveryOptionTitles'],
            'hiddenDeliveryOptionHandles' => $configuration['hiddenDeliveryOptionHandles'],
        ];
    }

    /**
     * @return array{hiddenDeliveryOptionTitles: array<int, string>, hiddenDeliveryOptionHandles: array<int, string>}
     */
    private function decodeConfiguration(string $value): array
    {
        if ($value === '') {
            return [
                'hiddenDeliveryOptionTitles' => [],
                'hiddenDeliveryOptionHandles' => [],
            ];
        }

        try {
            $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            $decoded = [];
        }

        return [
            'hiddenDeliveryOptionTitles' => $this->normalizeList(data_get($decoded, 'hiddenDeliveryOptionTitles', [])),
            'hiddenDeliveryOptionHandles' => $this->normalizeList(data_get($decoded, 'hiddenDeliveryOptionHandles', [])),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function normalizeList(mixed $values): array
    {
        if (! is_array($values)) {
            return [];
        }

        return collect($values)
            ->filter(fn (mixed $value): bool => is_string($value))
            ->map(fn (string $value): string => trim($value))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function normalizeDeliveryCustomizationId(string $deliveryCustomizationId): string
    {
        $deliveryCustomizationId = trim($deliveryCustomizationId);

        if (preg_match('/^\d+$/', $deliveryCustomizationId) === 1) {
            return "gid://shopify/DeliveryCustomization/{$deliveryCustomizationId}";
        }

        return $deliveryCustomizationId;
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
            throw new RuntimeException($mutationErrors->implode(' '));
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

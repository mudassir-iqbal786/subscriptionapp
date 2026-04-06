<?php

namespace App\Services;

use App\Models\User;
use RuntimeException;
use Throwable;

class ShopifySubscriptionSettingsService
{
    /**
     * @return array<string, mixed>|null
     */
    public function fetchSettings(User $shop): ?array
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetSubscriptionAppSettings($namespace: String!, $key: String!) {
  currentAppInstallation {
    metafield(namespace: $namespace, key: $key) {
      value
    }
  }
}
GRAPHQL,
            [
                'namespace' => $this->metafieldNamespace(),
                'key' => $this->metafieldKey(),
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        $value = data_get($body, 'data.currentAppInstallation.metafield.value');

        if (! is_string($value) || $value === '') {
            return null;
        }

        try {
            $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param  array<string, mixed>  $settings
     */
    public function syncSettings(User $shop, array $settings): void
    {
        $installationId = $this->fetchAppInstallationId($shop);

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation SyncSubscriptionAppSettings($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'metafields' => [
                    [
                        'namespace' => $this->metafieldNamespace(),
                        'key' => $this->metafieldKey(),
                        'type' => 'json',
                        'value' => json_encode($settings, JSON_THROW_ON_ERROR),
                        'ownerId' => $installationId,
                    ],
                ],
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body, data_get($body, 'data.metafieldsSet.userErrors', []));
    }

    private function fetchAppInstallationId(User $shop): string
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetCurrentAppInstallation {
  currentAppInstallation {
    id
  }
}
GRAPHQL
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        $installationId = (string) data_get($body, 'data.currentAppInstallation.id', '');

        if ($installationId === '') {
            throw new RuntimeException('Shopify did not return the current app installation ID.');
        }

        return $installationId;
    }

    private function metafieldNamespace(): string
    {
        return 'subscription_app';
    }

    private function metafieldKey(): string
    {
        return 'settings';
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
            return $body;
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

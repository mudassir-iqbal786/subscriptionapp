<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ShopifyMetaobjectService
{
    /**
     * @param  array{title: string, description?: string|null, handle?: string|null}  $payload
     * @return array<string, mixed>
     */
    public function createSubscriptionMetaobject(User $shop, array $payload): array
    {
        $this->ensureDefinition($shop);

        $handle = filled($payload['handle'] ?? null)
            ? Str::slug((string) $payload['handle'])
            : Str::slug($payload['title'].'-'.Str::random(6));

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation CreateSubscriptionMetaobject($metaobject: MetaobjectCreateInput!) {
  metaobjectCreate(metaobject: $metaobject) {
    metaobject {
      id
      handle
      type
      fields {
        key
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
                'metaobject' => [
                    'type' => $this->definitionType(),
                    'handle' => $handle,
                    'fields' => [
                        [
                            'key' => 'title',
                            'value' => $payload['title'],
                        ],
                        [
                            'key' => 'description',
                            'value' => (string) ($payload['description'] ?? ''),
                        ],
                    ],
                ],
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body, data_get($body, 'data.metaobjectCreate.userErrors', []));

        $metaobject = data_get($body, 'data.metaobjectCreate.metaobject');

        if (! is_array($metaobject)) {
            throw new RuntimeException('Shopify did not return the created metaobject.');
        }

        return $metaobject;
    }

    private function ensureDefinition(User $shop): void
    {
        if ($this->definitionExists($shop)) {
            return;
        }

        $response = $shop->api()->graph(
            <<<'GRAPHQL'
mutation CreateSubscriptionMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
  metaobjectDefinitionCreate(definition: $definition) {
    metaobjectDefinition {
      id
      type
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL,
            [
                'definition' => [
                    'name' => 'Subscription metaobject',
                    'type' => $this->definitionType(),
                    'fieldDefinitions' => [
                        [
                            'name' => 'Title',
                            'key' => 'title',
                            'type' => 'single_line_text_field',
                            'required' => true,
                        ],
                        [
                            'name' => 'Description',
                            'key' => 'description',
                            'type' => 'multi_line_text_field',
                            'required' => false,
                        ],
                    ],
                ],
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body, data_get($body, 'data.metaobjectDefinitionCreate.userErrors', []));
    }

    private function definitionExists(User $shop): bool
    {
        $response = $shop->api()->graph(
            <<<'GRAPHQL'
query GetSubscriptionMetaobjectDefinition($type: String!) {
  metaobjectDefinitionByType(type: $type) {
    id
  }
}
GRAPHQL,
            [
                'type' => $this->definitionType(),
            ]
        );

        $body = $this->responseBody($response);
        $this->assertNoErrors($body);

        return filled(data_get($body, 'data.metaobjectDefinitionByType.id'));
    }

    private function definitionType(): string
    {
        return '$app:subscription_metaobject';
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
            throw new RuntimeException($this->normalizeShopifyErrorMessage($topLevelErrors->implode(' ')));
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
            throw new RuntimeException($this->normalizeShopifyErrorMessage($mutationErrors->implode(' ')));
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

    private function normalizeShopifyErrorMessage(string $message): string
    {
        if (
            Str::contains($message, [
                'write_metaobjects',
                'read_metaobject_definitions',
                'write_metaobject_definitions',
                'access scope',
                'Access denied',
            ])
        ) {
            return $message.' Update SHOPIFY_API_SCOPES to include read_metaobject_definitions, write_metaobject_definitions, read_metaobjects, and write_metaobjects, then reinstall or re-authenticate the app.';
        }

        return $message;
    }
}

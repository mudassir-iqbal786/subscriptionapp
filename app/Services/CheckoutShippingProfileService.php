<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class CheckoutShippingProfileService
{
    /**
     * @param  array<int, string>  $variantIds
     * @return array{items: array<int, array{variantId: string, variantTitle: string, productTitle: string, profileId: string, profileName: string}>, profiles: array<int, array{profileId: string, name: string, shippingZones: array<int, array{zoneId: string, name: string, rates: array<int, array{handle: string, price: string, title: string}>}>}>}
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
        profileLocationGroups {
          locationGroupZones(first: 25) {
            nodes {
              zone {
                id
                name
              }
              methodDefinitions(first: 25) {
                nodes {
                  id
                  name
                  rateProvider {
                    __typename
                    ... on DeliveryRateDefinition {
                      id
                      price {
                        amount
                        currencyCode
                      }
                    }
                    ... on DeliveryParticipant {
                      id
                      fixedFee {
                        amount
                        currencyCode
                      }
                      participantServices {
                        name
                        active
                      }
                      carrierService {
                        name
                        formattedName
                      }
                    }
                  }
                }
              }
            }
          }
        }
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
            'body' => $this->responseBody($response),
        ]);

        if (is_array($errors) && $errors !== []) {
            $firstErrorMessage = (string) data_get($errors, '0.message', 'Unable to fetch shipping profiles from Shopify.');

            throw new RuntimeException($firstErrorMessage);
        }

        $nodes = collect(data_get($body, 'data.nodes', []))
            ->filter(static fn ($node): bool => is_array($node));

        return [
            'items' => $nodes
                ->map(fn (array $node): array => $this->formatVariantProfileAssignment($node))
                ->values()
                ->all(),
            'profiles' => $nodes
                ->pluck('deliveryProfile')
                ->filter(static fn ($profile): bool => is_array($profile) && filled($profile['id'] ?? null))
                ->unique(static fn (array $profile): string => (string) $profile['id'])
                ->map(function (array $profile): array {
                    return $this->formatDeliveryProfile($profile);
                })
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array{variantId: string, variantTitle: string, productTitle: string, profileId: string, profileName: string}
     */
    private function formatVariantProfileAssignment(array $node): array
    {
        $deliveryProfile = is_array($node['deliveryProfile'] ?? null) ? $node['deliveryProfile'] : [];

        return [
            'variantId' => (string) ($node['id'] ?? ''),
            'variantTitle' => (string) ($node['title'] ?? ''),
            'productTitle' => (string) data_get($node, 'product.title', ''),
            'profileId' => (string) ($deliveryProfile['id'] ?? ''),
            'profileName' => (string) ($deliveryProfile['name'] ?? ''),
        ];
    }

    /**
     * @return array{profileId: string, name: string, shippingZones: array<int, array{zoneId: string, name: string, rates: array<int, array{handle: string, price: string, title: string}>}>}
     */
    private function formatDeliveryProfile(array $profile): array
    {
        return [
            'profileId' => (string) ($profile['id'] ?? ''),
            'name' => (string) ($profile['name'] ?? ''),
            'shippingZones' => collect($profile['profileLocationGroups'] ?? [])
                ->flatMap(static fn (array $locationGroup): array => data_get($locationGroup, 'locationGroupZones.nodes', []))
                ->filter(static fn ($locationGroupZone): bool => is_array($locationGroupZone))
                ->map(fn (array $locationGroupZone): array => $this->formatShippingZone($locationGroupZone))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array{zoneId: string, name: string, rates: array<int, array{handle: string, price: string, title: string}>}
     */
    private function formatShippingZone(array $locationGroupZone): array
    {
        return [
            'zoneId' => (string) data_get($locationGroupZone, 'zone.id', ''),
            'name' => (string) data_get($locationGroupZone, 'zone.name', ''),
            'rates' => collect(data_get($locationGroupZone, 'methodDefinitions.nodes', []))
                ->filter(static fn ($methodDefinition): bool => is_array($methodDefinition))
                ->map(fn (array $methodDefinition): array => $this->formatRate($methodDefinition))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array{handle: string, price: string, title: string}
     */
    private function formatRate(array $methodDefinition): array
    {
        $rateProvider = $methodDefinition['rateProvider'] ?? [];
        $price = match ((string) data_get($rateProvider, '__typename', '')) {
            'DeliveryRateDefinition' => $this->formatMoney(data_get($rateProvider, 'price')),
            'DeliveryParticipant' => $this->formatMoney(data_get($rateProvider, 'fixedFee')),
            default => '',
        };

        return [
            'handle' => (string) ($methodDefinition['id'] ?? data_get($rateProvider, 'id', '')),
            'price' => $price,
            'title' => (string) ($methodDefinition['name'] ?? data_get($rateProvider, 'carrierService.formattedName', data_get($rateProvider, 'carrierService.name', ''))),
        ];
    }

    private function formatMoney(mixed $money): string
    {
        if (! is_array($money)) {
            return '';
        }

        $amount = (string) ($money['amount'] ?? '');
        $currencyCode = (string) ($money['currencyCode'] ?? '');

        return trim("{$amount} {$currencyCode}");
    }

    /**
     * @param  array<string, mixed>  $response
     * @return array<string, mixed>
     */
    private function responseBody(array $response): array
    {
        $body = $response['body'] ?? [];
        $body = $this->normalizePayload($body);

        if (array_key_exists('data', $body) || array_key_exists('errors', $body)) {
            return $body;
        }

        $wrappedBody = $body['Gnikyt\\BasicShopifyAPI\\ResponseAccess'] ?? null;
        $wrappedBody = $this->normalizePayload($wrappedBody);

        if (array_key_exists('data', $wrappedBody) || array_key_exists('errors', $wrappedBody)) {
            return $wrappedBody;
        }

        if (count($body) === 1) {
            $firstValue = $this->normalizePayload(reset($body));

            if (array_key_exists('data', $firstValue) || array_key_exists('errors', $firstValue)) {
                return $firstValue;
            }
        }

        return $body;
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizePayload(mixed $payload): array
    {
        if (is_array($payload)) {
            return $payload;
        }

        $encodedPayload = json_encode($payload);

        if (! is_string($encodedPayload)) {
            return [];
        }

        $decodedPayload = json_decode($encodedPayload, true);

        return is_array($decodedPayload) ? $decodedPayload : [];
    }
}

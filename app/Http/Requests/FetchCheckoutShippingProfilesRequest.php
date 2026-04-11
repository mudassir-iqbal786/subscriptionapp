<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class FetchCheckoutShippingProfilesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'checkoutId' => ['nullable', 'string', 'max:255'],
            'variantIds' => ['required', 'array', 'min:1', 'max:50'],
            'variantIds.*' => ['required', 'string', 'regex:/^gid:\/\/shopify\/ProductVariant\/\d+$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'variantIds.required' => 'At least one product variant is required.',
            'variantIds.array' => 'Variant IDs must be sent as an array.',
            'variantIds.min' => 'At least one product variant is required.',
            'variantIds.max' => 'A maximum of 50 product variants can be requested at once.',
            'variantIds.*.regex' => 'Each variant ID must be a valid Shopify product variant GID.',
        ];
    }
}

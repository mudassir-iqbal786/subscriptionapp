<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDeliveryCustomizationRequest extends FormRequest
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
            'id' => ['nullable', 'string', 'regex:/^(gid:\/\/shopify\/DeliveryCustomization\/\d+|\d+)$/'],
            'title' => ['required', 'string', 'max:120'],
            'enabled' => ['required', 'boolean'],
            'hiddenDeliveryOptionTitles' => ['present', 'array', 'max:30'],
            'hiddenDeliveryOptionTitles.*' => ['string', 'max:120'],
            'hiddenDeliveryOptionHandles' => ['present', 'array', 'max:30'],
            'hiddenDeliveryOptionHandles.*' => ['string', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'id.regex' => 'The delivery customization ID must be a valid Shopify DeliveryCustomization GID.',
            'hiddenDeliveryOptionTitles.max' => 'You can hide up to 30 delivery option titles.',
            'hiddenDeliveryOptionHandles.max' => 'You can hide up to 30 delivery option handles.',
        ];
    }
}

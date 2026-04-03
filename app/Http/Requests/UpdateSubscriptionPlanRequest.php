<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSubscriptionPlanRequest extends FormRequest
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
            'planId' => ['required', 'string'],
            'title' => ['required', 'string', 'max:255'],
            'internalDescription' => ['nullable', 'string', 'max:255'],
            'discountType' => ['required', 'string', 'in:Percentage off,Fixed amount off,No discount'],
            'products' => ['required', 'array', 'min:1'],
            'products.*.id' => ['required', 'string'],
            'products.*.title' => ['nullable', 'string', 'max:255'],
            'options' => ['required', 'array', 'min:1'],
            'options.*.id' => ['nullable', 'string'],
            'options.*.frequencyValue' => ['required', 'integer', 'min:1', 'max:365'],
            'options.*.frequencyUnit' => ['required', 'string', 'in:Days,Weeks,Months,Years'],
            'options.*.percentageOff' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'planId.required' => 'The plan identifier is required.',
            'products.min' => 'Add at least one product to the plan.',
            'options.min' => 'Add at least one subscription option.',
            'options.*.frequencyValue.required' => 'Each option needs a delivery frequency value.',
            'options.*.frequencyUnit.required' => 'Each option needs a delivery frequency unit.',
        ];
    }
}

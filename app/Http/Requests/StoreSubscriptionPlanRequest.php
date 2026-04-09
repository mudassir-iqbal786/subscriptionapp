<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreSubscriptionPlanRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'internalDescription' => ['nullable', 'string', 'max:255'],
            'discountType' => ['required', 'string', 'in:Percentage off,Fixed amount off,No discount'],
            'products' => ['nullable', 'array'],
            'products.*.id' => ['required', 'string'],
            'products.*.title' => ['nullable', 'string', 'max:255'],
            'productVariants' => ['nullable', 'array'],
            'productVariants.*.id' => ['required', 'string'],
            'productVariants.*.title' => ['nullable', 'string', 'max:255'],
            'productVariants.*.productId' => ['required', 'string'],
            'productVariants.*.productTitle' => ['nullable', 'string', 'max:255'],
            'options' => ['required', 'array', 'min:1'],
            'options.*.id' => ['nullable', 'string'],
            'options.*.frequencyValue' => ['required', 'integer', 'min:1', 'max:365'],
            'options.*.frequencyUnit' => ['required', 'string', 'in:Days,Weeks,Months,Years'],
            'options.*.percentageOff' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $productCount = count($this->input('products', []));
                $variantCount = count($this->input('productVariants', []));

                if (($productCount + $variantCount) === 0) {
                    $validator->errors()->add('products', 'Add at least one product or product variant to the plan.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'products.min' => 'Add at least one product or product variant to the plan.',
            'options.min' => 'Add at least one subscription option.',
            'options.*.frequencyValue.required' => 'Each option needs a delivery frequency value.',
            'options.*.frequencyUnit.required' => 'Each option needs a delivery frequency unit.',
        ];
    }
}

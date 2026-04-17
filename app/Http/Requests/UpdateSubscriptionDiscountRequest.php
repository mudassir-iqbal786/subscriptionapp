<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSubscriptionDiscountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'id' => ['nullable', 'string'],
            'title' => ['required', 'string', 'max:255'],
            'enabled' => ['required', 'boolean'],
            'percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'message' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Enter a discount title.',
            'percentage.max' => 'The subscription discount cannot be greater than 100%.',
            'message.required' => 'Enter the discount message shown at checkout.',
        ];
    }
}

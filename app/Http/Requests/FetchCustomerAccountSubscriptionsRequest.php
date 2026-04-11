<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class FetchCustomerAccountSubscriptionsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customerId' => ['required', 'string', 'regex:/^(gid:\/\/shopify\/(Customer|CustomerAccount)\/\d+|\d+)$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customerId.required' => 'A customer ID is required to load subscriptions.',
            'customerId.regex' => 'The customer ID must be a valid Shopify customer identifier.',
        ];
    }
}

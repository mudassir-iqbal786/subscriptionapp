<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSubscriptionSettingsRequest extends FormRequest
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
            'paymentMethodFailure' => ['required', 'array'],
            'paymentMethodFailure.retryAttempts' => ['required', 'integer', 'min:0', 'max:10'],
            'paymentMethodFailure.retryDays' => ['required', 'integer', 'min:1', 'max:14'],
            'paymentMethodFailure.failedAction' => ['required', 'string', 'in:cancel,skip,pause'],
            'inventoryFailure' => ['required', 'array'],
            'inventoryFailure.retryAttempts' => ['required', 'integer', 'min:0', 'max:10'],
            'inventoryFailure.retryDays' => ['required', 'integer', 'min:1', 'max:14'],
            'inventoryFailure.failedAction' => ['required', 'string', 'in:cancel,skip,pause'],
            'inventoryFailure.staffNotifications' => ['required', 'string', 'in:daily,weekly'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'paymentMethodFailure.retryAttempts.min' => 'Payment retry attempts must be at least 0.',
            'paymentMethodFailure.retryAttempts.max' => 'Payment retry attempts may not be greater than 10.',
            'paymentMethodFailure.retryDays.min' => 'Payment retry days must be at least 1.',
            'paymentMethodFailure.retryDays.max' => 'Payment retry days may not be greater than 14.',
            'inventoryFailure.retryAttempts.min' => 'Inventory retry attempts must be at least 0.',
            'inventoryFailure.retryAttempts.max' => 'Inventory retry attempts may not be greater than 10.',
            'inventoryFailure.retryDays.min' => 'Inventory retry days must be at least 1.',
            'inventoryFailure.retryDays.max' => 'Inventory retry days may not be greater than 14.',
        ];
    }
}

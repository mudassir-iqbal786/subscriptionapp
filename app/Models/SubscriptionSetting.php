<?php

namespace App\Models;

use Database\Factories\SubscriptionSettingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionSetting extends Model
{
    /** @use HasFactory<SubscriptionSettingFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'payment_method_retry_attempts',
        'payment_method_retry_days',
        'payment_method_failed_action',
        'inventory_retry_attempts',
        'inventory_retry_days',
        'inventory_failed_action',
        'inventory_staff_notifications',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payment_method_retry_attempts' => 'integer',
            'payment_method_retry_days' => 'integer',
            'inventory_retry_attempts' => 'integer',
            'inventory_retry_days' => 'integer',
        ];
    }

    /**
     * @return array<string, int|string>
     */
    public static function defaults(): array
    {
        return [
            'payment_method_retry_attempts' => 3,
            'payment_method_retry_days' => 7,
            'payment_method_failed_action' => 'cancel',
            'inventory_retry_attempts' => 5,
            'inventory_retry_days' => 1,
            'inventory_failed_action' => 'skip',
            'inventory_staff_notifications' => 'weekly',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

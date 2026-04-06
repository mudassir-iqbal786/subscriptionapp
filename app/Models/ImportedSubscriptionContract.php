<?php

namespace App\Models;

use Database\Factories\ImportedSubscriptionContractFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportedSubscriptionContract extends Model
{
    /** @use HasFactory<ImportedSubscriptionContractFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'handle',
        'customer_name',
        'plan_name',
        'amount',
        'amount_value',
        'currency_code',
        'status',
        'delivery_frequency',
        'payload',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount_value' => 'decimal:2',
            'payload' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class ContractCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $shopDomain,
        public ?string $contractId,
        public string $topic,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('contracts.'.sha1(Str::lower(trim($this->shopDomain))));
    }

    public function broadcastAs(): string
    {
        return 'contract.created';
    }

    /**
     * @return array{contractId: ?string, shop: string, topic: string}
     */
    public function broadcastWith(): array
    {
        return [
            'contractId' => $this->contractId,
            'shop' => Str::lower(trim($this->shopDomain)),
            'topic' => $this->topic,
        ];
    }
}

export const contracts = [
    {
        id: 'SC-1042',
        customer: 'Ava Thompson',
        plan: 'Starter Delivery',
        nextOrder: 'Apr 12, 2026',
        amount: '$48.00',
        status: 'Active',
        deliveryFrequency: 'Every week',
    },
    {
        id: 'SC-1038',
        customer: 'Noah Garcia',
        plan: 'Monthly Refill',
        nextOrder: 'Apr 18, 2026',
        amount: '$72.00',
        status: 'Paused',
        deliveryFrequency: 'Every month',
    },
    {
        id: 'SC-1031',
        customer: 'Mia Ali',
        plan: 'VIP Essentials',
        nextOrder: 'Apr 21, 2026',
        amount: '$96.00',
        status: 'Active',
        deliveryFrequency: 'Every week',
    },
];

export const setupSteps = [
    {
        id: 'plan',
        title: 'Create your first subscription plan',
        description: 'Set billing and delivery frequency for the products you want to sell on subscription.',
        action: 'Create plan',
        completed: true,
    },
    {
        id: 'products',
        title: 'Add subscriptions to product pages',
        description: 'Show subscription options directly on product pages so customers can buy in one step.',
        action: 'Attach products',
        completed: true,
    },
    {
        id: 'portal',
        title: 'Allow customers to manage subscriptions',
        description: 'Enable account access so subscribers can skip, pause, or cancel upcoming orders.',
        action: 'Enable portal',
        completed: true,
    },
    {
        id: 'account',
        title: 'Allow customer to access account post purchase',
        description: 'Customers can access their account from your thank you page',
        action: 'Add subscription link',
        completed: false,
    },
    {
        id: 'contracts',
        title: 'Import existing contracts',
        description: 'Bring customer subscription contracts into your app.',
        action: 'Import contracts',
        completed: true,
    },
    {
        id: 'notifications',
        title: 'Customize notifications',
        description: 'Match renewal reminders and payment emails to your storefront branding.',
        action: 'Edit emails',
        completed: true,
    },
];

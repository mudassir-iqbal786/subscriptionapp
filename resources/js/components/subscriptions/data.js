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

export const contractDetail = {
    contractNumber: '26084966599',
    status: 'Active',
    orderDate: 'April 2, 2026',
    orderNumber: '#1001',
    productTitle: 'Selling Plans Ski Wax',
    productSubtitle: 'Selling Plans Ski Wax',
    productPrice: '$22.46',
    quantity: '1',
    lineTotal: '$22.46',
    oneTimePurchasePrice: '$24.95',
    discount: '10% off',
    delivery: 'Every week',
    paymentSummary: [
        { label: 'Subtotal', value: '$22.46' },
        { label: 'Shipping', value: '$8.00', note: 'Standard' },
        { label: 'Tax', value: '$0.00' },
        { label: 'Total', value: '$30.46' },
    ],
    customer: {
        name: 'Mudassar Iqbal',
        email: 'mudasser425@gmail.com',
        addressLines: ['Mudassar Iqbal', 'Muhammad Colony St 07 C Side Siraj Park', 'Sargodha Kentucky 40100', 'United States'],
    },
    paymentMethod: {
        brand: 'B',
        label: 'Bogus •••• •••• •••• 1',
        expiry: 'Expires 12/33',
    },
    upcomingOrders: ['April 9, 2026', 'April 16, 2026', 'April 23, 2026', 'April 30, 2026', 'May 7, 2026', 'May 14, 2026'],
    timelineDate: 'April 2, 2026',
    timeline: [
        { id: 'created', text: 'Subscription Contract created', time: '10:31 AM' },
        { id: 'order-created', text: 'Origin order created - Order #1001', time: '10:31 AM' },
    ],
};

export const plans = [
    {
        id: 'test-subscription',
        title: 'Test Subscription',
        internalDescription: 'Description',
        storefrontNote: 'Customers will see this on',
        summaryDescription: ['Deliver every week, 10% off', '3 products'],
        productCount: '3 products',
        deliveryFrequency: 'Every week',
        pricing: '10% off',
        products: [
            {
                id: 'gift-card',
                title: 'Gift Card',
                variants: '4 of 4 variants selected',
                swatch: 'linear-gradient(135deg, #ffd1d1 0%, #fff5bf 100%)',
            },
            {
                id: 'ski-wax',
                title: 'Selling Plans Ski Wax',
                variants: '3 of 3 variants selected',
                swatch: 'linear-gradient(135deg, #e4b640 0%, #b8860b 100%)',
            },
            {
                id: 'snowboard',
                title: 'The 3p Fulfilled Snowboard',
                variants: '1 board selected',
                swatch: 'linear-gradient(135deg, #a7f3d0 0%, #22d3ee 100%)',
            },
        ],
        discountType: 'Percentage off',
        options: [
            {
                id: 'weekly-10',
                frequencyValue: '1',
                frequencyUnit: 'Weeks',
                percentageOff: '10',
            },
        ],
    },
];

export const createPlanDraft = {
    title: 'Subscribe and save',
    internalDescription: '',
    storefrontNote: 'Customers will see this on',
    summaryTitle: 'No title',
    summaryDescription: ['Deliver every week'],
    products: [],
    discountType: 'Percentage off',
    options: [
        {
            id: 'draft-weekly',
            frequencyValue: '1',
            frequencyUnit: 'Weeks',
            percentageOff: '',
        },
    ],
};

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

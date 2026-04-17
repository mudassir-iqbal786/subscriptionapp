export const subscriptionDiscountQueryKey = (discountId = '') => ['subscription-discount', discountId];

export const defaultSubscriptionDiscount = {
    id: null,
    title: 'Subscription discount',
    enabled: true,
    percentage: 10,
    message: 'Subscription discount',
};

export function normalizeSubscriptionDiscount(subscriptionDiscount = {}) {
    return {
        ...defaultSubscriptionDiscount,
        ...subscriptionDiscount,
        percentage: Number(subscriptionDiscount.percentage ?? defaultSubscriptionDiscount.percentage),
    };
}

export async function fetchSubscriptionDiscount(discountId = '') {
    const params = discountId ? { discountId } : {};
    const response = await window.axios.get('/api/subscription-discount', { params });

    return normalizeSubscriptionDiscount(response.data.subscriptionDiscount ?? {});
}

export async function saveSubscriptionDiscount(payload) {
    const response = await window.axios.put('/api/subscription-discount', payload);

    return normalizeSubscriptionDiscount(response.data.subscriptionDiscount ?? {});
}

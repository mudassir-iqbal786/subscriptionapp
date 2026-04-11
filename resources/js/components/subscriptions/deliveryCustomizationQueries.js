export const deliveryCustomizationQueryKey = (deliveryCustomizationId = '') => ['delivery-customization', deliveryCustomizationId];

export const defaultDeliveryCustomization = {
    id: null,
    title: 'Subscription delivery customization',
    enabled: true,
    hiddenDeliveryOptionTitles: [],
    hiddenDeliveryOptionHandles: [],
};

export function normalizeDeliveryCustomization(deliveryCustomization = {}) {
    return {
        ...defaultDeliveryCustomization,
        ...deliveryCustomization,
        hiddenDeliveryOptionTitles: Array.isArray(deliveryCustomization.hiddenDeliveryOptionTitles)
            ? deliveryCustomization.hiddenDeliveryOptionTitles
            : [],
        hiddenDeliveryOptionHandles: Array.isArray(deliveryCustomization.hiddenDeliveryOptionHandles)
            ? deliveryCustomization.hiddenDeliveryOptionHandles
            : [],
    };
}

export async function fetchDeliveryCustomization(deliveryCustomizationId = '') {
    const params = deliveryCustomizationId ? { deliveryCustomizationId } : {};
    const response = await window.axios.get('/api/delivery-customization', { params });

    return normalizeDeliveryCustomization(response.data.deliveryCustomization ?? {});
}

export async function saveDeliveryCustomization(payload) {
    const response = await window.axios.put('/api/delivery-customization', payload);

    return normalizeDeliveryCustomization(response.data.deliveryCustomization ?? {});
}

export function getSubscriptionManagementUrl() {
    if (typeof document === 'undefined') {
        return '';
    }

    return document.querySelector('meta[name="shopify-subscription-management-settings-url"]')?.getAttribute('content') ?? '';
}

function buildDefaultSettings() {
    const managementUrl = getSubscriptionManagementUrl();

    return {
        paymentMethodFailure: {
            retryAttempts: 3,
            retryDays: 7,
            failedAction: 'cancel',
        },
        inventoryFailure: {
            retryAttempts: 5,
            retryDays: 1,
            failedAction: 'skip',
            staffNotifications: 'weekly',
        },
        managementUrl,
        setupProgress: {
            accountAccessEnabled: managementUrl.trim() !== '',
            notificationsCustomized: false,
        },
    };
}

export const defaultSettings = buildDefaultSettings();

export function normalizeSettings(settings = {}) {
    const defaults = buildDefaultSettings();
    const managementUrl = typeof settings.managementUrl === 'string' ? settings.managementUrl : defaults.managementUrl;

    return {
        ...defaults,
        ...settings,
        paymentMethodFailure: {
            ...defaults.paymentMethodFailure,
            ...(settings.paymentMethodFailure ?? {}),
        },
        inventoryFailure: {
            ...defaults.inventoryFailure,
            ...(settings.inventoryFailure ?? {}),
        },
        managementUrl,
        setupProgress: {
            ...defaults.setupProgress,
            ...(settings.setupProgress ?? {}),
            accountAccessEnabled: managementUrl.trim() !== '',
        },
    };
}

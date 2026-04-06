import { normalizeSettings } from './data.js';

export const settingsQueryKey = ['subscription-settings'];

export async function fetchSettings() {
    const response = await window.axios.get('/api/settings');

    return normalizeSettings(response.data.settings ?? {});
}

export async function updateSettings(payload) {
    const response = await window.axios.put('/api/settings', payload);

    return normalizeSettings(response.data.settings ?? {});
}

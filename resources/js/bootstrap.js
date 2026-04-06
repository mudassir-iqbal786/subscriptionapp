import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common.Accept = 'application/json';
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

let isRefreshingSessionToken = null;

function removeTransientShopifyTokenFromUrl() {
    const currentUrl = new URL(window.location.href);

    if (!currentUrl.searchParams.has('token')) {
        return;
    }

    currentUrl.searchParams.delete('token');
    window.history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
}

removeTransientShopifyTokenFromUrl();

function sleep(duration) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, duration);
    });
}

async function refreshSessionToken() {
    if (isRefreshingSessionToken) {
        return isRefreshingSessionToken;
    }

    isRefreshingSessionToken = (async () => {
        if (window.shopify?.idToken) {
            const sessionToken = await window.shopify.idToken();

            window.sessionToken = sessionToken;
            window.axios.defaults.headers.common.Authorization = `Bearer ${sessionToken}`;

            return sessionToken;
        }

        return waitForSessionToken();
    })();

    try {
        return await isRefreshingSessionToken;
    } finally {
        isRefreshingSessionToken = null;
    }
}

async function waitForSessionToken() {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        if (window.sessionToken) {
            return window.sessionToken;
        }

        await sleep(100);
    }

    return null;
}

window.waitForSessionToken = waitForSessionToken;
window.refreshSessionToken = refreshSessionToken;

window.axios.interceptors.request.use(async (config) => {
    const sessionToken = await refreshSessionToken();

    if (sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`;
    }

    return config;
});

window.axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status;
        const message = error?.response?.data?.message ?? error?.message ?? '';
        const originalRequest = error?.config;
        const tokenExpired = typeof message === 'string' && message.toLowerCase().includes('session token has expired');

        if ((status === 401 || status === 403) && tokenExpired && originalRequest && !originalRequest._retriedWithFreshToken) {
            originalRequest._retriedWithFreshToken = true;

            const freshToken = await refreshSessionToken();

            if (freshToken) {
                originalRequest.headers = originalRequest.headers ?? {};
                originalRequest.headers.Authorization = `Bearer ${freshToken}`;

                return window.axios(originalRequest);
            }
        }

        return Promise.reject(error);
    }
);

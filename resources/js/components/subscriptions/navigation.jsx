import { useLocation, useNavigate } from 'react-router-dom';

export const pageContent = {
    home: {
        title: 'Subscriptions',
    },
    plans: {
        title: 'Plans',
    },
    pra: {
        title: 'Pra',
    },
    planDescription: {
        title: 'Description',
        parentTitle: 'Plans',
        parentHref: '/plans',
    },
    createPlan: {
        title: 'Create subscription plan',
        parentTitle: 'Plans',
        parentHref: '/plans',
    },
    contracts: {
        title: 'Contracts',
    },
    contractDetail: {
        title: 'Contract detail',
        parentTitle: 'Contracts',
        parentHref: '/contracts',
    },
    settings: {
        title: 'Settings',
    },
    deliveryCustomization: {
        title: 'Delivery customization',
        parentTitle: 'Settings',
        parentHref: '/settings',
    },
};

const embeddedQueryKeys = ['embedded', 'host', 'locale', 'shop'];

function shouldHandleClientNavigation(event) {
    return !(
        event.defaultPrevented ||
        (typeof event.button === 'number' && event.button !== 0) ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
    );
}

function normalizePath(pathname) {
    if (pathname === '/' || pathname === '') {
        return '/';
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function getCurrentPage(pathname) {
    const normalizedPath = normalizePath(pathname);

    if (normalizedPath === '/plans') {
        return 'plans';
    }

    if (normalizedPath === '/pra') {
        return 'pra';
    }

    if (normalizedPath.startsWith('/plans/description/')) {
        return 'planDescription';
    }

    if (normalizedPath === '/plans/create') {
        return 'createPlan';
    }

    if (normalizedPath === '/contracts') {
        return 'contracts';
    }

    if (normalizedPath.startsWith('/contracts/detail/')) {
        return 'contractDetail';
    }

    if (normalizedPath === '/settings') {
        return 'settings';
    }

    if (normalizedPath.startsWith('/delivery-customization')) {
        return 'deliveryCustomization';
    }

    return 'home';
}

export function buildAppPath(pathname, currentSearch = '') {
    const url = new URL(pathname, window.location.origin);
    const currentParams = new URLSearchParams(currentSearch);

    embeddedQueryKeys.forEach((key) => {
        const value = currentParams.get(key);

        if (value && !url.searchParams.has(key)) {
            url.searchParams.set(key, value);
        }
    });

    return `${url.pathname}${url.search}`;
}

function getCurrentShopDomain(currentSearch = '') {
    const currentParams = new URLSearchParams(currentSearch);

    return currentParams.get('shop') ?? '';
}

function getMetaContent(name) {
    return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? '';
}

function extractShopHandle(shopDomain) {
    return shopDomain.replace(/\.myshopify\.com$/i, '');
}

function extractNumericAdminId(gid) {
    const matches = typeof gid === 'string' ? gid.match(/\/(\d+)$/) : null;

    return matches?.[1] ?? '';
}

export function useAppUrl(pathname) {
    const location = useLocation();

    return buildAppPath(pathname, location.search);
}

export function useAppNavigate() {
    const navigate = useNavigate();
    const location = useLocation();

    return (pathname, options = {}) => {
        navigate(buildAppPath(pathname, location.search), options);
    };
}

export function openShopifyProductAdmin(productId, currentSearch = window.location.search) {
    const shopDomain = getCurrentShopDomain(currentSearch);
    const shopHandle = extractShopHandle(shopDomain);
    const numericProductId = extractNumericAdminId(productId);

    if (!shopHandle || !numericProductId) {
        return false;
    }

    const adminUrl = `https://admin.shopify.com/store/${shopHandle}/products/${numericProductId}`;
    window.open(adminUrl, '_top', 'noopener');

    return true;
}

export function openShopifyThemeProductEditor(currentSearch = window.location.search) {
    const shopDomain = getCurrentShopDomain(currentSearch);
    const apiKey = getMetaContent('shopify-api-key');
    const themeBlockHandle = getMetaContent('shopify-theme-block-handle');

    if (!shopDomain) {
        return false;
    }

    const editorUrl = new URL(`https://${shopDomain}/admin/themes/current/editor`);
    editorUrl.searchParams.set('template', 'product');

    if (apiKey && themeBlockHandle) {
        editorUrl.searchParams.set('addAppBlockId', `${apiKey}/${themeBlockHandle}`);
        editorUrl.searchParams.set('target', 'mainSection');
    }

    window.open(editorUrl.toString(), '_top', 'noopener');

    return true;
}

export function openSubscriptionManagementSettings() {
    const settingsUrl = getMetaContent('shopify-subscription-management-settings-url');

    if (!settingsUrl) {
        return false;
    }

    window.open(settingsUrl, '_top', 'noopener');

    return true;
}

export function openShopifyCustomerNotificationsSettings(currentSearch = window.location.search) {
    const shopDomain = getCurrentShopDomain(currentSearch);
    const shopHandle = extractShopHandle(shopDomain);

    if (!shopHandle) {
        return false;
    }

    const notificationsUrl = `https://admin.shopify.com/store/${shopHandle}/settings/notifications/customer`;
    window.open(notificationsUrl, '_top', 'noopener');

    return true;
}

export function openShopifySubscriptionContracts(currentSearch = window.location.search) {
    const shopDomain = getCurrentShopDomain(currentSearch);
    const shopHandle = extractShopHandle(shopDomain);

    if (!shopHandle) {
        return false;
    }

    const contractsUrl = `https://admin.shopify.com/store/${shopHandle}/apps/subscriptions/contracts`;
    window.open(contractsUrl, '_top', 'noopener');

    return true;
}

export function AppAnchor({ to, onClick, state, ...props }) {
    const href = useAppUrl(to);
    const navigate = useAppNavigate();

    function handleClick(event) {
        onClick?.(event);

        if (!shouldHandleClientNavigation(event)) {
            return;
        }

        event.preventDefault();
        navigate(to, { state });
    }

    return <a {...props} href={href} onClick={handleClick} />;
}

export function AppNavLink({ to, onClick, ...props }) {
    const href = useAppUrl(to);
    const navigate = useAppNavigate();

    function handleClick(event) {
        onClick?.(event);

        if (!shouldHandleClientNavigation(event)) {
            return;
        }

        event.preventDefault();
        navigate(to);
    }

    return <s-link {...props} href={href} onClick={handleClick} />;
}

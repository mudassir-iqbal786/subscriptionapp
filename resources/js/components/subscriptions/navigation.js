export const pageContent = {
    home: {
        title: 'Subscriptions',
    },
    plans: {
        title: 'Plans',
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
};

const embeddedQueryKeys = ['embedded', 'host', 'locale', 'shop'];

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

    if (normalizedPath === '/plans/description') {
        return 'planDescription';
    }

    if (normalizedPath === '/plans/create') {
        return 'createPlan';
    }

    if (normalizedPath === '/contracts') {
        return 'contracts';
    }

    if (normalizedPath === '/contracts/detail') {
        return 'contractDetail';
    }

    if (normalizedPath === '/settings') {
        return 'settings';
    }

    return 'home';
}

export function appUrl(pathname) {
    const url = new URL(pathname, window.location.origin);
    const currentParams = new URLSearchParams(window.location.search);

    embeddedQueryKeys.forEach((key) => {
        const value = currentParams.get(key);

        if (value) {
            url.searchParams.set(key, value);
        }
    });

    return `${url.pathname}${url.search}`;
}

export function navigateTo(pathname) {
    window.location.assign(appUrl(pathname));
}

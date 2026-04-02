export const pageContent = {
    home: {
        title: 'Subscriptions',
    },
    plans: {
        title: 'Plans',
    },
    contracts: {
        title: 'Contracts',
    },
    settings: {
        title: 'Settings',
    },
};

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

    if (normalizedPath === '/contracts') {
        return 'contracts';
    }

    if (normalizedPath === '/settings') {
        return 'settings';
    }

    return 'home';
}

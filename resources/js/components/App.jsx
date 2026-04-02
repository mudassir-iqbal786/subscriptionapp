import { useState } from 'react';
import { TitleBar } from '@shopify/app-bridge-react';

const plans = [
    {
        id: 'starter',
        name: 'Starter Delivery',
        frequency: 'Every 2 weeks',
        discount: '10% off',
        subscribers: 34,
        status: 'Active',
    },
    {
        id: 'monthly',
        name: 'Monthly Refill',
        frequency: 'Every month',
        discount: '12% off',
        subscribers: 18,
        status: 'Draft',
    },
    {
        id: 'vip',
        name: 'VIP Essentials',
        frequency: 'Every 6 weeks',
        discount: '15% off',
        subscribers: 9,
        status: 'Active',
    },
];

const contracts = [
    {
        id: 'SC-1042',
        customer: 'Ava Thompson',
        plan: 'Starter Delivery',
        nextOrder: 'Apr 12, 2026',
        amount: '$48.00',
        status: 'Active',
    },
    {
        id: 'SC-1038',
        customer: 'Noah Garcia',
        plan: 'Monthly Refill',
        nextOrder: 'Apr 18, 2026',
        amount: '$72.00',
        status: 'Paused',
    },
    {
        id: 'SC-1031',
        customer: 'Mia Ali',
        plan: 'VIP Essentials',
        nextOrder: 'Apr 21, 2026',
        amount: '$96.00',
        status: 'Active',
    },
];

const settingsSections = [
    {
        id: 'portal',
        title: 'Customer portal',
        description: 'Allow customers to skip, reschedule, or cancel upcoming orders from their account page.',
        value: 'Enabled',
    },
    {
        id: 'notifications',
        title: 'Email notifications',
        description: 'Send reminders before each renewal and notify customers when a payment fails.',
        value: 'Branded template',
    },
    {
        id: 'billing',
        title: 'Billing retries',
        description: 'Retry failed subscription charges automatically before marking a contract as unpaid.',
        value: '3 retries',
    },
];

const setupSteps = [
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

const pageContent = {
    home: {
        title: 'Subscriptions',
        eyebrow: 'Overview',
        description: 'Launch subscription selling flows, monitor growth, and keep customer operations in one place.',
    },
    plans: {
        title: 'Plans',
        eyebrow: 'Subscription plans',
        description: 'Create and manage selling plans customers can subscribe to from the storefront.',
    },
    contracts: {
        title: 'Contracts',
        eyebrow: 'Active subscriptions',
        description: 'Review customer contracts, renewal dates, billing amounts, and contract status.',
    },
    settings: {
        title: 'Settings',
        eyebrow: 'Subscription configuration',
        description: 'Control customer portal behavior, notification rules, and billing preferences.',
    },
};

function normalizePath(pathname) {
    if (pathname === '/' || pathname === '') {
        return '/';
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function getCurrentPage(pathname) {
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

function StatusPill({ status }) {
    const statusClassName = status.toLowerCase().replace(/\s+/g, '-');

    return <span className={`status-pill status-pill--is-${statusClassName}`}>{status}</span>;
}

function SummaryCard({ label, value, detail }) {
    return (
        <article className="summary-card">
            <s-text className="summary-card__label">{label}</s-text>
            <s-text className="summary-card__value" variant="headingLg">
                {value}
            </s-text>
            <s-text className="summary-card__detail">{detail}</s-text>
        </article>
    );
}

function OverviewPage() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeStepId, setActiveStepId] = useState('account');
    const completedSteps = setupSteps.filter((step) => step.completed).length;
    const completionWidth = `${(completedSteps / setupSteps.length) * 100}%`;

    return (
        <s-page heading="Get started with Shopify Subscriptions" inlineSize="large">
            <s-section padding="none">
                <div className="setup-guide-card">
                    <div className="setup-guide-card__header">
                        <div>
                            <s-text variant="headingSm">Setup guide</s-text>
                            <div className="setup-guide-card__progress">
                                <s-text>
                                    {completedSteps} / {setupSteps.length} completed
                                </s-text>
                                <div aria-hidden="true" className="progress-track">
                                    <span className="progress-track__value" style={{ width: completionWidth }} />
                                </div>
                            </div>
                        </div>

                        <div className="setup-guide-card__tools">
                            <s-button variant="secondary">More</s-button>
                            <button
                                aria-expanded={!isCollapsed}
                                aria-label="Collapse guide"
                                className={`icon-button${isCollapsed ? ' is-collapsed' : ''}`}
                                onClick={() => setIsCollapsed((currentValue) => !currentValue)}
                                type="button"
                            >
                                <span className="icon-button__chevron" />
                            </button>
                        </div>
                    </div>

                    {!isCollapsed ? (
                        <div className="setup-guide-list">
                            {setupSteps.map((step) => {
                                const isActive = step.id === activeStepId;

                                return (
                                    <article
                                        className={`setup-guide-step${isActive ? ' is-active' : ''}${step.completed ? ' is-complete' : ''}`}
                                        key={step.id}
                                        onClick={() => setActiveStepId(step.id)}
                                    >
                                        <div className="setup-guide-step__indicator" aria-hidden="true">
                                            {step.completed ? (
                                                <svg viewBox="0 0 20 20">
                                                    <path
                                                        d="M6 10.25 8.35 12.6 14 7"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                    />
                                                </svg>
                                            ) : null}
                                        </div>

                                        <div className="setup-guide-step__content">
                                            <s-text variant="headingSm">{step.title}</s-text>

                                            {isActive ? (
                                                <div className="setup-guide-step__details">
                                                    <s-text>{step.description}</s-text>
                                                    <s-button variant="primary">{step.action}</s-button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </s-section>

            <s-section>
                <div className="performance-panel">
                    <div className="performance-panel__header">
                        <s-text variant="headingSm">Performance</s-text>
                        <s-text>Mar 26-Apr 2, 2026</s-text>
                    </div>

                    <div className="performance-grid">
                        <article className="performance-grid__range">
                            <span className="performance-grid__range-icon" aria-hidden="true">
                                <svg viewBox="0 0 20 20">
                                    <rect x="4.5" y="5.25" width="11" height="10.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                                    <path d="M7.25 3.75v3M12.75 3.75v3M4.5 8h11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                                </svg>
                            </span>
                            <s-text>7 days</s-text>
                        </article>

                        <SummaryCard label="Subscriptions revenue" value="$0" detail="-" />
                        <SummaryCard label="Active subscriptions" value="0" detail="-" />
                        <SummaryCard label="New subscriptions" value="0" detail="-" />
                        <SummaryCard label="Cancelled subscriptions" value="0" detail="-" />
                    </div>
                </div>
            </s-section>
        </s-page>
    );
}

function PlansPage() {
    return (
        <s-page heading="Subscription plans" inlineSize="large">
            <s-button slot="primary-action" variant="primary">
                Create plan
            </s-button>

            <s-section padding="none">
                <s-table>
                    <div slot="filters" className="polaris-table-filters">
                        <div className="polaris-table-filters__group">
                            <s-button variant="secondary">All</s-button>
                        </div>

                        <s-button accessibilityLabel="Sort plans" variant="secondary">
                            Sort
                        </s-button>
                    </div>

                    <s-table-header-row>
                        <s-table-header listSlot="primary">Plan description</s-table-header>
                        <s-table-header listSlot="inline">Products</s-table-header>
                        <s-table-header listSlot="labeled">Delivery frequency</s-table-header>
                        <s-table-header format="base" listSlot="labeled">
                            Pricing
                        </s-table-header>
                    </s-table-header-row>

                    <s-table-body>
                        <s-table-row>
                            <s-table-cell>Description</s-table-cell>
                            <s-table-cell>3 products</s-table-cell>
                            <s-table-cell>Every week</s-table-cell>
                            <s-table-cell>10% off</s-table-cell>
                        </s-table-row>
                    </s-table-body>
                </s-table>
            </s-section>

            <div className="polaris-page-help">
                <s-text>
                    Learn more about{' '}
                    <s-link href="https://help.shopify.com/" target="_blank">
                        subscription plans
                    </s-link>
                </s-text>
            </div>
        </s-page>
    );
}

function ContractsPage() {
    return (
        <s-page heading="Subscription contracts" inlineSize="large">
            <s-button slot="secondary-actions" variant="secondary">
                Export
            </s-button>
            <s-button slot="secondary-actions" variant="secondary">
                Import
            </s-button>

            <s-section padding="none">
                <s-table>
                    <div slot="filters" className="polaris-table-filters">
                        <div className="polaris-table-filters__group">
                            <s-button variant="secondary">All</s-button>
                            <s-button variant="auto">Active</s-button>
                            <s-button variant="auto">Paused</s-button>
                            <s-button variant="auto">Canceled</s-button>
                        </div>

                        <s-button accessibilityLabel="Sort contracts" variant="secondary">
                            Sort
                        </s-button>
                    </div>

                    <s-table-header-row>
                        <s-table-header listSlot="kicker">Contract</s-table-header>
                        <s-table-header listSlot="primary">Customer</s-table-header>
                        <s-table-header listSlot="secondary">Product</s-table-header>
                        <s-table-header format="currency" listSlot="labeled">
                            Price
                        </s-table-header>
                        <s-table-header listSlot="labeled">Delivery frequency</s-table-header>
                        <s-table-header listSlot="inline">Status</s-table-header>
                    </s-table-header-row>

                    <s-table-body>
                        {contracts.map((contract) => (
                            <s-table-row key={contract.id}>
                                <s-table-cell>{contract.id}</s-table-cell>
                                <s-table-cell>{contract.customer}</s-table-cell>
                                <s-table-cell>{contract.plan}</s-table-cell>
                                <s-table-cell>{contract.amount}</s-table-cell>
                                <s-table-cell>{contract.nextOrder === 'Apr 18, 2026' ? 'Every month' : 'Every week'}</s-table-cell>
                                <s-table-cell>
                                    <s-badge tone={contract.status === 'Paused' ? 'warning' : 'success'}>{contract.status}</s-badge>
                                </s-table-cell>
                            </s-table-row>
                        ))}
                    </s-table-body>
                </s-table>
            </s-section>

            <div className="polaris-page-help">
                <s-text>
                    Learn more about{' '}
                    <s-link href="https://help.shopify.com/" target="_blank">
                        subscription contracts
                    </s-link>
                </s-text>
            </div>
        </s-page>
    );
}

function SettingsPage() {
    return (
        <div className="settings-grid">
            {settingsSections.map((section) => (
                <section className="page-card settings-card" key={section.id}>
                    <div className="settings-card__header">
                        <div>
                            <h2 className="page-card__title">{section.title}</h2>
                            <p className="page-card__subtitle">{section.description}</p>
                        </div>
                        <StatusPill status={section.value} />
                    </div>
                    <button className="secondary-button secondary-button--full" type="button">
                        Edit setting
                    </button>
                </section>
            ))}
        </div>
    );
}

export default function App() {
    const currentPage = getCurrentPage(window.location.pathname);
    const currentPageContent = pageContent[currentPage];

    return (
        <>
            <s-app-nav>
                <s-link href="/plans">Plans</s-link>
                <s-link href="/contracts">Contracts</s-link>
                <s-link href="/settings">Settings</s-link>
            </s-app-nav>

            <TitleBar title={currentPageContent.title}>
                {currentPage !== 'home' ? (
                    <a href="/" variant="breadcrumb">
                        Subscriptions
                    </a>
                ) : null}
            </TitleBar>

            <main className="app-shell">
                {currentPage === 'home' ? <OverviewPage /> : null}
                {currentPage !== 'home' && currentPage !== 'plans' && currentPage !== 'contracts' ? (
                    <section className="hero-card">
                        <div className="hero-card__content">
                            <span className="hero-card__eyebrow">{currentPageContent.eyebrow}</span>
                            <h1>{currentPageContent.title}</h1>
                            <p>{currentPageContent.description}</p>
                        </div>
                        <div className="hero-card__badge">Shopify App Bridge</div>
                    </section>
                ) : null}
                {currentPage === 'plans' ? <PlansPage /> : null}
                {currentPage === 'contracts' ? <ContractsPage /> : null}
                {currentPage === 'settings' ? <SettingsPage /> : null}
            </main>
        </>
    );
}

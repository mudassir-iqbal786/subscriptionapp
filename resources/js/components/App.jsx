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
        completed: false,
    },
    {
        id: 'notifications',
        title: 'Customize notifications',
        description: 'Match renewal reminders and payment emails to your storefront branding.',
        action: 'Edit emails',
        completed: false,
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
            <span className="summary-card__label">{label}</span>
            <strong className="summary-card__value">{value}</strong>
            <span className="summary-card__detail">{detail}</span>
        </article>
    );
}

function OverviewPage() {
    const completedSteps = setupSteps.filter((step) => step.completed).length;
    const completionWidth = `${(completedSteps / setupSteps.length) * 100}%`;

    return (
        <>
            <section className="summary-grid">
                <SummaryCard label="Subscriptions revenue" value="$8,240" detail="Last 30 days" />
                <SummaryCard label="Active subscriptions" value="61" detail="Across 3 plans" />
                <SummaryCard label="Renewals due" value="12" detail="Next 7 days" />
            </section>

            <section className="page-card">
                <div className="page-card__header">
                    <div>
                        <h2 className="page-card__title">Setup guide</h2>
                        <div className="progress-meta">
                            <span>
                                {completedSteps} / {setupSteps.length} completed
                            </span>
                            <div aria-hidden="true" className="progress-track">
                                <span className="progress-track__value" style={{ width: completionWidth }} />
                            </div>
                        </div>
                    </div>
                    <button className="secondary-button" type="button">
                        View checklist
                    </button>
                </div>

                <div className="step-list">
                    {setupSteps.map((step) => (
                        <article className={`step-card${step.completed ? ' is-complete' : ''}`} key={step.id}>
                            <div className="step-card__marker" aria-hidden="true">
                                {step.completed ? 'OK' : ''}
                            </div>
                            <div className="step-card__body">
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </div>
                            <button className="secondary-button" type="button">
                                {step.action}
                            </button>
                        </article>
                    ))}
                </div>
            </section>
        </>
    );
}

function PlansPage() {
    return (
        <section className="page-card">
            <div className="page-card__header">
                <div>
                    <h2 className="page-card__title">Selling plans</h2>
                    <p className="page-card__subtitle">Create offers for prepaid, pay-as-you-go, or curated bundles.</p>
                </div>
                <button className="primary-button" type="button">
                    Create plan
                </button>
            </div>

            <div className="data-table">
                <div className="data-table__head">
                    <span>Plan name</span>
                    <span>Frequency</span>
                    <span>Discount</span>
                    <span>Subscribers</span>
                    <span>Status</span>
                </div>

                {plans.map((plan) => (
                    <article className="data-table__row" key={plan.id}>
                        <strong>{plan.name}</strong>
                        <span>{plan.frequency}</span>
                        <span>{plan.discount}</span>
                        <span>{plan.subscribers}</span>
                        <StatusPill status={plan.status} />
                    </article>
                ))}
            </div>
        </section>
    );
}

function ContractsPage() {
    return (
        <section className="page-card">
            <div className="page-card__header">
                <div>
                    <h2 className="page-card__title">Customer contracts</h2>
                    <p className="page-card__subtitle">Track renewals, customer plan changes, and paused contracts.</p>
                </div>
                <button className="secondary-button" type="button">
                    Export contracts
                </button>
            </div>

            <div className="data-table">
                <div className="data-table__head data-table__head--contracts">
                    <span>Contract</span>
                    <span>Customer</span>
                    <span>Plan</span>
                    <span>Next order</span>
                    <span>Amount</span>
                    <span>Status</span>
                </div>

                {contracts.map((contract) => (
                    <article className="data-table__row data-table__row--contracts" key={contract.id}>
                        <strong>{contract.id}</strong>
                        <span>{contract.customer}</span>
                        <span>{contract.plan}</span>
                        <span>{contract.nextOrder}</span>
                        <span>{contract.amount}</span>
                        <StatusPill status={contract.status} />
                    </article>
                ))}
            </div>
        </section>
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
                <section className="hero-card">
                    <div className="hero-card__content">
                        <span className="hero-card__eyebrow">{currentPageContent.eyebrow}</span>
                        <h1>{currentPageContent.title}</h1>
                        <p>{currentPageContent.description}</p>
                    </div>
                    <div className="hero-card__badge">Shopify App Bridge</div>
                </section>

                {currentPage === 'plans' ? <PlansPage /> : null}
                {currentPage === 'contracts' ? <ContractsPage /> : null}
                {currentPage === 'settings' ? <SettingsPage /> : null}
                {currentPage === 'home' ? <OverviewPage /> : null}
            </main>
        </>
    );
}

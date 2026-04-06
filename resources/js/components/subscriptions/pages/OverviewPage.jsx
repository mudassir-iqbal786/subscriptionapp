import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contractsQueryKey, fetchContracts } from '../contractQueries.js';
import { defaultSettings } from '../data.js';
import {
    openShopifyCustomerNotificationsSettings,
    openShopifyThemeProductEditor,
    openSubscriptionManagementSettings,
    useAppNavigate,
} from '../navigation.jsx';
import { fetchPlans, plansQueryKey } from '../planQueries.js';
import { fetchSettings, settingsQueryKey } from '../settingsQueries.js';
import SummaryCard from '../shared/SummaryCard.jsx';

export default function OverviewPage() {
    const navigateTo = useAppNavigate();
    const { data: plans = [] } = useQuery({
        queryKey: plansQueryKey,
        queryFn: fetchPlans,
    });
    const { data: contracts = [] } = useQuery({
        queryKey: contractsQueryKey,
        queryFn: fetchContracts,
    });
    const { data: savedSettings = defaultSettings } = useQuery({
        queryKey: settingsQueryKey,
        queryFn: fetchSettings,
    });
    const [isCollapsed, setIsCollapsed] = useState(false);

    const activeContractCount = contracts.filter((contract) => contract.status === 'Active').length;
    const cancelledContractCount = contracts.filter((contract) => contract.status === 'Canceled').length;
    const revenue = contracts.reduce((totalRevenue, contract) => totalRevenue + (contract.amountValue ?? 0), 0);
    const currentDate = new Date();
    const newSubscriptions = contracts.filter((contract) => {
        const createdAt = new Date(contract.createdAt);

        return (
            !Number.isNaN(createdAt.getTime()) &&
            createdAt.getFullYear() === currentDate.getFullYear() &&
            createdAt.getMonth() === currentDate.getMonth()
        );
    }).length;
    const setupSteps = useMemo(() => {
        return [
            {
                id: 'plan',
                title: 'Create your first subscription plan',
                description: 'Set billing and delivery frequency for the products you want to sell on subscription.',
                action: 'Create plan',
                completed: plans.length > 0,
                destination: '/plans/create',
            },
            {
                id: 'products',
                title: 'Add subscriptions to product pages',
                description: 'Let customers purchase products with subscription options on your online store. Customize the widget to match your theme.',
                action: 'Add subscription widget',
                completed: plans.some((plan) => (plan.productCount ?? 0) > 0),
                destination: '/settings',
            },
            {
                id: 'portal',
                title: 'Allow customers to manage subscriptions',
                description: 'Customers log in to their account to update payment and shipping information, or pause, skip, and cancel',
                action: 'Turn on subscription management',
                completed: contracts.length > 0,
                destination: '/contracts',
            },
            {
                id: 'account',
                title: 'Allow customer to access account post purchase',
                description: 'Customers can access their account from your thank you page',
                action: 'Add subscription link',
                completed: savedSettings.setupProgress.accountAccessEnabled,
                destination: '/settings',
            },
            {
                id: 'notifications',
                title: 'Customize notifications',
                description: 'Match renewal reminders and payment emails to your storefront branding.',
                action: 'Edit notifications',
                completed: savedSettings.setupProgress.notificationsCustomized,
                destination: '/settings',
            },
        ];
    }, [contracts.length, plans, savedSettings]);
    const [activeStepId, setActiveStepId] = useState('plan');

    useEffect(() => {
        const firstIncompleteStep = setupSteps.find((step) => !step.completed)?.id ?? setupSteps[0].id;
        setActiveStepId(firstIncompleteStep);
    }, [setupSteps]);

    const completedSteps = setupSteps.filter((step) => step.completed).length;
    const completionWidth = `${(completedSteps / setupSteps.length) * 100}%`;

    function handleStepAction(step) {
        if (step.id === 'products') {
            const didOpenProduct = openShopifyThemeProductEditor();

            if (didOpenProduct) {
                return;
            }
        }

        if (step.id === 'portal') {
            const didOpenSettings = openSubscriptionManagementSettings();

            if (didOpenSettings) {
                return;
            }
        }

        if (step.id === 'account') {
            const didOpenSettings = openSubscriptionManagementSettings();

            if (didOpenSettings) {
                return;
            }
        }

        if (step.id === 'notifications') {
            const didOpenNotifications = openShopifyCustomerNotificationsSettings();

            if (didOpenNotifications) {
                return;
            }
        }

        navigateTo(step.destination);
    }

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
                                                    <s-button onClick={() => handleStepAction(step)} variant="primary">
                                                        {step.action}
                                                    </s-button>
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

                        <SummaryCard label="Subscriptions revenue" value={`$${revenue.toFixed(2)}`} detail={`${contracts.length} tracked contracts`} />
                        <SummaryCard label="Active subscriptions" value={String(activeContractCount)} detail={`${plans.length} active plans`} />
                        <SummaryCard label="New subscriptions" value={String(newSubscriptions)} detail="Started this month" />
                        <SummaryCard label="Cancelled subscriptions" value={String(cancelledContractCount)} detail="Requires follow-up" />
                    </div>
                </div>
            </s-section>
        </s-page>
    );
}

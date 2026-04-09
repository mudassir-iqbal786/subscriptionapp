import { BarChart, DonutChart, LineChart } from '@shopify/polaris-viz';
import { ChartState } from '@shopify/polaris-viz-core';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { allContractsQueryKey, fetchAllContracts } from '../contractQueries.js';
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

function formatCurrency(value, currencyCode = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatCompactDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
    }).format(date);
}

function formatLongDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function normalizeContractDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function createRecentDayBuckets(totalDays) {
    return Array.from({ length: totalDays }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (totalDays - index - 1));

        return {
            isoKey: date.toISOString().slice(0, 10),
            label: formatCompactDate(date),
            fullLabel: formatLongDate(date),
            value: 0,
            count: 0,
        };
    });
}

function getOverviewChartState(isLoading, isError) {
    if (isLoading) {
        return ChartState.Loading;
    }

    if (isError) {
        return ChartState.Error;
    }

    return ChartState.Success;
}

const overviewChartTheme = 'overviewCompact';

export default function OverviewPage() {
    const revenueRangeOptions = [7, 30, 90];
    const navigateTo = useAppNavigate();
    const queryClient = useQueryClient();
    const { data: plans = [] } = useQuery({
        queryKey: plansQueryKey,
        queryFn: fetchPlans,
    });
    const {
        data: contracts = [],
        isLoading: isContractsLoading,
        isError: isContractsError,
    } = useQuery({
        queryKey: allContractsQueryKey,
        queryFn: () => fetchAllContracts(),
    });
    const { data: savedSettings = defaultSettings } = useQuery({
        queryKey: settingsQueryKey,
        queryFn: fetchSettings,
    });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeStepId, setActiveStepId] = useState('plan');
    const [lastRefreshAt, setLastRefreshAt] = useState(null);
    const [revenueRangeDays, setRevenueRangeDays] = useState(30);

    useEffect(() => {
        const pusherAppKey = document.querySelector('meta[name="pusher-app-key"]')?.getAttribute('content') ?? '';
        const pusherAppCluster = document.querySelector('meta[name="pusher-app-cluster"]')?.getAttribute('content') ?? '';
        const contractsBroadcastChannel = document.querySelector('meta[name="contracts-broadcast-channel"]')?.getAttribute('content') ?? '';

        if (pusherAppKey === '' || pusherAppCluster === '' || contractsBroadcastChannel === '') {
            return undefined;
        }

        const echo = new Echo({
            broadcaster: 'pusher',
            client: new Pusher(pusherAppKey, {
                cluster: pusherAppCluster,
                forceTLS: true,
            }),
        });

        const channel = echo.channel(contractsBroadcastChannel);

        channel.listen('.contract.created', async (event) => {
            const contractLabel = event?.contractId ? ` ${event.contractId}` : '';
            const notificationMessage = `Live dashboard updated for subscription contract${contractLabel}.`;

            window.shopify?.toast?.show?.(notificationMessage);
            await queryClient.invalidateQueries({ queryKey: allContractsQueryKey });
            await queryClient.refetchQueries({ queryKey: allContractsQueryKey, type: 'active' });
            setLastRefreshAt(new Date());
        });

        return () => {
            echo.leave(contractsBroadcastChannel);
            echo.disconnect();
        };
    }, [queryClient]);

    const activeContractCount = contracts.filter((contract) => contract.status === 'Active').length;
    const pausedContractCount = contracts.filter((contract) => contract.status === 'Paused').length;
    const cancelledContractCount = contracts.filter((contract) => contract.status === 'Canceled').length;
    const revenue = contracts.reduce((totalRevenue, contract) => totalRevenue + (contract.amountValue ?? 0), 0);
    const currentDate = new Date();
    const newSubscriptions = contracts.filter((contract) => {
        const createdAt = normalizeContractDate(contract.createdAt);

        return (
            createdAt !== null &&
            createdAt.getFullYear() === currentDate.getFullYear() &&
            createdAt.getMonth() === currentDate.getMonth()
        );
    }).length;
    const currencyCode = contracts.find((contract) => contract.currencyCode)?.currencyCode ?? 'USD';
    const summaryMetrics = useMemo(() => {
        return [
            {
                id: 'revenue',
                label: 'Subscriptions revenue',
                value: formatCurrency(revenue, currencyCode),
                detail: `${contracts.length} tracked contracts`,
            },
            {
                id: 'active',
                label: 'Active subscriptions',
                value: String(activeContractCount),
                detail: `${plans.length} active plans`,
            },
            {
                id: 'new',
                label: 'New subscriptions',
                value: String(newSubscriptions),
                detail: 'Started this month',
            },
            {
                id: 'cancelled',
                label: 'Cancelled subscriptions',
                value: String(cancelledContractCount),
                detail: `${pausedContractCount} paused contracts`,
            },
        ];
    }, [activeContractCount, cancelledContractCount, contracts.length, currencyCode, newSubscriptions, pausedContractCount, plans.length, revenue]);

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

    useEffect(() => {
        const firstIncompleteStep = setupSteps.find((step) => !step.completed)?.id ?? setupSteps[0].id;
        setActiveStepId(firstIncompleteStep);
    }, [setupSteps]);

    const completedSteps = setupSteps.filter((step) => step.completed).length;
    const completionWidth = `${(completedSteps / setupSteps.length) * 100}%`;

    const chartState = getOverviewChartState(isContractsLoading, isContractsError);

    const revenueTrendData = useMemo(() => {
        const dayBuckets = createRecentDayBuckets(revenueRangeDays);
        const bucketMap = new Map(dayBuckets.map((bucket) => [bucket.isoKey, bucket]));

        contracts.forEach((contract) => {
            const createdAt = normalizeContractDate(contract.createdAt);

            if (createdAt === null) {
                return;
            }

            const isoKey = createdAt.toISOString().slice(0, 10);
            const bucket = bucketMap.get(isoKey);

            if (!bucket) {
                return;
            }

            bucket.value += contract.amountValue ?? 0;
            bucket.count += 1;
        });

        return [
            {
                name: 'Revenue',
                data: dayBuckets.map((bucket) => ({
                    key: bucket.label,
                    value: Number(bucket.value.toFixed(2)),
                })),
                metadata: {
                    periodLabel: dayBuckets.map((bucket) => bucket.fullLabel),
                },
            },
        ];
    }, [contracts, revenueRangeDays]);

    const planPerformanceData = useMemo(() => {
        const totalsByPlan = contracts.reduce((planTotals, contract) => {
            const planName = contract.plan ?? contract.productTitle ?? 'Unassigned plan';
            const currentValue = planTotals.get(planName) ?? 0;

            planTotals.set(planName, currentValue + (contract.amountValue ?? 0));

            return planTotals;
        }, new Map());

        return [
            {
                name: 'Revenue by plan',
                data: Array.from(totalsByPlan.entries())
                    .sort((left, right) => right[1] - left[1])
                    .slice(0, 5)
                    .map(([planName, totalRevenue]) => ({
                        key: planName,
                        value: Number(totalRevenue.toFixed(2)),
                    })),
            },
        ];
    }, [contracts]);

    const statusBreakdownData = useMemo(() => {
        return ['Active', 'Paused', 'Canceled']
            .map((status) => ({
                name: status,
                data: [
                    {
                        key: status,
                        value: contracts.filter((contract) => contract.status === status).length,
                    },
                ],
            }))
            .filter((series) => (series.data[0]?.value ?? 0) > 0);
    }, [contracts]);

    const latestContractDate = useMemo(() => {
        const timestamps = contracts
            .map((contract) => normalizeContractDate(contract.createdAt))
            .filter((date) => date !== null)
            .map((date) => date.getTime());

        if (timestamps.length === 0) {
            return null;
        }

        return new Date(Math.max(...timestamps));
    }, [contracts]);

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
                {/*<div className="setup-guide-card">*/}
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
                                        <div aria-hidden="true" className="setup-guide-step__indicator">
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
                {/*</div>*/}
            </s-section>

            <s-section>
                <div className="performance-panel">
                    <div className="performance-panel__header">
                        <div>
                            <s-text variant="headingSm">Live subscription performance</s-text>
                            <s-text>
                                {lastRefreshAt
                                    ? `Live update received ${lastRefreshAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                                    : 'Streaming from your latest subscription contracts'}
                            </s-text>
                        </div>
                        <s-badge tone="success">{latestContractDate ? `Latest contract ${formatLongDate(latestContractDate)}` : 'Waiting for contract data'}</s-badge>
                    </div>

                    <div className="performance-grid">
                        <article className="performance-grid__range">
                            <span aria-hidden="true" className="performance-grid__range-icon">
                                <svg viewBox="0 0 20 20">
                                    <rect x="4.5" y="5.25" width="11" height="10.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                                    <path d="M7.25 3.75v3M12.75 3.75v3M4.5 8h11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                                </svg>
                            </span>
                            <s-text>Live overview</s-text>
                        </article>

                        {summaryMetrics.map((metric) => (
                            <SummaryCard
                                detail={metric.detail}
                                key={`${metric.id}-${metric.value}-${metric.detail}`}
                                label={metric.label}
                                value={metric.value}
                            />
                        ))}
                    </div>

                    <div className="overview-chart-grid">
                        <article className="overview-chart-card overview-chart-card--wide">
                            <div className="overview-chart-card__header">
                                <div>
                                    <h2>Revenue trend</h2>
                                    <p>Daily subscription revenue from the last {revenueRangeDays} days.</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <s-select onChange={(event) => setRevenueRangeDays(Number(event.currentTarget.value))} value={String(revenueRangeDays)}>
                                        {revenueRangeOptions.map((option) => (
                                            <s-option key={option} value={String(option)}>
                                                Last {option} days
                                            </s-option>
                                        ))}
                                    </s-select>
                                    <s-badge tone="success">Live</s-badge>
                                </div>
                            </div>

                            <div className="overview-chart-frame overview-chart-frame--line">
                                <LineChart
                                    data={revenueTrendData}
                                    emptyStateText="Revenue will appear here once subscription contracts start coming in."
                                    isAnimated
                                    showLegend={false}
                                    state={chartState}
                                    theme={overviewChartTheme}
                                    xAxisOptions={{
                                        labelFormatter: (value) => `${value}`,
                                    }}
                                    yAxisOptions={{
                                        labelFormatter: (value) => formatCurrency(Number(value ?? 0), currencyCode),
                                    }}
                                />
                            </div>
                        </article>

                        <article className="overview-chart-card">
                            <div className="overview-chart-card__header">
                                <div>
                                    <h2>Status mix</h2>
                                    <p>Current contract distribution by lifecycle status.</p>
                                </div>
                                <s-badge tone="warning">{contracts.length} contracts</s-badge>
                            </div>

                            {statusBreakdownData.length > 0 ? (
                                <div className="overview-chart-frame overview-chart-frame--donut">
                                    <DonutChart
                                        data={statusBreakdownData}
                                        isAnimated
                                        legendPosition="right"
                                        showLegend
                                        showLegendValues
                                        theme={overviewChartTheme}
                                    />
                                </div>
                            ) : (
                                <div className="overview-chart-card__empty">No subscription statuses are available yet.</div>
                            )}
                        </article>

                        <article className="overview-chart-card overview-chart-card--wide">
                            <div className="overview-chart-card__header">
                                <div>
                                    <h2>Top plans by revenue</h2>
                                    <p>Highest earning plans across all tracked contracts.</p>
                                </div>
                                <s-badge tone="success">Live</s-badge>
                            </div>

                            <div className="overview-chart-frame overview-chart-frame--bar">
                                <BarChart
                                    data={planPerformanceData}
                                    direction="horizontal"
                                    emptyStateText="Plan performance will show here after contracts are linked to selling plans."
                                    isAnimated
                                    showLegend={false}
                                    state={chartState}
                                    theme={overviewChartTheme}
                                    xAxisOptions={{
                                        labelFormatter: (value) => formatCurrency(Number(value ?? 0), currencyCode),
                                    }}
                                />
                            </div>
                        </article>
                    </div>
                </div>
            </s-section>
        </s-page>
    );
}

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useAppNavigate } from '../navigation.jsx';
import { fetchPlans, plansQueryKey } from '../planQueries.js';

export default function PlansPage() {
    const navigateTo = useAppNavigate();
    const [sortBy, setSortBy] = useState('create');
    const [sortDirection, setSortDirection] = useState('desc');
    const { data: plans = [], error, isLoading } = useQuery({
        queryKey: plansQueryKey,
        queryFn: fetchPlans,
    });

    const searchError = error ? 'Unable to load Shopify plans right now.' : '';
    const sortedPlans = useMemo(() => {
        return [...plans].sort((leftPlan, rightPlan) => {
            const leftValue = Date.parse(
                sortBy === 'update'
                    ? leftPlan.updatedAt ?? leftPlan.createdAt ?? ''
                    : leftPlan.createdAt ?? leftPlan.updatedAt ?? ''
            );
            const rightValue = Date.parse(
                sortBy === 'update'
                    ? rightPlan.updatedAt ?? rightPlan.createdAt ?? ''
                    : rightPlan.createdAt ?? rightPlan.updatedAt ?? ''
            );
            const normalizedLeftValue = Number.isNaN(leftValue) ? 0 : leftValue;
            const normalizedRightValue = Number.isNaN(rightValue) ? 0 : rightValue;

            if (sortDirection === 'asc') {
                return normalizedLeftValue - normalizedRightValue;
            }

            return normalizedRightValue - normalizedLeftValue;
        });
    }, [plans, sortBy, sortDirection]);

    function formatPricing(plan) {
        const firstPlan = plan.plans?.[0];

        if (!firstPlan) {
            return 'N/A';
        }

        if (firstPlan.discountType === 'No discount' || !firstPlan.percentageOff) {
            return 'No discount';
        }

        return firstPlan.discountType === 'Fixed amount off'
            ? `${firstPlan.percentageOff} ${firstPlan.pricingPolicy?.adjustmentValue?.currencyCode ?? ''}`.trim()
            : `${firstPlan.percentageOff}% off`;
    }

    function formatFrequency(plan) {
        const firstPlan = plan.plans?.[0];

        if (!firstPlan) {
            return 'N/A';
        }

        return `Every ${firstPlan.frequencyValue ?? '1'} ${(firstPlan.frequencyUnit ?? 'Weeks').toLowerCase()}`;
    }

    return (
        <s-page inlineSize="large">
            <div className="plans-page-topbar">
                <h1>Subscription plans</h1>

                <s-button className=""  variant="primary" onClick={() => navigateTo('/plans/create')} type="button">
                    Create plan
                </s-button>
            </div>

            <s-section padding="none">
                <s-table>
                    <div slot="filters" className="polaris-table-filters">
                        <div className="polaris-table-filters__group">
                            <s-button variant="secondary">All</s-button>
                        </div>

                        {/*<s-button accessibilityLabel="Sort plans" variant="secondary">*/}
                        {/*    Sort*/}
                        {/*</s-button>*/}

                        <s-button commandFor="organized-menu">Sort</s-button>

                        <s-menu id="organized-menu" accessibilityLabel="Organized menu">
                            <s-section heading="Sort By">
                                <s-button
                                    icon={sortBy === 'create' ? 'checkmark' : undefined}
                                    variant={sortBy === 'create' ? 'primary' : 'tertiary'}
                                    onClick={() => setSortBy('create')}
                                >
                                    Created
                                </s-button>
                                <s-button
                                    icon={sortBy === 'update' ? 'checkmark' : undefined}
                                    variant={sortBy === 'update' ? 'primary' : 'tertiary'}
                                    onClick={() => setSortBy('update')}
                                >
                                    Updated
                                </s-button>
                            </s-section>
                            <s-section>
                                <s-button icon="arrow-up" variant={sortDirection === 'asc' ? 'primary' : 'secondary'} onClick={() => setSortDirection('asc')}>
                                    Oldest First
                                </s-button>
                                <s-button icon="arrow-down" variant={sortDirection === 'desc' ? 'primary' : 'secondary'} onClick={() => setSortDirection('desc')}>
                                    Newest First
                                </s-button>
                            </s-section>
                        </s-menu>
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
                        {isLoading ? (
                            <s-table-row>
                                <s-table-cell>Loading plans...</s-table-cell>
                            </s-table-row>
                        ) : null}

                        {searchError && !isLoading ? (
                            <s-table-row>
                                <s-table-cell>{searchError}</s-table-cell>
                            </s-table-row>
                        ) : null}

                        {sortedPlans.map((plan) => (
                            <s-table-row
                                className="plans-table-row"
                                key={plan.id}
                                onClick={() => navigateTo(`/plans/description/${encodeURIComponent(plan.id)}`)}
                            >
                                <s-table-cell>
                                    <button className="plans-table-row__link" type="button">
                                        {plan.plans?.[0]?.description ?? 'N/A'}
                                    </button>
                                </s-table-cell>
                                <s-table-cell>{plan.productCount === 1 ? '1 product' : `${plan.productCount ?? 0} products`}</s-table-cell>
                                <s-table-cell>{formatFrequency(plan)}</s-table-cell>
                                <s-table-cell>{formatPricing(plan)}</s-table-cell>
                            </s-table-row>
                        ))}
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

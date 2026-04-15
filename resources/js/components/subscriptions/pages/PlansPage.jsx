import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppNavigate } from '../navigation.jsx';
import { fetchPlansPage, plansQueryKey } from '../planQueries.js';

const plansPageSize = 12;

export default function PlansPage() {
    const navigateTo = useAppNavigate();
    const tableRef = useRef(null);
    const [sortBy, setSortBy] = useState('create');
    const [sortDirection, setSortDirection] = useState('desc');
    const [paginationCursor, setPaginationCursor] = useState({
        after: null,
        before: null,
        page: 1,
    });
    const { data, error, isFetching, isLoading } = useQuery({
        queryKey: [...plansQueryKey, 'page', paginationCursor.after, paginationCursor.before, plansPageSize],
        queryFn: () => fetchPlansPage({
            after: paginationCursor.after,
            before: paginationCursor.before,
            limit: plansPageSize,
        }),
    });

    const plans = data?.plans ?? [];
    const pagination = data?.pagination ?? {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
    };
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

    useEffect(() => {
        const table = tableRef.current;

        if (!table) {
            return undefined;
        }

        function handleNextPage() {
            if (!pagination.hasNextPage || pagination.endCursor === null) {
                return;
            }

            setPaginationCursor((currentPaginationCursor) => ({
                after: pagination.endCursor,
                before: null,
                page: currentPaginationCursor.page + 1,
            }));
        }

        function handlePreviousPage() {
            if (!pagination.hasPreviousPage || pagination.startCursor === null) {
                return;
            }

            setPaginationCursor((currentPaginationCursor) => ({
                after: null,
                before: pagination.startCursor,
                page: Math.max(1, currentPaginationCursor.page - 1),
            }));
        }

        table.addEventListener('nextpage', handleNextPage);
        table.addEventListener('previouspage', handlePreviousPage);

        return () => {
            table.removeEventListener('nextpage', handleNextPage);
            table.removeEventListener('previouspage', handlePreviousPage);
        };
    }, [pagination.endCursor, pagination.hasNextPage, pagination.hasPreviousPage, pagination.startCursor]);

    function updateSortBy(nextSortBy) {
        setSortBy(nextSortBy);
        setPaginationCursor({
            after: null,
            before: null,
            page: 1,
        });
    }

    function updateSortDirection(nextSortDirection) {
        setSortDirection(nextSortDirection);
        setPaginationCursor({
            after: null,
            before: null,
            page: 1,
        });
    }

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

                <s-button className="" variant="primary" onClick={() => navigateTo('/plans/create')} type="button">
                    Create plan
                </s-button>
            </div>

            <s-section padding="none">
                <s-table
                    hasNextPage={pagination.hasNextPage}
                    hasPreviousPage={pagination.hasPreviousPage}
                    loading={isFetching}
                    paginate
                    ref={tableRef}
                >
                    <div slot="filters" className="polaris-table-filters">
                        <div className="polaris-table-filters__group">
                            <s-button variant="secondary">All</s-button>
                            <s-text>Page {paginationCursor.page}</s-text>
                        </div>

                        {/*<s-button accessibilityLabel="Sort plans" variant="secondary">*/}
                        {/*    Sort*/}
                        {/*</s-button>*/}

                        <s-button commandFor="organized-menu" icon="sort">Sort</s-button>

                        <s-menu id="organized-menu" accessibilityLabel="Organized menu">
                            <s-section heading="Sort By">
                                <s-button
                                    icon={sortBy === 'create' ? 'checkmark' : undefined}
                                    variant={sortBy === 'create' ? 'primary' : 'tertiary'}
                                    onClick={() => updateSortBy('create')}
                                >
                                    Created
                                </s-button>
                                <s-button
                                    icon={sortBy === 'update' ? 'checkmark' : undefined}
                                    variant={sortBy === 'update' ? 'primary' : 'tertiary'}
                                    onClick={() => updateSortBy('update')}
                                >
                                    Updated
                                </s-button>
                            </s-section>
                            <s-section>
                                <s-button icon="arrow-up" variant={sortDirection === 'asc' ? 'primary' : 'secondary'} onClick={() => updateSortDirection('asc')}>
                                    Oldest First
                                </s-button>
                                <s-button icon="arrow-down" variant={sortDirection === 'desc' ? 'primary' : 'secondary'} onClick={() => updateSortDirection('desc')}>
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

                        {!isLoading && !searchError && sortedPlans.length === 0 ? (
                            <s-table-row>
                                <s-table-cell>No subscription plans found.</s-table-cell>
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

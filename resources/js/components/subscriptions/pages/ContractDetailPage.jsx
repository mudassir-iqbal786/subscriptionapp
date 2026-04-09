import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { contractDetailQueryKey, fetchContractDetail } from '../contractQueries.js';
import { AppAnchor } from '../navigation.jsx';




function getStatusTone(status) {
    if (status === 'Paused') {
        return 'warning';
    }

    if (status === 'Canceled') {
        return 'critical';
    }

    return 'success';
}

function PencilIcon() {
    return (
        <svg aria-hidden="true" className="contract-icon contract-icon--pencil" viewBox="0 0 20 20">
            <path
                d="M13.8 3.6a1.7 1.7 0 0 1 2.4 0l.2.2a1.7 1.7 0 0 1 0 2.4l-8.2 8.2-3.2.8.8-3.2 8-8.4Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
            />
            <path d="m11.9 5.5 2.6 2.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
    );
}

function DiscountIcon() {
    return (
        <svg aria-hidden="true" className="contract-icon" viewBox="0 0 20 20">
            <path
                d="M10 2.8 12 4l2.3-.2.8 2.1 1.8 1.4-1 2 .3 2.2-2 .8-1.2 1.9-2.2-.5-2 1-1.4-1.7-2.2-.4.1-2.3L3 10l1.4-1.8.1-2.2 2.2-.4 1.3-1.8 2 .8Z"
                fill="none"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.3"
            />
            <path d="m7.3 12.7 5.4-5.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
            <circle cx="7" cy="7.2" r="1" fill="currentColor" />
            <circle cx="13" cy="12.8" r="1" fill="currentColor" />
        </svg>
    );
}

function DeliveryIcon() {
    return (
        <svg aria-hidden="true" className="contract-icon" viewBox="0 0 20 20">
            <path
                d="M3 6.2h9v5.8H3zM12 8h2.7l2.3 2.3v1.7H12zM6 14.2a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0Zm9.2 0a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
            />
        </svg>
    );
}

function SectionEditButton({ label = 'Edit' }) {
    return (
        <button aria-label={label} className="contract-card__icon-button" type="button">
            <PencilIcon />
        </button>
    );
}

function ProductThumb({ imageUrl, title }) {
    if (imageUrl) {
        return <img alt={title} className="contract-product__thumb contract-product__thumb--image" src={imageUrl} />;
    }

    return <span className="contract-product__thumb" aria-hidden="true">{String(title ?? '?').trim().charAt(0).toUpperCase()}</span>;
}

export default function ContractDetailPage() {
    const { contractId = '' } = useParams();
    const queryClient = useQueryClient();
    const [actionError, setActionError] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isPausing, setIsPausing] = useState(false);
    const [isResuming, setIsResuming] = useState(false);
    const [isShowingAllUpcomingOrders, setIsShowingAllUpcomingOrders] = useState(false);


    const { data: contract, isLoading, isError, error } = useQuery({
        queryKey: contractDetailQueryKey(contractId),
        queryFn: () => fetchContractDetail(contractId),
        enabled: contractId !== '',
    });

    useEffect(() => {
        if (contractId === '' || contract?.isImported) {
            return undefined;
        }

        let eventSource = null;
        let reconnectTimeoutId = null;
        let isClosed = false;

        const connectToStream = async () => {
            const sessionToken = await window.refreshSessionToken();

            if (isClosed || !sessionToken) {
                return;
            }

            const currentUrl = new URL(window.location.href);
            const streamUrl = new URL('/contracts/stream', window.location.origin);

            streamUrl.searchParams.set('token', sessionToken);

            ['shop', 'host', 'locale', 'session'].forEach((parameter) => {
                const value = currentUrl.searchParams.get(parameter);

                if (value) {
                    streamUrl.searchParams.set(parameter, value);
                }
            });

            eventSource = new window.EventSource(streamUrl.toString());

            eventSource.addEventListener('subscription-contract-updated', async (event) => {
                const payload = JSON.parse(event.data ?? '{}');

                if (payload.contractId && payload.contractId !== contractId) {
                    return;
                }

                await queryClient.invalidateQueries({ queryKey: contractDetailQueryKey(contractId) });
                await queryClient.invalidateQueries({ queryKey: ['contracts'] });
            });

            eventSource.onerror = () => {
                eventSource?.close();

                if (! isClosed) {
                    reconnectTimeoutId = window.setTimeout(() => {
                        void connectToStream();
                    }, 3000);
                }
            };
        };

        void connectToStream();

        return () => {
            isClosed = true;

            if (reconnectTimeoutId !== null) {
                window.clearTimeout(reconnectTimeoutId);
            }

            eventSource?.close();
        };
    }, [contract?.isImported, contractId, queryClient]);

    async function handleCancelledSubscription() {
        if (contractId === '' || isCancelling || contract?.status === 'Canceled' || contract?.isImported) {
            return;
        }

        setActionError('');
        setIsCancelling(true);

        try {
            await window.axios.post(`/api/contracts/${encodeURIComponent(contractId)}/cancel`);
            await queryClient.invalidateQueries({ queryKey: contractDetailQueryKey(contractId) });
            await queryClient.invalidateQueries({ queryKey: ['contracts'] });
        } catch (requestError) {
            setActionError(requestError?.response?.data?.message ?? 'Unable to cancel this subscription right now.');
        } finally {
            setIsCancelling(false);
        }
    }

    async function handlePauseSubscription() {
        if (contractId === '' || isPausing || contract?.status === 'Paused' || contract?.status === 'Canceled' || contract?.isImported) {
            return;
        }

        setActionError('');
        setIsPausing(true);

        try {
            await window.axios.post(`/api/contracts/${encodeURIComponent(contractId)}/pause`);
            await queryClient.invalidateQueries({ queryKey: contractDetailQueryKey(contractId) });
            await queryClient.invalidateQueries({ queryKey: ['contracts'] });
        } catch (requestError) {
            setActionError(requestError?.response?.data?.message ?? 'Unable to pause this subscription right now.');
        } finally {
            setIsPausing(false);
        }
    }

    async function handleResumeSubscription() {
        if (contractId === '' || isResuming || contract?.status !== 'Paused' || contract?.isImported) {
            return;
        }

        setActionError('');
        setIsResuming(true);

        try {
            await window.axios.post(`/api/contracts/${encodeURIComponent(contractId)}/resume`);
            await queryClient.invalidateQueries({ queryKey: contractDetailQueryKey(contractId) });
            await queryClient.invalidateQueries({ queryKey: ['contracts'] });
        } catch (requestError) {
            setActionError(requestError?.response?.data?.message ?? 'Unable to resume this subscription right now.');
        } finally {
            setIsResuming(false);
        }
    }

    if (isLoading) {
        return (
            <s-page inlineSize="large">
                <div className="contract-detail-page">
                    <div className="plan-description-page__header">
                        <AppAnchor className="contract-detail-page__back" to="/contracts">
                            <span aria-hidden="true" className="big-icon"><s-icon type="arrow-left" size="large"></s-icon></span>
                        </AppAnchor>
                    </div>

                    <p className="plan-feedback">Loading this subscription contract...</p>
                </div>
            </s-page>
        );
    }

    if (isError) {
        return (
            <s-page inlineSize="large">
                <div className="contract-detail-page">
                    <div className="plan-description-page__header">
                        <AppAnchor className="contract-detail-page__back" to="/contracts">
                            <span aria-hidden="true" className="big-icon"><s-icon type="arrow-left" size="large"></s-icon></span>
                        </AppAnchor>
                    </div>

                    <p className="plan-feedback plan-feedback--error">{error?.response?.data?.message ?? 'Unable to load this subscription contract right now.'}</p>
                </div>
            </s-page>
        );
    }

    if (!contract) {
        return (
            <s-page inlineSize="large">
                <div className="contract-detail-page">
                    <div className="plan-description-page__header">
                        <AppAnchor className="contract-detail-page__back" to="/contracts">
                            <span aria-hidden="true"><s-icon type="arrow-left" size="large"></s-icon></span>
                        </AppAnchor>
                    </div>

                    <p className="plan-feedback plan-feedback--error">The selected subscription contract could not be found.</p>
                </div>
            </s-page>
        );
    }

    const upcomingOrders = contract.upcomingOrders ?? [];
    const visibleUpcomingOrders = isShowingAllUpcomingOrders ? upcomingOrders : upcomingOrders.slice(0, 6);

    return (
        <s-page inlineSize="large">
            {/*<s-section padding="none">*/}
                <div className="contract-detail-page">
                    <div className="contract-detail-page__topbar">
                        <div className="contract-detail-page__heading-group">
                            <AppAnchor className="contract-detail-page__back" to="/contracts">
                                <span aria-hidden="true" className="big-icon"><s-icon type="arrow-left" size="large"></s-icon></span>
                            </AppAnchor>

                            <div>
                                <div className="contract-detail-page__heading-row">
                                    <h3>{contract.displayId ?? contract.id}</h3>
                                    <span className="contract-status-badge">
                                        <s-badge tone={getStatusTone(contract.status)}>{contract.status}</s-badge>
                                    </span>
                                </div>
                                <p>
                                    {contract.orderDate} &bull; Order {contract.orderNumber}
                                </p>
                            </div>
                        </div>

                        <div className="contract-detail-page__actions">
                            <s-button
                                disabled={isPausing || isResuming || contract.status === 'Canceled' || contract.isImported}
                                onClick={contract.status === 'Paused' ? handleResumeSubscription : handlePauseSubscription}
                                variant="secondary"
                            >
                                {isPausing ? 'Pausing...' : isResuming ? 'Resuming...' : contract.status === 'Paused' ? 'Resume' : 'Pause'}
                            </s-button>
                            <s-button
                                disabled={isCancelling || contract.status === 'Canceled' || contract.isImported}
                                onClick={handleCancelledSubscription}
                                variant="secondary"
                            >
                                {isCancelling ? 'Cancelling...' : contract.status === 'Canceled' ? 'Canceled' : 'Cancel subscription'}
                            </s-button>
                        </div>
                    </div>

                    {actionError !== '' ? <p className="plan-feedback plan-feedback--error">{actionError}</p> : null}
                    {contract.isImported ? <p className="plan-feedback">Imported contracts are read-only inside the app detail view.</p> : null}

                    <div className="contract-detail-page__layout">
                        <div className="contract-detail-page__main">
                            <section className="contract-card">
                                <div className="contract-card__header">
                                    <h2>Subscription details</h2>
                                    <SectionEditButton label="Edit subscription details" />
                                </div>

                                {(contract.lineItems?.length > 0 ? contract.lineItems : [{
                                    id: contract.id,
                                    productId: contract.productId,
                                    title: contract.productTitle,
                                    subtitle: contract.productSubtitle,
                                    imageUrl: contract.productImageUrl,
                                    unitPrice: contract.productPrice,
                                    quantity: contract.quantity,
                                    total: contract.lineTotal,
                                    oneTimePurchasePrice: contract.oneTimePurchasePrice,
                                }]).map((lineItem) => (
                                    <div className="contract-product" key={lineItem.id}>
                                        <ProductThumb imageUrl={lineItem.imageUrl} title={lineItem.productTitle ?? lineItem.title} />

                                        <div className="contract-product__content">
                                            {contract.planId ? (
                                                <AppAnchor to={`/plans/description/${encodeURIComponent(contract.planId)}`}>{lineItem.productTitle ?? lineItem.title}</AppAnchor>
                                            ) : (
                                                <span className="contract-product__title">{lineItem.productTitle ?? lineItem.title}</span>
                                            )}
                                            <p>{lineItem.subtitle}</p>
                                            <span>One-time purchase price: {lineItem.oneTimePurchasePrice ?? lineItem.unitPrice}</span>
                                        </div>

                                        <div className="contract-product__pricing">
                                            <span>
                                                {lineItem.unitPrice} x {lineItem.quantity}
                                            </span>
                                            <strong>{lineItem.total}</strong>
                                        </div>
                                    </div>
                                ))}

                                <div className="contract-meta-list">
                                    <div className="contract-meta-list__item">
                                        <div className="contract-meta-list__label">
                                            <DiscountIcon />
                                            <span>Discount</span>
                                        </div>
                                        <strong>{contract.discount}</strong>
                                    </div>
                                    <div className="contract-meta-list__item">
                                        <div className="contract-meta-list__label">
                                            <DeliveryIcon />
                                            <span>Delivery</span>
                                        </div>
                                        <strong>{contract.deliveryFrequency}</strong>
                                    </div>
                                </div>
                            </section>

                            <section className="contract-card">
                                <div className="contract-card__header">
                                    <h2>Payment Summary</h2>
                                </div>

                                <div className="contract-summary-box">
                                    <div className="contract-summary-list">
                                        {contract.paymentSummary.map((item) => (
                                            <div className="contract-summary-list__row" key={item.label}>
                                                <div className="contract-summary-list__label">
                                                    <span>{item.label}</span>
                                                    {item.note ? <small>{item.note}</small> : null}
                                                </div>
                                                <strong>{item.value}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="contract-card">
                                <div className="contract-card__header">
                                    <h2>Upcoming orders</h2>
                                </div>

                                <div className="contract-upcoming-list">
                                    {visibleUpcomingOrders.length > 0 ? (
                                        visibleUpcomingOrders.map((date) => (
                                            <div className="contract-upcoming-list__row" key={date}>
                                                <span>{date}</span>
                                                <button className="contract-upcoming-list__link" type="button">Skip</button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="contract-upcoming-list__row">
                                            <span>No upcoming billing dates are available yet.</span>
                                        </div>
                                    )}
                                </div>

                                {upcomingOrders.length > 6 ? (
                                    <button
                                        className="contract-card__more-link"
                                        onClick={() => setIsShowingAllUpcomingOrders((currentValue) => !currentValue)}
                                        type="button"
                                    >
                                        {isShowingAllUpcomingOrders ? 'Show less' : 'Show more'}
                                    </button>
                                ) : null}
                            </section>

                            <section className="contract-timeline">
                                <h2>Timeline</h2>
                                <div className="contract-timeline__date">{contract.timelineDate}</div>

                                <div className="contract-timeline__list">
                                    {contract.timeline.map((item) => (
                                        <div className="contract-timeline__item" key={item.id}>
                                            <span className="contract-timeline__dot" />
                                            <div className="contract-timeline__content">
                                                <span>{item.text}</span>
                                                <strong>{item.time}</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="contract-detail-page__side">
                            <section className="contract-card">
                                <div className="contract-card__header">
                                    <h2>Customer</h2>
                                </div>

                                <div className="contract-side-block">
                                    <a className="contract-side-block__customer-link" href={`mailto:${contract.customer.email}`}>{contract.customer.name}</a>
                                </div>

                                <div className="contract-side-block">
                                    <div className="contract-side-block__heading">
                                        <h3>Contact information</h3>
                                    </div>
                                    <a href={`mailto:${contract.customer.email}`}>{contract.customer.email}</a>
                                </div>

                                <div className="contract-side-block">
                                    <div className="contract-side-block__heading">
                                        <h3>Shipping address</h3>
                                        <SectionEditButton label="Edit shipping address" />
                                    </div>

                                    {(contract.deliveryMethod?.addressLines ?? contract.customer.addressLines).map((line) => (
                                        <p key={line}>{line}</p>
                                    ))}
                                </div>
                            </section>

                            <section className="contract-card">
                                <div className="contract-card__header">
                                    <h2>Payment method</h2>
                                    <SectionEditButton label="Edit payment method" />
                                </div>

                                <div className="contract-payment-method">
                                    <span className="contract-payment-method__badge">{contract.paymentMethod.brand}</span>
                                    <div>
                                        <strong>{contract.paymentMethod.label}</strong>
                                        <p>{contract.paymentMethod.expiry}</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            {/*</s-section>*/}
        </s-page>
    );
}

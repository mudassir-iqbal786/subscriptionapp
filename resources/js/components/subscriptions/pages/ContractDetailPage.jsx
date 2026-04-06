import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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

export default function ContractDetailPage() {
    const { contractId = '' } = useParams();
    const queryClient = useQueryClient();
    const [actionError, setActionError] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isPausing, setIsPausing] = useState(false);
    const [isResuming, setIsResuming] = useState(false);


    const { data: contract, isLoading, isError, error } = useQuery({
        queryKey: contractDetailQueryKey(contractId),
        queryFn: () => fetchContractDetail(contractId),
        enabled: contractId !== '',
    });

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
            <div className="contract-detail-page">
                <div className="plan-description-page__header">
                    <AppAnchor className="contract-detail-page__back" to="/contracts">
                        <span aria-hidden="true" className="big-icon"><s-icon type="arrow-left" size="large"></s-icon></span>
                    </AppAnchor>
                </div>

                <p className="plan-feedback">Loading this subscription contract...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="contract-detail-page">
                <div className="plan-description-page__header">
                    <AppAnchor className="contract-detail-page__back" to="/contracts">
                        <span aria-hidden="true" className="big-icon"><s-icon type="arrow-left"></s-icon></span>

                    </AppAnchor>
                </div>

                <p className="plan-feedback plan-feedback--error">{error?.response?.data?.message ?? 'Unable to load this subscription contract right now.'}</p>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="contract-detail-page">
                <div className="plan-description-page__header">
                    <AppAnchor className="contract-detail-page__back" to="/contracts">
                        <span aria-hidden="true" className="big-icon"><s-icon type="arrow-left" size="large"></s-icon></span>

                    </AppAnchor>
                </div>

                <p className="plan-feedback plan-feedback--error">The selected subscription contract could not be found.</p>
            </div>
        );
    }

    return (
        <div className="contract-detail-page">
            <div className="contract-detail-page__topbar">
                <div className="contract-detail-page__heading-group">
                    <AppAnchor className="contract-detail-page__back" to="/contracts">
                        <span aria-hidden="true" className="big-icon"><s-icon type="arrow-left" size="large"></s-icon></span>
                    </AppAnchor>

                    <div>
                        <div className="contract-detail-page__heading-row">
                            <h1>{contract.displayId ?? contract.id}</h1>
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
                    <button
                        className="contract-detail-page__button"
                        type="button"
                        onClick={contract.status === 'Paused' ? handleResumeSubscription : handlePauseSubscription}
                        disabled={isPausing || isResuming || contract.status === 'Canceled' || contract.isImported}
                    >
                        {isPausing ? 'Pausing...' : isResuming ? 'Resuming...' : contract.status === 'Paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                        onClick={handleCancelledSubscription}
                        className="contract-detail-page__button contract-detail-page__button--danger"
                        type="button"
                        disabled={isCancelling || contract.status === 'Canceled' || contract.isImported}
                    >
                        {isCancelling ? 'Cancelling...' : contract.status === 'Canceled' ? 'Canceled' : 'Cancel subscription'}
                    </button>
                </div>
            </div>

            {actionError !== '' ? <p className="plan-feedback plan-feedback--error">{actionError}</p> : null}
            {contract.isImported ? <p className="plan-feedback">Imported contracts are read-only inside the app detail view.</p> : null}

            <div className="contract-detail-page__layout">
                <div className="contract-detail-page__main">
                    <section className="contract-card">
                        <div className="contract-card__header">
                            <h2>Subscription details</h2>
                        </div>

                        {contract.lineItems?.length > 0 ? contract.lineItems.map((lineItem) => (
                            <div className="contract-product" key={lineItem.id}>
                                <span className="contract-product__thumb" />

                                <div className="contract-product__content">
                                    {contract.planId ? <AppAnchor to={`/plans/description/${encodeURIComponent(contract.planId)}`}>{lineItem.title}</AppAnchor> : <span>{lineItem.title}</span>}
                                    <p>{lineItem.subtitle}</p>
                                    <span>Unit price: {lineItem.unitPrice}</span>
                                </div>

                                <div className="contract-product__pricing">
                                    <span>
                                        {lineItem.unitPrice} x {lineItem.quantity}
                                    </span>
                                    <strong>{lineItem.total}</strong>
                                </div>
                            </div>
                        )) : (
                            <div className="contract-product">
                                <span className="contract-product__thumb" />

                                <div className="contract-product__content">
                                    {contract.planId ? <AppAnchor to={`/plans/description/${encodeURIComponent(contract.planId)}`}>{contract.productTitle}</AppAnchor> : <span>{contract.productTitle}</span>}
                                    <p>{contract.productSubtitle}</p>
                                    <span>One-time purchase price: {contract.oneTimePurchasePrice}</span>
                                </div>

                                <div className="contract-product__pricing">
                                    <span>
                                        {contract.productPrice} x {contract.quantity}
                                    </span>
                                    <strong>{contract.lineTotal}</strong>
                                </div>
                            </div>
                        )}

                        <div className="contract-meta-list">
                            <div className="contract-meta-list__item">
                                <span>Discount</span>
                                <strong>{contract.discount}</strong>
                            </div>
                            <div className="contract-meta-list__item">
                                <span>Delivery</span>
                                <strong>{contract.deliveryFrequency}</strong>
                            </div>
                            <div className="contract-meta-list__item">
                                <span>Next billing date</span>
                                <strong>{contract.nextOrder}</strong>
                            </div>
                            <div className="contract-meta-list__item">
                                <span>Created</span>
                                <strong>{contract.createdAtLabel}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="contract-card">
                        <div className="contract-card__header">
                            <h2>Payment Summary</h2>
                        </div>

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
                    </section>

                    <section className="contract-card">
                        <div className="contract-card__header">
                            <h2>Upcoming orders</h2>
                        </div>

                        <div className="contract-upcoming-list">
                            {contract.upcomingOrders.length > 0
                                ? contract.upcomingOrders.map((date) => (
                                      <div className="contract-upcoming-list__row" key={date}>
                                          <span>{date}</span>
                                      </div>
                                  ))
                                : (
                                    <div className="contract-upcoming-list__row">
                                        <span>No upcoming billing dates are available yet.</span>
                                    </div>
                                )}
                        </div>

                    </section>

                    <section className="contract-card">
                        <div className="contract-card__header">
                            <h2>Order history</h2>
                        </div>

                        <div className="contract-upcoming-list">
                            {contract.orderHistory?.length > 0 ? (
                                contract.orderHistory.map((order) => (
                                    <div className="contract-upcoming-list__row" key={order.id}>
                                        <span>{order.name}</span>
                                        <strong>{order.date}</strong>
                                    </div>
                                ))
                            ) : (
                                <div className="contract-upcoming-list__row">
                                    <span>No order history is available yet.</span>
                                </div>
                            )}
                        </div>
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
                            <h3>{contract.customer.name}</h3>
                            <a href={`mailto:${contract.customer.email}`}>{contract.customer.email}</a>
                        </div>

                        <div className="contract-side-block">
                            <div className="contract-side-block__heading">
                                <h3>Contact information</h3>
                            </div>
                            <a href={`mailto:${contract.customer.email}`}>{contract.customer.email}</a>
                        </div>

                        <div className="contract-side-block">
                            <div className="contract-side-block__heading">
                                <h3>{contract.deliveryMethod?.type ?? 'Shipping address'}</h3>
                            </div>

                            <p>{contract.deliveryMethod?.title ?? 'Address unavailable'}</p>
                            {contract.deliveryMethod?.description ? <p>{contract.deliveryMethod.description}</p> : null}
                            {(contract.deliveryMethod?.addressLines ?? contract.customer.addressLines).map((line) => (
                                <p key={line}>{line}</p>
                            ))}
                        </div>
                    </section>

                    <section className="contract-card">
                        <div className="contract-card__header">
                            <h2>Payment method</h2>
                        </div>

                        <div className="contract-payment-method">
                            <span className="contract-payment-method__badge">{contract.paymentMethod.brand}</span>
                            <div>
                                <strong>{contract.paymentMethod.label}</strong>
                                <p>{contract.paymentMethod.expiry}</p>
                                <p>Last updated: {contract.updatedAtLabel}</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

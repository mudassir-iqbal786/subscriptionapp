import { contractDetail } from '../data.js';
import { appUrl } from '../navigation.js';

export default function ContractDetailPage() {
    return (
        <div className="contract-detail-page">
            <div className="contract-detail-page__topbar">
                <div className="contract-detail-page__heading-group">
                    <a className="contract-detail-page__back" href={appUrl('/contracts')}>
                        <span aria-hidden="true">&larr;</span>
                    </a>

                    <div>
                        <div className="contract-detail-page__heading-row">
                            <h1>{contractDetail.contractNumber}</h1>
                            <span className="contract-status-badge">{contractDetail.status}</span>
                        </div>
                        <p>
                            {contractDetail.orderDate} &bull; Order {contractDetail.orderNumber}
                        </p>
                    </div>
                </div>

                <div className="contract-detail-page__actions">
                    <button className="contract-detail-page__button" type="button">
                        Pause
                    </button>
                    <button className="contract-detail-page__button contract-detail-page__button--danger" type="button">
                        Cancel subscription
                    </button>
                </div>
            </div>

            <div className="contract-detail-page__layout">
                <div className="contract-detail-page__main">
                    <section className="contract-card">
                        <div className="contract-card__header">
                            <h2>Subscription details</h2>
                            <button className="contract-card__edit" type="button">
                                Edit
                            </button>
                        </div>

                        <div className="contract-product">
                            <span className="contract-product__thumb" />

                            <div className="contract-product__content">
                                <a href={appUrl('/plans/description')}>{contractDetail.productTitle}</a>
                                <p>{contractDetail.productSubtitle}</p>
                                <span>One-time purchase price: {contractDetail.oneTimePurchasePrice}</span>
                            </div>

                            <div className="contract-product__pricing">
                                <span>
                                    {contractDetail.productPrice} x {contractDetail.quantity}
                                </span>
                                <strong>{contractDetail.lineTotal}</strong>
                            </div>
                        </div>

                        <div className="contract-meta-list">
                            <div className="contract-meta-list__item">
                                <span>Discount</span>
                                <strong>{contractDetail.discount}</strong>
                            </div>
                            <div className="contract-meta-list__item">
                                <span>Delivery</span>
                                <strong>{contractDetail.delivery}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="contract-card">
                        <div className="contract-card__header">
                            <h2>Payment Summary</h2>
                        </div>

                        <div className="contract-summary-list">
                            {contractDetail.paymentSummary.map((item) => (
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
                            {contractDetail.upcomingOrders.map((date) => (
                                <div className="contract-upcoming-list__row" key={date}>
                                    <span>{date}</span>
                                    <button className="contract-upcoming-list__link" type="button">
                                        Skip
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button className="contract-card__more-link" type="button">
                            Show more
                        </button>
                    </section>

                    <section className="contract-timeline">
                        <h2>Timeline</h2>
                        <div className="contract-timeline__date">{contractDetail.timelineDate}</div>

                        <div className="contract-timeline__list">
                            {contractDetail.timeline.map((item) => (
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
                            <h3>{contractDetail.customer.name}</h3>
                            <a href={`mailto:${contractDetail.customer.email}`}>{contractDetail.customer.email}</a>
                        </div>

                        <div className="contract-side-block">
                            <div className="contract-side-block__heading">
                                <h3>Contact information</h3>
                            </div>
                            <a href={`mailto:${contractDetail.customer.email}`}>{contractDetail.customer.email}</a>
                        </div>

                        <div className="contract-side-block">
                            <div className="contract-side-block__heading">
                                <h3>Shipping address</h3>
                                <button className="contract-card__edit" type="button">
                                    Edit
                                </button>
                            </div>

                            {contractDetail.customer.addressLines.map((line) => (
                                <p key={line}>{line}</p>
                            ))}
                        </div>
                    </section>

                    <section className="contract-card">
                        <div className="contract-card__header">
                            <h2>Payment method</h2>
                            <button className="contract-card__edit" type="button">
                                Edit
                            </button>
                        </div>

                        <div className="contract-payment-method">
                            <span className="contract-payment-method__badge">{contractDetail.paymentMethod.brand}</span>
                            <div>
                                <strong>{contractDetail.paymentMethod.label}</strong>
                                <p>{contractDetail.paymentMethod.expiry}</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

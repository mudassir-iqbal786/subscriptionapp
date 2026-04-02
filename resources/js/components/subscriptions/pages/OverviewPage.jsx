import { useState } from 'react';
import { setupSteps } from '../data.js';
import SummaryCard from '../shared/SummaryCard.jsx';

export default function OverviewPage() {
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

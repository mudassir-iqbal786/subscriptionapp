import { useState } from 'react';

export default function App() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeStepId, setActiveStepId] = useState('createPlan');
    const [checkedSteps, setCheckedSteps] = useState({
        createPlan: true,
        productPages: false,
        manageSubscriptions: false,
        accountAccess: false,
        importContracts: false,
        customizeNotifications: false,
    });

    const guideSteps = [
        {
            id: 'createPlan',
            title: 'Create your first subscription plan',
            description:
                'Get more repeat business by allowing customers to purchase products or services on a recurring basis',
        },
        {
            id: 'productPages',
            title: 'Add subscriptions to product pages',
            description:
                'Get more repeat business by allowing customers to purchase products or services on a recurring basis',
        },
        {
            id: 'manageSubscriptions',
            title: 'Allow customers to manage subscriptions',
            description:
                'Get more repeat business by allowing customers to purchase products or services on a recurring basis',
        },
        {
            id: 'accountAccess',
            title: 'Allow customer to access account post purchase',
        },
        {
            id: 'importContracts',
            title: 'Import existing contracts',
        },
        {
            id: 'customizeNotifications',
            title: 'Customize notifications',
        },
    ];

    const completedSteps = Object.values(checkedSteps).filter(Boolean).length;

    function toggleStep(stepId) {
        setCheckedSteps((currentSteps) => ({
            ...currentSteps,
            [stepId]: !currentSteps[stepId],
        }));
    }

    return (
        <main className="min-h-screen bg-[#f3f3f3] px-4 py-3text-[#111827] sm:px-6 lg:px-10">
            <div className="mx-auto max-w-5xl">
                <header className="mb-4">
                    <h2 className="text-[1.60rem] font-semibold tracking-[-0.02em] text-[#1f2937]">
                        Get started with Shopify Subscriptions
                    </h2>
                </header>

                <section className="overflow-hidden rounded-[18px] border border-[#d1d5db] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                        <div>
                            <h2 className="text-[1rem] font-semibold text-[#1f2937]">Setup guide</h2>
                            <div className="mt-2 flex items-center gap-2 text-[0.95rem] text-[#4b5563]">
                                <input
                                    checked={completedSteps === guideSteps.length}
                                    className="h-4 w-3 rounded border-[#9ca3af] accent-[#1f1f1f]"
                                    readOnly
                                    type="checkbox"
                                />
                                <span>
                                    Done {completedSteps > 0 ? `(${completedSteps}/${guideSteps.length})` : ''}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1 text-[#6b7280]">
                            <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[#f3f4f6]"
                                aria-label="More options"
                            >
                                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4.5 10a1.5 1.5 0 1 1 0.001-3.001A1.5 1.5 0 0 1 4.5 10Zm5.5 0A1.5 1.5 0 1 1 10.001 6.999 1.5 1.5 0 0 1 10 10Zm5.5 0a1.5 1.5 0 1 1 0.001-3.001A1.5 1.5 0 0 1 15.5 10Z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="inline-flex h-8 w-4 items-center justify-center rounded-full transition hover:bg-[#f3f4f6]"
                                aria-label="Collapse guide"
                                aria-expanded={!isCollapsed}
                                onClick={() => setIsCollapsed((currentState) => !currentState)}
                            >
                                <svg
                                    aria-hidden="true"
                                    className={`h-5 w-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                                    viewBox="0 0 20 20"
                                    fill="none"
                                >
                                    <path
                                        d="M6 12L10 8L14 12"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.8"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {!isCollapsed ? (
                        <>
                            <div className="border-t border-[#e5e7eb] px-2 py-4 sm:px-4 sm:py-5">
                                <div className="space-y-2">
                                    {guideSteps.map((step) => (
                                        <article
                                            key={step.id}
                                            className={[
                                                'rounded-2xl px-3 py-1 sm:px-4',
                                                activeStepId === step.id ? 'bg-[#f6f6f7]' : 'bg-transparent',
                                            ].join(' ')}
                                        >
                                            <label
                                                className={`flex cursor-pointer gap-3 ${
                                                    step.description ? 'items-start' : 'items-center'
                                                }`}
                                            >
                                                <input
                                                    checked={checkedSteps[step.id]}
                                                    className="mt-0.5 h-3 w-3   border-[#9ca3af] accent-[#1f1f1f]"
                                                    onChange={() => toggleStep(step.id)}
                                                    type="checkbox"
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <button
                                                        type="button"
                                                        className="py-0 my-0 text-left text-[1rem] font-semibold text-[#111827]"
                                                        onClick={() => setActiveStepId(step.id)}
                                                    >
                                                        {step.title}
                                                    </button>

                                                    {step.description && activeStepId === step.id ? (
                                                        <>
                                                            <p className="mt-2 max-w-3xl py-0 my-0 text-[0.98rem] leading-7 text-[#4b5563]">
                                                                {step.description}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                className="mt-4 inline-flex items-center rounded-xl border border-[#1f1f1f] bg-[#2b2b2b] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-black"
                                                            >
                                                                Create plan
                                                            </button>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </label>
                                        </article>
                                    ))}
                                </div>
                            </div>

                            <footer className="flex flex-col gap-4 border-t border-[#eceef0] bg-[#fafafa] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center self-end rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:bg-[#f9fafb]"
                                >
                                    Dismiss guide
                                </button>
                            </footer>
                        </>
                    ) : null}
                </section>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.98rem] text-[#6b7280]">
                    <span className="font-semibold text-[#111827]">Performance</span>
                    <span>Mar 26-Apr 2, 2026</span>
                </div>
            </div>
        </main>
    );
}

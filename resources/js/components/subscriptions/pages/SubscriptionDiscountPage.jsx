import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
    defaultSubscriptionDiscount,
    fetchSubscriptionDiscount,
    saveSubscriptionDiscount,
    subscriptionDiscountQueryKey,
} from '../subscriptionDiscountQueries.js';

function getDiscountId(params) {
    const splat = params['*'] ?? '';

    if (splat === '' || splat === 'create') {
        return '';
    }

    try {
        return decodeURIComponent(splat);
    } catch {
        return splat;
    }
}

function showToast(message, options = {}) {
    window.shopify?.toast?.show?.(message, options);
}

export default function SubscriptionDiscountPage() {
    const params = useParams();
    const queryClient = useQueryClient();
    const discountId = getDiscountId(params);
    const [form, setForm] = useState(defaultSubscriptionDiscount);
    const [saveError, setSaveError] = useState('');
    const { data: subscriptionDiscount = defaultSubscriptionDiscount, error, isLoading } = useQuery({
        queryKey: subscriptionDiscountQueryKey(discountId),
        queryFn: () => fetchSubscriptionDiscount(discountId),
    });
    const loadErrorMessage = error?.response?.data?.message ?? 'Unable to load this subscription discount.';
    const saveMutation = useMutation({
        mutationFn: saveSubscriptionDiscount,
        onSuccess: (savedSubscriptionDiscount) => {
            queryClient.setQueryData(subscriptionDiscountQueryKey(savedSubscriptionDiscount.id ?? ''), savedSubscriptionDiscount);
            setForm(savedSubscriptionDiscount);
            setSaveError('');
            showToast('Subscription discount saved successfully.');
        },
        onError: (mutationError) => {
            const message = mutationError?.response?.data?.message ?? 'Unable to save the subscription discount right now.';

            setSaveError(message);
            showToast(message, { isError: true });
        },
    });

    useEffect(() => {
        setForm(subscriptionDiscount);
    }, [subscriptionDiscount]);

    useEffect(() => {
        if (error && !isLoading) {
            showToast(loadErrorMessage, { isError: true });
        }
    }, [error, isLoading, loadErrorMessage]);

    function updateField(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
        setSaveError('');
    }

    function saveSettings() {
        saveMutation.mutate({
            id: form.id,
            title: form.title,
            enabled: form.enabled,
            percentage: Number(form.percentage),
            message: form.message,
        });
    }

    return (
        <s-page heading="Subscription discount" inlineSize="large">
            <s-button disabled={isLoading || saveMutation.isPending} onClick={saveSettings} slot="primary-action" variant="primary">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
            </s-button>

            <div className="delivery-customization-page">
                <section className="delivery-customization-hero">
                    <div>
                        <s-text>Shopify Function</s-text>
                        <h1>Discount subscription checkout lines</h1>
                        <s-text>
                            This page creates an automatic app discount. Checkout applies it only to cart lines that contain a selling plan.
                        </s-text>
                    </div>
                    <s-badge tone={form.enabled ? 'success' : 'warning'}>
                        {form.enabled ? 'Enabled' : 'Disabled'}
                    </s-badge>
                </section>

                {isLoading ? <s-text>Loading subscription discount...</s-text> : null}
                {error && !isLoading ? <s-text tone="critical">{loadErrorMessage}</s-text> : null}
                {saveError !== '' ? <s-text tone="critical">{saveError}</s-text> : null}

                <section className="delivery-customization-layout">
                    <aside className="delivery-customization-intro">
                        <h2>Discount setup</h2>
                        <s-text>The function reads this configuration during cart and checkout calculation.</s-text>
                    </aside>

                    <div className="delivery-customization-card">
                        <s-text-field
                            label="Discount title"
                            onInput={(event) => updateField('title', event.currentTarget.value)}
                            type="text"
                            value={form.title}
                        />

                        <s-checkbox checked={form.enabled} onChange={(event) => updateField('enabled', event.currentTarget.checked)}>
                            Enable this subscription discount
                        </s-checkbox>

                        <s-number-field
                            label="Discount percentage"
                            max="100"
                            min="0"
                            onInput={(event) => updateField('percentage', event.currentTarget.value)}
                            step="0.01"
                            value={String(form.percentage)}
                        />
                        <s-text>Use 10 for a 10% discount.</s-text>

                        <s-text-field
                            label="Checkout message"
                            onInput={(event) => updateField('message', event.currentTarget.value)}
                            type="text"
                            value={form.message}
                        />

                        <div className="delivery-customization-actions">
                            <s-button disabled={isLoading || saveMutation.isPending} onClick={saveSettings} variant="primary">
                                {saveMutation.isPending ? 'Saving...' : 'Save subscription discount'}
                            </s-button>
                        </div>
                    </div>
                </section>

                <section className="delivery-customization-layout">
                    <aside className="delivery-customization-intro">
                        <h2>Current function config</h2>
                        <s-text>This JSON is stored on the automatic discount metafield and read by Shopify Functions.</s-text>
                    </aside>

                    <pre className="delivery-customization-code">
                        {JSON.stringify({
                            enabled: form.enabled,
                            percentage: Number(form.percentage),
                            message: form.message,
                        }, null, 2)}
                    </pre>
                </section>
            </div>
        </s-page>
    );
}

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
    defaultDeliveryCustomization,
    deliveryCustomizationQueryKey,
    fetchDeliveryCustomization,
    saveDeliveryCustomization,
} from '../deliveryCustomizationQueries.js';

function splitList(value) {
    return value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function joinList(values) {
    return values.join('\n');
}

function getDeliveryCustomizationId(params) {
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

export default function DeliveryCustomizationPage() {
    const params = useParams();
    const queryClient = useQueryClient();
    const deliveryCustomizationId = getDeliveryCustomizationId(params);
    const [form, setForm] = useState(defaultDeliveryCustomization);
    const [titlesText, setTitlesText] = useState('');
    const [handlesText, setHandlesText] = useState('');
    const [saveError, setSaveError] = useState('');
    const { data: deliveryCustomization = defaultDeliveryCustomization, error, isLoading } = useQuery({
        queryKey: deliveryCustomizationQueryKey(deliveryCustomizationId),
        queryFn: () => fetchDeliveryCustomization(deliveryCustomizationId),
    });
    const loadErrorMessage = error?.response?.data?.message ?? 'Unable to load this delivery customization.';
    const saveMutation = useMutation({
        mutationFn: saveDeliveryCustomization,
        onSuccess: (savedDeliveryCustomization) => {
            queryClient.setQueryData(deliveryCustomizationQueryKey(savedDeliveryCustomization.id ?? ''), savedDeliveryCustomization);
            setForm(savedDeliveryCustomization);
            setTitlesText(joinList(savedDeliveryCustomization.hiddenDeliveryOptionTitles));
            setHandlesText(joinList(savedDeliveryCustomization.hiddenDeliveryOptionHandles));
            setSaveError('');
            showToast('Delivery customization saved successfully.');
        },
        onError: (mutationError) => {
            const message = mutationError?.response?.data?.message ?? 'Unable to save the delivery customization right now.';

            setSaveError(message);
            showToast(message, { isError: true });
        },
    });

    useEffect(() => {
        setForm(deliveryCustomization);
        setTitlesText(joinList(deliveryCustomization.hiddenDeliveryOptionTitles));
        setHandlesText(joinList(deliveryCustomization.hiddenDeliveryOptionHandles));
    }, [deliveryCustomization]);

    function updateField(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
        setSaveError('');
    }

    function updateListText(setter, value) {
        setter(value);
        setSaveError('');
    }

    function saveSettings() {
        saveMutation.mutate({
            id: form.id,
            title: form.title,
            enabled: form.enabled,
            hiddenDeliveryOptionTitles: splitList(titlesText),
            hiddenDeliveryOptionHandles: splitList(handlesText),
        });
    }

    return (
        <s-page heading="Delivery customization" inlineSize="large">
            <s-button disabled={isLoading || saveMutation.isPending} onClick={saveSettings} slot="primary-action" variant="primary">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
            </s-button>

            <div className="delivery-customization-page">
                <section className="delivery-customization-hero">
                    <div>
                        <s-text>Shopify Function</s-text>
                        <h1>Control shipping options for subscription carts</h1>
                        <s-text>
                            This page configures the delivery customization function. When checkout contains a subscription line, matching delivery
                            options are hidden before the customer chooses shipping.
                        </s-text>
                    </div>
                    <s-badge tone={form.enabled ? 'success' : 'warning'}>
                        {form.enabled ? 'Enabled' : 'Disabled'}
                    </s-badge>
                </section>

                {isLoading ? <s-text>Loading delivery customization...</s-text> : null}
                {error && !isLoading ? <s-text tone="critical">{loadErrorMessage}</s-text> : null}
                {saveError !== '' ? <s-text tone="critical">{saveError}</s-text> : null}

                <section className="delivery-customization-layout">
                    <aside className="delivery-customization-intro">
                        <h2>Function setup</h2>
                        <s-text>Use exact delivery option titles or handles from checkout. Handles are safer because titles can change by language.</s-text>
                    </aside>

                    <div className="delivery-customization-card">
                        <s-text-field
                            label="Customization title"
                            onInput={(event) => updateField('title', event.currentTarget.value)}
                            type="text"
                            value={form.title}
                        />

                        <s-checkbox checked={form.enabled} onChange={(event) => updateField('enabled', event.currentTarget.checked)}>
                            Enable this delivery customization
                        </s-checkbox>

                        <s-text-area
                            label="Hide delivery option titles"
                            onInput={(event) => updateListText(setTitlesText, event.currentTarget.value)}
                            placeholder={'Express\nFree International Shipping'}
                            rows="5"
                            value={titlesText}
                        />
                        <s-text>Enter one title per line, or separate titles with commas.</s-text>

                        <s-text-area
                            label="Hide delivery option handles"
                            onInput={(event) => updateListText(setHandlesText, event.currentTarget.value)}
                            placeholder={'express\novernight'}
                            rows="5"
                            value={handlesText}
                        />
                        <s-text>Handles are the stable delivery option identifiers used by the function.</s-text>

                        <div className="delivery-customization-actions">
                            <s-button disabled={isLoading || saveMutation.isPending} onClick={saveSettings} variant="primary">
                                {saveMutation.isPending ? 'Saving...' : 'Save delivery rules'}
                            </s-button>
                        </div>
                    </div>
                </section>

                <section className="delivery-customization-layout">
                    <aside className="delivery-customization-intro">
                        <h2>Current function config</h2>
                        <s-text>This is the JSON stored on the delivery customization metafield and read by Shopify Functions during checkout.</s-text>
                    </aside>

                    <pre className="delivery-customization-code">
                        {JSON.stringify({
                            hiddenDeliveryOptionTitles: splitList(titlesText),
                            hiddenDeliveryOptionHandles: splitList(handlesText),
                        }, null, 2)}
                    </pre>
                </section>
            </div>
        </s-page>
    );
}

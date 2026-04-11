import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    defaultDeliveryCustomization,
    deliveryCustomizationQueryKey,
    fetchDeliveryCustomization,
    saveDeliveryCustomization,
} from '../deliveryCustomizationQueries.js';
import { buildAppPath } from '../navigation.jsx';

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

export default function DeliveryCustomizationPage() {
    const params = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const deliveryCustomizationId = getDeliveryCustomizationId(params);
    const [form, setForm] = useState(defaultDeliveryCustomization);
    const [titlesText, setTitlesText] = useState('');
    const [handlesText, setHandlesText] = useState('');
    const [saveMessage, setSaveMessage] = useState('');
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
            setSaveMessage('Delivery customization saved successfully.');

            if (!deliveryCustomizationId && savedDeliveryCustomization.id) {
                navigate(buildAppPath(`/delivery-customization/${encodeURIComponent(savedDeliveryCustomization.id)}`, location.search), { replace: true });
            }
        },
        onError: (mutationError) => {
            setSaveMessage('');
            setSaveError(mutationError?.response?.data?.message ?? 'Unable to save the delivery customization right now.');
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
        setSaveMessage('');
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
                        <span>Shopify Function</span>
                        <h1>Control shipping options for subscription carts</h1>
                        <p>
                            This page configures the delivery customization function. When checkout contains a subscription line, matching delivery
                            options are hidden before the customer chooses shipping.
                        </p>
                    </div>
                    <div className={form.enabled ? 'delivery-customization-status is-enabled' : 'delivery-customization-status'}>
                        {form.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                </section>

                {isLoading ? <p className="delivery-customization-feedback">Loading delivery customization...</p> : null}
                {error && !isLoading ? <p className="delivery-customization-feedback is-error">{loadErrorMessage}</p> : null}
                {saveMessage !== '' ? <p className="delivery-customization-feedback is-success">{saveMessage}</p> : null}
                {saveError !== '' ? <p className="delivery-customization-feedback is-error">{saveError}</p> : null}

                <section className="delivery-customization-layout">
                    <aside className="delivery-customization-intro">
                        <h2>Function setup</h2>
                        <p>Use exact delivery option titles or handles from checkout. Handles are safer because titles can change by language.</p>
                    </aside>

                    <div className="delivery-customization-card">
                        <label className="delivery-customization-field">
                            <span>Customization title</span>
                            <input
                                onChange={(event) => updateField('title', event.currentTarget.value)}
                                type="text"
                                value={form.title}
                            />
                        </label>

                        <label className="delivery-customization-toggle">
                            <input
                                checked={form.enabled}
                                onChange={(event) => updateField('enabled', event.currentTarget.checked)}
                                type="checkbox"
                            />
                            <span>Enable this delivery customization</span>
                        </label>

                        <label className="delivery-customization-field">
                            <span>Hide delivery option titles</span>
                            <textarea
                                onChange={(event) => {
                                    setTitlesText(event.currentTarget.value);
                                    setSaveMessage('');
                                    setSaveError('');
                                }}
                                placeholder={'Express\nFree International Shipping'}
                                rows="5"
                                value={titlesText}
                            />
                            <small>Enter one title per line, or separate titles with commas.</small>
                        </label>

                        <label className="delivery-customization-field">
                            <span>Hide delivery option handles</span>
                            <textarea
                                onChange={(event) => {
                                    setHandlesText(event.currentTarget.value);
                                    setSaveMessage('');
                                    setSaveError('');
                                }}
                                placeholder={'express\novernight'}
                                rows="5"
                                value={handlesText}
                            />
                            <small>Handles are the stable delivery option identifiers used by the function.</small>
                        </label>

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
                        <p>This is the JSON stored on the delivery customization metafield and read by Shopify Functions during checkout.</p>
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

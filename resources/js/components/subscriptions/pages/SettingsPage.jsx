import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { defaultSettings } from '../data.js';
import { openShopifyCustomerNotificationsSettings, openShopifyThemeProductEditor } from '../navigation.jsx';

const settingsQueryKey = ['subscription-settings'];

async function fetchSettings() {
    const response = await window.axios.get('/api/settings');

    return normalizeSettings(response.data.settings ?? {});
}

async function persistSettings(payload) {
    const response = await window.axios.put('/api/settings', payload);

    return normalizeSettings(response.data.settings ?? {});
}

function normalizeSettings(settings = {}) {
    const managementUrl = typeof settings.managementUrl === 'string' ? settings.managementUrl : defaultSettings.managementUrl;

    return {
        ...defaultSettings,
        ...settings,
        managementUrl,
        paymentMethodFailure: {
            ...defaultSettings.paymentMethodFailure,
            ...(settings.paymentMethodFailure ?? {}),
        },
        inventoryFailure: {
            ...defaultSettings.inventoryFailure,
            ...(settings.inventoryFailure ?? {}),
        },
        setupProgress: {
            ...defaultSettings.setupProgress,
            ...(settings.setupProgress ?? {}),
        },
    };
}

const pageStyles = {
    layout: {
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
        paddingTop: '2px',
    },
    row: {
        display: 'grid',
        gridTemplateColumns: '320px minmax(0, 1fr)',
        gap: '32px',
        alignItems: 'start',
    },
    intro: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        paddingTop: '20px',
        paddingLeft: '6px',
    },
    card: {
        border: '1px solid #d9dadd',
        borderRadius: '18px',
        background: '#ffffff',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
    },
    subSection: {
        padding: '18px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    singleCard: {
        border: '1px solid #d9dadd',
        borderRadius: '18px',
        background: '#ffffff',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
        padding: '18px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '14px',
    },
    compactText: {
        fontSize: '13px',
        lineHeight: 1.45,
        color: '#202223',
        margin: 0,
    },
    introBody: {
        fontSize: '14px',
        lineHeight: 1.5,
        color: '#202223',
        margin: 0,
        maxWidth: '255px',
    },
    smallText: {
        fontSize: '13px',
        lineHeight: 1.45,
        color: '#6b7280',
        margin: 0,
    },
    urlBox: {
        border: '1px solid #d9dadd',
        borderRadius: '14px',
        background: '#f6f6f7',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
    },
    linkRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
    },
    linkButton: {
        padding: 0,
        border: 0,
        background: 'transparent',
        color: '#005bd3',
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: 1.45,
        cursor: 'pointer',
        textAlign: 'left',
    },
    sectionHeading: {
        fontSize: '16px',
        lineHeight: 1.4,
        fontWeight: 700,
        color: '#202223',
        margin: 0,
    },
    saveBar: {
        display: 'flex',
        justifyContent: 'flex-end',
        paddingTop: '2px',
    },
};

function SectionIntro({ title, description = '' }) {
    return (
        <div style={pageStyles.intro}>
            <p style={{ ...pageStyles.sectionHeading, fontSize: '14px' }}>{title}</p>
            {description !== '' ? <p style={pageStyles.introBody}>{description}</p> : null}
        </div>
    );
}

function FieldHelp({ children }) {
    return <p style={pageStyles.smallText}>{children}</p>;
}

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const { data: fetchedSettings = defaultSettings, error, isLoading } = useQuery({
        queryKey: settingsQueryKey,
        queryFn: fetchSettings,
    });
    const [settings, setSettings] = useState(defaultSettings);
    const [saveMessage, setSaveMessage] = useState('');
    const [copyMessage, setCopyMessage] = useState('');
    const [saveError, setSaveError] = useState('');
    const settingsMutation = useMutation({
        mutationFn: persistSettings,
        onSuccess: (nextSettings) => {
            queryClient.setQueryData(settingsQueryKey, nextSettings);
            setSettings(nextSettings);
            setSaveError('');
            setSaveMessage('Settings saved successfully.');
        },
        onError: (mutationError) => {
            const message = mutationError?.response?.data?.message ?? 'Unable to save settings right now.';

            setSaveMessage('');
            setSaveError(message);
        },
    });

    useEffect(() => {
        setSettings(fetchedSettings);
    }, [fetchedSettings]);

    const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(fetchedSettings);

    function updateSettings(section, field, value) {
        setSettings((currentSettings) => ({
            ...currentSettings,
            [section]: {
                ...currentSettings[section],
                [field]: value,
            },
        }));
        setSaveMessage('');
        setSaveError('');
    }

    function saveSettings() {
        settingsMutation.mutate({
            paymentMethodFailure: {
                retryAttempts: Number(settings.paymentMethodFailure.retryAttempts),
                retryDays: Number(settings.paymentMethodFailure.retryDays),
                failedAction: settings.paymentMethodFailure.failedAction,
            },
            inventoryFailure: {
                retryAttempts: Number(settings.inventoryFailure.retryAttempts),
                retryDays: Number(settings.inventoryFailure.retryDays),
                failedAction: settings.inventoryFailure.failedAction,
                staffNotifications: settings.inventoryFailure.staffNotifications,
            },
        });
    }

    async function copyManagementUrl() {
        if (!settings.managementUrl) {
            setCopyMessage('No management URL is configured yet.');

            return;
        }

        try {
            await window.navigator.clipboard.writeText(settings.managementUrl);
            setCopyMessage('URL copied.');
        } catch {
            setCopyMessage('Unable to copy the management URL.');
        }
    }

    function openNotifications() {
        const didOpenNotifications = openShopifyCustomerNotificationsSettings();

        if (!didOpenNotifications) {
            setCopyMessage('No notification settings URL is configured yet.');
        }
    }

    function openWidgetInstaller() {
        const didOpenThemeEditor = openShopifyThemeProductEditor();

        if (!didOpenThemeEditor) {
            setCopyMessage('Unable to open the theme editor for this shop.');
        }
    }

    return (
        <s-page heading="Settings" inlineSize="large">
            <s-button
                disabled={isLoading || settingsMutation.isPending || !hasUnsavedChanges}
                onClick={saveSettings}
                slot="primary-action"
                variant="primary"
            >
                {settingsMutation.isPending ? 'Saving...' : 'Save'}
            </s-button>

            <div style={pageStyles.layout}>
                {isLoading ? <p style={pageStyles.smallText}>Loading settings...</p> : null}
                {error && !isLoading ? <p style={{ ...pageStyles.smallText, color: '#b91c1c' }}>Unable to load settings right now.</p> : null}
                {saveMessage !== '' ? <p style={{ ...pageStyles.smallText, color: '#15803d' }}>{saveMessage}</p> : null}
                {saveError !== '' ? <p style={{ ...pageStyles.smallText, color: '#b91c1c' }}>{saveError}</p> : null}

                <section style={pageStyles.row}>
                    <SectionIntro
                        description="Control when billing attempts are made again after a failed attempt"
                        title="Billing attempts"
                    />

                    <div style={pageStyles.card}>
                        <div style={pageStyles.subSection}>
                            <p style={pageStyles.sectionHeading}>Payment method failure</p>

                            <div style={pageStyles.grid}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <s-number-field
                                        label="Number of retry attempts"
                                        max="10"
                                        min="0"
                                        onInput={(event) => updateSettings('paymentMethodFailure', 'retryAttempts', event.currentTarget.value)}
                                        value={String(settings.paymentMethodFailure.retryAttempts)}
                                    />
                                    <FieldHelp>Min 0, max 10 retries</FieldHelp>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <s-number-field
                                        label="Days between payment retry attempts"
                                        max="14"
                                        min="1"
                                        onInput={(event) => updateSettings('paymentMethodFailure', 'retryDays', event.currentTarget.value)}
                                        value={String(settings.paymentMethodFailure.retryDays)}
                                    />
                                    <FieldHelp>Min 1, max 14 days</FieldHelp>
                                </div>
                            </div>

                            <s-select
                                key={`payment-failed-action-${settings.paymentMethodFailure.failedAction}`}
                                label="Action when all retry attempts have failed"
                                onInput={(event) => updateSettings('paymentMethodFailure', 'failedAction', event.currentTarget.value)}
                                value={settings.paymentMethodFailure.failedAction}
                            >
                                <s-option selected={settings.paymentMethodFailure.failedAction === 'cancel'} value="cancel">
                                    Cancel subscription and send notification
                                </s-option>
                                <s-option selected={settings.paymentMethodFailure.failedAction === 'pause'} value="pause">
                                    Pause subscription and send notification
                                </s-option>
                                <s-option selected={settings.paymentMethodFailure.failedAction === 'skip'} value="skip">
                                    Skip order and send notification
                                </s-option>
                            </s-select>

                            <button onClick={openNotifications} style={pageStyles.linkButton} type="button">
                                Edit notifications
                            </button>
                        </div>

                        <div style={{ ...pageStyles.subSection, borderBottom: '0' }}>
                            <p style={pageStyles.sectionHeading}>Not enough inventory</p>

                            <div style={pageStyles.grid}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <s-number-field
                                        label="Number of retry attempts"
                                        max="10"
                                        min="0"
                                        onInput={(event) => updateSettings('inventoryFailure', 'retryAttempts', event.currentTarget.value)}
                                        value={String(settings.inventoryFailure.retryAttempts)}
                                    />
                                    <FieldHelp>Min 0, max 10 retries</FieldHelp>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <s-number-field
                                        label="Days between payment retry attempts"
                                        max="14"
                                        min="1"
                                        onInput={(event) => updateSettings('inventoryFailure', 'retryDays', event.currentTarget.value)}
                                        value={String(settings.inventoryFailure.retryDays)}
                                    />
                                    <FieldHelp>Min 1, max 14 days</FieldHelp>
                                </div>
                            </div>

                            <s-select
                                key={`inventory-failed-action-${settings.inventoryFailure.failedAction}`}
                                label="Action when all retry attempts have failed"
                                onInput={(event) => updateSettings('inventoryFailure', 'failedAction', event.currentTarget.value)}
                                value={settings.inventoryFailure.failedAction}
                            >
                                <s-option selected={settings.inventoryFailure.failedAction === 'skip'} value="skip">
                                    Skip order and send notification
                                </s-option>
                                <s-option selected={settings.inventoryFailure.failedAction === 'pause'} value="pause">
                                    Pause subscription and send notification
                                </s-option>
                                <s-option selected={settings.inventoryFailure.failedAction === 'cancel'} value="cancel">
                                    Cancel subscription and send notification
                                </s-option>
                            </s-select>

                            <s-select
                                key={`inventory-staff-notifications-${settings.inventoryFailure.staffNotifications}`}
                                label="Frequency of notifications to staff"
                                onInput={(event) => updateSettings('inventoryFailure', 'staffNotifications', event.currentTarget.value)}
                                value={settings.inventoryFailure.staffNotifications}
                            >
                                <s-option selected={settings.inventoryFailure.staffNotifications === 'weekly'} value="weekly">
                                    Weekly summary of billing failures
                                </s-option>
                                <s-option selected={settings.inventoryFailure.staffNotifications === 'daily'} value="daily">
                                    Daily summary of billing failures
                                </s-option>
                            </s-select>

                            <button onClick={openNotifications} style={pageStyles.linkButton} type="button">
                                Edit notifications
                            </button>
                        </div>
                    </div>
                </section>

                <section style={pageStyles.row}>
                    <SectionIntro title="Subscription widget" />

                    <div style={pageStyles.singleCard}>
                        <p style={pageStyles.sectionHeading}>Ensure subscriptions display on your store</p>
                        <p style={pageStyles.compactText}>
                            Add the subscription widget to your product page and modify the styling and content to match your store&apos;s theme.
                            The subscription widget will only show on products that can be sold as a subscription.
                        </p>
                        <button onClick={openWidgetInstaller} style={pageStyles.linkButton} type="button">
                            Learn more about theme integration and troubleshooting
                        </button>
                        <div style={pageStyles.linkRow}>
                            <s-button onClick={openWidgetInstaller} variant="secondary">
                                Re-install widget
                            </s-button>
                        </div>
                    </div>
                </section>

                <section style={pageStyles.row}>
                    <SectionIntro title="Subscription management URL" />

                    <div style={pageStyles.singleCard}>
                        <p style={pageStyles.sectionHeading}>Add the subscription management URL to your navigation</p>
                        <p style={pageStyles.compactText}>
                            Add the subscription management URL anywhere you&apos;d like to give customers an entry point to the subscription management page.
                        </p>
                        <button onClick={openNotifications} style={pageStyles.linkButton} type="button">
                            Learn more about customer account settings
                        </button>

                        <div style={pageStyles.urlBox}>
                            <p style={{ ...pageStyles.compactText, wordBreak: 'break-all', flex: '1 1 auto' }}>{settings.managementUrl}</p>
                            <s-button onClick={copyManagementUrl} variant="secondary">
                                Copy
                            </s-button>
                        </div>

                        {copyMessage !== '' ? <p style={pageStyles.smallText}>{copyMessage}</p> : null}
                    </div>
                </section>

                <section style={pageStyles.row}>
                    <SectionIntro title="Subscription notifications" />

                    <div style={pageStyles.singleCard}>
                        <p style={pageStyles.sectionHeading}>Customize notifications</p>
                        <p style={pageStyles.compactText}>
                            Modify your emails in the subscription section to create unique communication for you and your customers.
                            Decide which subscription notification emails you want to receive and which ones you want to send to your customers.
                        </p>
                        <div style={pageStyles.linkRow}>
                            <s-button onClick={openNotifications} variant="secondary">
                                View notifications
                            </s-button>
                        </div>
                    </div>
                </section>

                <div style={pageStyles.saveBar}>
                    <s-button
                        disabled={isLoading || settingsMutation.isPending || !hasUnsavedChanges}
                        onClick={saveSettings}
                        variant="primary"
                    >
                        {settingsMutation.isPending ? 'Saving...' : 'Save'}
                    </s-button>
                </div>
            </div>
        </s-page>
    );
}

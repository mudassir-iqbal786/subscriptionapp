import { useState } from 'react';

const pageStyles = {
    layout: {
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxWidth: '720px',
        margin: '0 auto ',
    },
    card: {
        border: '1px solid #d9dadd',
        borderRadius: '8px',
        background: '#ffffff',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',

    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#202223',
    },
    input: {
        border: '1px solid #aeb4b9',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '14px',
        lineHeight: 1.4,
    },
    textarea: {
        border: '1px solid #aeb4b9',
        borderRadius: '8px',
        minHeight: '120px',
        padding: '10px 12px',
        fontSize: '14px',
        lineHeight: 1.4,
        resize: 'vertical',
    },
    actions: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    message: {
        fontSize: '13px',
        lineHeight: 1.45,
        margin: 0,
    },
    preview: {
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        background: '#f6f6f7',
        padding: '12px',
        fontSize: '13px',
        overflowX: 'auto',
    },
};

const initialMetaobjectForm = {
    title: '',
    description: '',
    handle: '',
};

export default function MetaObject() {
    const [metaobjectForm, setMetaobjectForm] = useState(initialMetaobjectForm);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveError, setSaveError] = useState('');
    const [createdMetaobject, setCreatedMetaobject] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    function updateMetaobjectForm(nextForm) {
        setMetaobjectForm(nextForm);
        setSaveMessage('');
        setSaveError('');
    }

    async function createMetaobject(event) {
        event.preventDefault();
        setIsSaving(true);
        setSaveMessage('');
        setSaveError('');
        setCreatedMetaobject(null);

        try {
            const response = await window.axios.post('/api/metaobjects/subscription', {
                title: metaobjectForm.title,
                description: metaobjectForm.description,
                handle: metaobjectForm.handle || undefined,
            });

            setCreatedMetaobject(response.data.metaobject ?? null);
            shopify.toast.show(response.data.message ?? 'Metaobject created successfully.');
            setMetaobjectForm(initialMetaobjectForm);
        } catch (error) {
            setSaveError(error?.response?.data?.message ?? 'Unable to create the metaobject right now.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <s-page heading="Pra" inlineSize="large">
            <div style={pageStyles.layout}>
                <section style={pageStyles.card}>
                    <div>
                        <h2 style={{ margin: 0 }}>Create metaobject</h2>
                        <p style={{ ...pageStyles.message, color: '#6b7280', marginTop: '6px' }}>
                            Save one subscription metaobject in Shopify.
                        </p>
                    </div>

                    <form onSubmit={createMetaobject} style={pageStyles.fieldGroup}>
                        <label style={pageStyles.field}>
                            <span style={pageStyles.label}>Title</span>
                            <input
                                onChange={(event) => updateMetaobjectForm({ ...metaobjectForm, title: event.target.value })}
                                placeholder="VIP subscription"
                                required
                                style={pageStyles.input}
                                type="text"
                                value={metaobjectForm.title}
                            />
                        </label>

                        <label style={pageStyles.field}>
                            <span style={pageStyles.label}>Description</span>
                            <textarea
                                onChange={(event) => updateMetaobjectForm({ ...metaobjectForm, description: event.target.value })}
                                placeholder="Created from the app"
                                style={pageStyles.textarea}
                                value={metaobjectForm.description}
                            />
                        </label>

                        <label style={pageStyles.field}>
                            <span style={pageStyles.label}>Handle</span>
                            <input
                                onChange={(event) => updateMetaobjectForm({ ...metaobjectForm, handle: event.target.value })}
                                placeholder="vip-subscription"
                                style={pageStyles.input}
                                type="text"
                                value={metaobjectForm.handle}
                            />
                        </label>

                        <div style={pageStyles.actions}>
                            <s-button disabled={isSaving} type="submit" variant="primary">
                                {isSaving ? 'Creating...' : 'Create metaobject'}
                            </s-button>
                        </div>
                    </form>

                    {saveMessage !== '' ? <p style={{ ...pageStyles.message, color: '#15803d' }}>{saveMessage}</p> : null}
                    {saveError !== '' ? <p style={{ ...pageStyles.message, color: '#b91c1c' }}>{saveError}</p> : null}
                </section>

                {createdMetaobject ? (
                    <section style={pageStyles.card}>
                        <h2 style={{ margin: 0 }}>Created metaobject</h2>
                        <pre style={pageStyles.preview}>{JSON.stringify(createdMetaobject, null, 2)}</pre>
                    </section>
                ) : null}
            </div>
        </s-page>
    );
}

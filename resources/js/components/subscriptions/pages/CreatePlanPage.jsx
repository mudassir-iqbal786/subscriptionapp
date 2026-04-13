import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppAnchor, useAppNavigate } from '../navigation.jsx';
import { createPlan, fetchPlans, plansQueryKey } from '../planQueries.js';

const storefrontNote = 'Customers will see this on';
const fallbackSummaryTitle = 'No title';
const defaultProductSwatch = 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)';
const initialOptions = [
    {
        id: 'draft-weekly',
        frequencyValue: '1',
        frequencyUnit: 'Weeks',
        percentageOff: '',
    },
];

function getInitialOptions() {
    return initialOptions.map((option) => ({ ...option }));
}

function getSelectionSummary(products, productVariants) {
    const productCount = products.length;
    const variantCount = productVariants.length;
    const parts = [];

    if (productCount > 0) {
        parts.push(productCount === 1 ? '1 product' : `${productCount} products`);
    }

    if (variantCount > 0) {
        parts.push(variantCount === 1 ? '1 variant' : `${variantCount} variants`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No products or variants selected';
}

function getVariantLabel(variant) {
    return variant.title === 'Default Title' ? `${variant.productTitle} default variant` : variant.title;
}

function getProductThumbStyle(product) {
    if (product.imageUrl) {
        return {
            backgroundImage: `url(${product.imageUrl})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
        };
    }

    return {
        background: product.swatch,
    };
}

export default function CreatePlanPage() {
    const navigateTo = useAppNavigate();
    const queryClient = useQueryClient();
    const selectionFingerprintRef = useRef(null);
    const hasMountedSelectionFingerprint = useRef(false);
    const [title, setTitle] = useState('');
    const [internalDescription, setInternalDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pickerError, setPickerError] = useState('');
    const [isOpeningPicker, setIsOpeningPicker] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedProductVariants, setSelectedProductVariants] = useState([]);
    const [options, setOptions] = useState(() => getInitialOptions());
    const [discountType, setDiscountType] = useState('Percentage off');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [lastAutoOpenedQuery, setLastAutoOpenedQuery] = useState('');

    const deliveryOption = options[0];
    const summaryTitle = title.trim() || fallbackSummaryTitle;
    const summaryDescription = [
        deliveryOption ? `Deliver every ${deliveryOption.frequencyValue} ${deliveryOption.frequencyUnit.toLowerCase()}` : 'No delivery frequency selected',
        getSelectionSummary(selectedProducts, selectedProductVariants),
    ];
    const selectionFingerprint = [
        selectedProducts.map((product) => product.id).join(','),
        selectedProductVariants.map((variant) => variant.id).join(','),
    ].join('|');

    function addOption() {
        setOptions((currentOptions) => [
            ...currentOptions,
            {
                id: `draft-option-${currentOptions.length + 1}`,
                frequencyValue: '1',
                frequencyUnit: 'Weeks',
                percentageOff: '',
            },
        ]);
    }

    function removeOption(optionId) {
        setOptions((currentOptions) => {
            if (currentOptions.length === 1) {
                return currentOptions;
            }

            return currentOptions.filter((option) => option.id !== optionId);
        });
    }

    function updateOption(optionId, field, value) {
        setOptions((currentOptions) => {
            return currentOptions.map((option) => {
                if (option.id !== optionId) {
                    return option;
                }

                return {
                    ...option,
                    [field]: value,
                };
            });
        });
    }

    function removeProduct(productId) {
        setSelectedProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
    }

    function removeProductVariant(variantId) {
        setSelectedProductVariants((currentVariants) => currentVariants.filter((variant) => variant.id !== variantId));
    }

    function getResourcePickerSelectionIds() {
        const selectionsByProductId = new Map();

        selectedProducts.forEach((product) => {
            if (!product?.id) {
                return;
            }

            selectionsByProductId.set(product.id, {
                id: product.id,
            });
        });

        selectedProductVariants.forEach((variant) => {
            if (!variant?.productId || !variant?.id) {
                return;
            }

            const existingSelection = selectionsByProductId.get(variant.productId);

            if (existingSelection && !Array.isArray(existingSelection.variants)) {
                return;
            }

            const variantSelection = existingSelection ?? {
                id: variant.productId,
                variants: [],
            };

            variantSelection.variants.push({
                id: variant.id,
            });

            selectionsByProductId.set(variant.productId, variantSelection);
        });

        return Array.from(selectionsByProductId.values());
    }

    function normalizeSelectedProduct(product) {
        const imageUrl = product.images?.[0]?.originalSrc ?? product.images?.[0]?.url ?? null;
        const variants = Array.isArray(product.variants) ? product.variants : [];

        return {
            id: product.id,
            title: product.title,
            variants: variants.length === 1 ? '1 variant available' : `${variants.length} variants available`,
            imageUrl,
            swatch: defaultProductSwatch,
        };
    }

    function syncResourcePickerSelection(selection) {
        const nextProducts = [];
        const nextVariants = [];

        selection.forEach((product) => {
            const normalizedProduct = normalizeSelectedProduct(product);
            const variants = Array.isArray(product.variants) ? product.variants : [];
            const hasVariantSelection = variants.length > 0 && variants.length < (product.totalVariants ?? variants.length);

            if (!hasVariantSelection) {
                nextProducts.push(normalizedProduct);

                return;
            }

            variants.forEach((variant) => {
                nextVariants.push({
                    id: variant.id,
                    title: variant.title,
                    productId: product.id,
                    productTitle: product.title,
                    imageUrl: variant.image?.originalSrc ?? variant.image?.url ?? normalizedProduct.imageUrl,
                    swatch: normalizedProduct.swatch,
                });
            });
        });

        setSelectedProducts(nextProducts);
        setSelectedProductVariants(nextVariants);
        setPickerError('');
    }

    async function openProductPicker(query = '') {
        if (typeof window.shopify?.resourcePicker !== 'function') {
            setPickerError('Shopify product picker is not available right now.');

            return;
        }

        setIsOpeningPicker(true);
        setPickerError('');

        try {
            const selection = await window.shopify.resourcePicker({
                type: 'product',
                multiple: true,
                filter: {
                    variants: true,
                    query: query.trim() === '' ? undefined : query.trim(),
                },
                selectionIds: getResourcePickerSelectionIds(),
            });

            if (!Array.isArray(selection) || selection.length === 0) {
                return;
            }

            syncResourcePickerSelection(selection);
        } catch (error) {
            setPickerError('Unable to open the Shopify product picker right now.');
        } finally {
            setIsOpeningPicker(false);
        }
    }

    function handleSearchKeyDown(event) {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        void openProductPicker(searchTerm);
    }

    useEffect(() => {
        const normalizedQuery = searchTerm.trim();

        if (normalizedQuery === '') {
            setLastAutoOpenedQuery('');

            return;
        }

        if (isOpeningPicker || lastAutoOpenedQuery === normalizedQuery) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setLastAutoOpenedQuery(normalizedQuery);
            void openProductPicker(normalizedQuery);
        }, 500);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isOpeningPicker, lastAutoOpenedQuery, searchTerm]);

    useEffect(() => {
        if (!hasMountedSelectionFingerprint.current) {
            hasMountedSelectionFingerprint.current = true;

            return;
        }

        selectionFingerprintRef.current?.dispatchEvent(new Event('change', { bubbles: true }));
    }, [selectionFingerprint]);

    const savePlanMutation = useMutation({
        mutationFn: createPlan,
        onSuccess: async (response) => {
            setSaveSuccess(response.message ?? 'Subscription plan created successfully.');
            await queryClient.fetchQuery({
                queryKey: plansQueryKey,
                queryFn: fetchPlans,
            });
            window.setTimeout(() => {
                navigateTo('/plans');
            }, 250);
        },
    });

    async function savePlan() {
        setSaveSuccess('');

        await savePlanMutation.mutateAsync({
            title,
            internalDescription,
            discountType,
            products: selectedProducts.map((product) => ({
                id: product.id,
                title: product.title,
            })),
            productVariants: selectedProductVariants.map((variant) => ({
                id: variant.id,
                title: variant.title,
                productId: variant.productId,
                productTitle: variant.productTitle,
            })),
            options: options.map((option) => ({
                id: option.id,
                frequencyValue: Number(option.frequencyValue),
                frequencyUnit: option.frequencyUnit,
                percentageOff: option.percentageOff === '' ? null : Number(option.percentageOff),
            })),
        });
    }

    function resetCreatePlanForm() {
        setTitle('');
        setInternalDescription('');
        setSearchTerm('');
        setPickerError('');
        setIsOpeningPicker(false);
        setSelectedProducts([]);
        setSelectedProductVariants([]);
        setOptions(getInitialOptions());
        setDiscountType('Percentage off');
        setSaveSuccess('');
        setLastAutoOpenedQuery('');
        savePlanMutation.reset();
    }

    function handleDiscard() {
        resetCreatePlanForm();
    }

    function handleSubmit(event) {
        event.preventDefault();
        void savePlan();
    }

    async function handleBackNavigation(event) {
        event.preventDefault();

        await window.shopify?.saveBar?.leaveConfirmation?.();
        navigateTo('/plans');
    }

    const saveError = savePlanMutation.error?.response?.data?.message ?? 'Unable to create the subscription plan.';
    const hasSaveError = savePlanMutation.isError;
    const isSaving = savePlanMutation.isPending;

    return (
        <form className="plan-description-page" data-save-bar="" onReset={handleDiscard} onSubmit={handleSubmit}>
            <input name="selectedProducts" readOnly ref={selectionFingerprintRef} type="hidden" value={selectionFingerprint} />

            <div className="plan-description-page__header">
                <AppAnchor className="plan-description-page__back" onClick={handleBackNavigation} to="/plans">
                    <span aria-hidden="true">&larr;</span>
                    <span>Create subscription plan</span>
                </AppAnchor>
            </div>

            <div className="plan-description-page__layout">
                <div className="plan-description-page__main">
                    <section className="plan-description-card">
                        <div className="plan-description-card__section">
                            <label className="plan-field">
                                <span>Title</span>
                                <input name="title" onChange={(event) => setTitle(event.target.value)} type="text" value={title} />
                            </label>
                            <p className="plan-field__hint">
                                {storefrontNote} <AppAnchor to="/plans">storefront product pages</AppAnchor> that have subscriptions.
                            </p>
                        </div>

                        <div className="plan-description-card__section">
                            <label className="plan-field">
                                <span>Internal description</span>
                                <input name="internalDescription" onChange={(event) => setInternalDescription(event.target.value)} type="text" value={internalDescription} />
                            </label>
                            <p className="plan-field__hint">For your reference only</p>
                        </div>
                    </section>

                    <section className="plan-description-card">
                        <div className="plan-description-card__title-row">
                            <h2>Products</h2>
                        </div>

                        <div className="plan-product-toolbar">
                            <label className="plan-search-field">
                                <span aria-hidden="true">Search</span>
                                <input
                                    name="productSearch"
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    placeholder="Search products"
                                    type="text"
                                    value={searchTerm}
                                />
                            </label>

                            <button className="plan-secondary-button" onClick={() => void openProductPicker()} type="button">
                                Browse
                            </button>
                        </div>

                        {pickerError ? <p className="plan-field__hint">{pickerError}</p> : null}

                        <p className="plan-field__hint">
                            Start typing to open Shopify&apos;s product picker automatically, or use Browse to open the full product list. From there you can select full products or specific variants for this plan.
                        </p>

                        {selectedProducts.length > 0 || selectedProductVariants.length > 0 ? (
                            <div className="plan-product-list">
                                {selectedProducts.map((product) => (
                                    <article className="plan-product-item plan-product-item--action" key={product.id}>
                                        <span className="plan-product-item__thumb" style={getProductThumbStyle(product)} />

                                        <div className="plan-product-item__content">
                                            <h3>{product.title}</h3>
                                            <span>{product.variants}</span>
                                        </div>

                                        <button className="plan-danger-button" onClick={() => removeProduct(product.id)} type="button">
                                            Remove
                                        </button>
                                    </article>
                                ))}
                                {selectedProductVariants.map((variant) => (
                                    <article className="plan-product-item plan-product-item--action" key={variant.id}>
                                        <span className="plan-product-item__thumb" style={getProductThumbStyle(variant)} />

                                        <div className="plan-product-item__content">
                                            <h3>{getVariantLabel(variant)}</h3>
                                            <span>{variant.productTitle}</span>
                                        </div>

                                        <button className="plan-danger-button" onClick={() => removeProductVariant(variant.id)} type="button">
                                            Remove
                                        </button>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="plan-field__hint">No products selected yet. Use Search or Browse to open Shopify&apos;s product picker.</p>
                        )}
                    </section>

                    <section className="plan-description-card">
                        <div className="plan-description-card__title-row">
                            <h2>Discount and frequency options</h2>
                        </div>

                        <div className="plan-option-panel">
                            <label className="plan-field plan-field--row">
                                <span>Discount type</span>
                                <select name="discountType" onChange={(event) => setDiscountType(event.target.value)} value={discountType}>
                                    <option value="Percentage off">Percentage off</option>
                                    <option value="Fixed amount off">Fixed amount off</option>
                                    <option value="No discount">No discount</option>
                                </select>
                            </label>
                        </div>

                        <div className="plan-option-panel plan-option-panel--stacked">
                            {options.map((option) => (
                                <div className="plan-option-grid" key={option.id}>
                                    <div className="plan-option-grid__header">
                                        <span className="plan-option-grid__title">Option</span>

                                        {options.length > 1 ? (
                                            <button className="plan-option-delete-button" onClick={() => removeOption(option.id)} type="button">
                                                Delete
                                            </button>
                                        ) : null}
                                    </div>

                                    <label className="plan-field">
                                        <span>Delivery frequency</span>
                                        <div className="plan-field__inline">
                                            <input
                                                name={`options[${option.id}][frequencyValue]`}
                                                onChange={(event) => updateOption(option.id, 'frequencyValue', event.target.value)}
                                                type="number"
                                                value={option.frequencyValue}
                                            />
                                            <select
                                                name={`options[${option.id}][frequencyUnit]`}
                                                onChange={(event) => updateOption(option.id, 'frequencyUnit', event.target.value)}
                                                value={option.frequencyUnit}
                                            >
                                                <option value="Days">Days</option>
                                                <option value="Weeks">Weeks</option>
                                                <option value="Months">Months</option>
                                                <option value="Years">Years</option>
                                            </select>
                                        </div>
                                    </label>

                                    <label className="plan-field">
                                        <span>{discountType === 'Fixed amount off' ? 'Fixed amount off' : 'Percentage off'}</span>
                                        <div className="plan-field__suffix">
                                            <input
                                                name={`options[${option.id}][percentageOff]`}
                                                onChange={(event) => updateOption(option.id, 'percentageOff', event.target.value)}
                                                type="number"
                                                value={option.percentageOff}
                                            />
                                            <span>{discountType === 'Fixed amount off' ? '$' : '%'}</span>
                                        </div>
                                    </label>
                                </div>
                            ))}

                            <button className="plan-inline-option-button" onClick={addOption} type="button">
                                <span aria-hidden="true">+</span>
                                <span>Option</span>
                            </button>
                        </div>
                    </section>

                </div>

                <aside className="plan-summary-card">
                    <h2>Summary</h2>
                    <h3>{summaryTitle}</h3>

                    <ul>
                        {summaryDescription.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </aside>
            </div>

            <div className="plan-description-page__actions">
                <div className="plan-description-page__feedback">
                    {hasSaveError ? <p className="plan-feedback plan-feedback--error">{saveError}</p> : null}
                    {saveSuccess ? <p className="plan-feedback plan-feedback--success">{saveSuccess}</p> : null}
                </div>
                <button className="plan-save-button" disabled={isSaving} type="submit">
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </form>
    );
}

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { AppAnchor, useAppNavigate } from '../navigation.jsx';
import { deletePlan, fetchPlanDetail, planDetailQueryKey, plansQueryKey, updatePlan } from '../planQueries.js';

const storefrontNote = 'Customers will see this on';
const defaultProductSwatch = 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)';

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

function buildInitialOptions(plan) {
    const mappedOptions = (plan.plans ?? []).map((sellingPlan, index) => {
        return {
            id: sellingPlan.id ?? `option-${index + 1}`,
            frequencyValue: sellingPlan.frequencyValue ?? '1',
            frequencyUnit: sellingPlan.frequencyUnit ?? 'Weeks',
            percentageOff: sellingPlan.percentageOff ?? '',
            billingPolicy: sellingPlan.billingPolicy ?? {},
            deliveryPolicy: sellingPlan.deliveryPolicy ?? {},
            pricingPolicy: sellingPlan.pricingPolicy ?? {},
        };
    });

    if (mappedOptions.length > 0) {
        return mappedOptions;
    }

    return [
        {
            id: 'draft-option-1',
            frequencyValue: '1',
            frequencyUnit: 'Weeks',
            percentageOff: '',
        },
    ];
}

function getInitialTitle(plan) {
    return plan?.name ?? plan?.plans?.[0]?.name ?? '';
}

function getInitialInternalDescription(plan) {
    const groupDescription = typeof plan?.description === 'string' ? plan.description.trim() : '';
    const firstPlanDescription = typeof plan?.plans?.[0]?.description === 'string' ? plan.plans[0].description.trim() : '';

    return groupDescription || firstPlanDescription || '';
}

function getInitialDiscountType(plan) {
    const firstDiscountedPlan = (plan?.plans ?? []).find((sellingPlan) => {
        return Boolean(sellingPlan.discountType) && sellingPlan.discountType !== 'No discount';
    });

    return firstDiscountedPlan?.discountType ?? plan?.plans?.[0]?.discountType ?? 'No discount';
}

export default function PlanDescriptionPage() {
    const navigateTo = useAppNavigate();
    const queryClient = useQueryClient();
    const { planId = '' } = useParams();
    const { data: plan = null, error, isLoading } = useQuery({
        enabled: Boolean(planId),
        queryKey: planDetailQueryKey(planId),
        queryFn: () => fetchPlanDetail(planId),
    });
    const [title, setTitle] = useState('');
    const [internalDescription, setInternalDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pickerError, setPickerError] = useState('');
    const [isOpeningPicker, setIsOpeningPicker] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedProductVariants, setSelectedProductVariants] = useState([]);
    const [options, setOptions] = useState([]);
    const [discountType, setDiscountType] = useState('No discount');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [actionError, setActionError] = useState('');
    const [isFormHydrated, setIsFormHydrated] = useState(false);
    const [lastAutoOpenedQuery, setLastAutoOpenedQuery] = useState('');

    useEffect(() => {
        setIsFormHydrated(false);

        if (!plan) {
            return;
        }

        setTitle(getInitialTitle(plan));
        setInternalDescription(getInitialInternalDescription(plan));
        setSelectedProducts(Array.isArray(plan.products) ? plan.products : []);
        setSelectedProductVariants(Array.isArray(plan.productVariants) ? plan.productVariants : []);
        setOptions(buildInitialOptions(plan));
        setDiscountType(getInitialDiscountType(plan));
        setIsFormHydrated(true);
    }, [plan]);

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

    const updatePlanMutation = useMutation({
        mutationFn: updatePlan,
        onSuccess: async (response) => {
            setSaveSuccess(response.message ?? 'Subscription plan updated successfully.');
            setActionError('');
            await queryClient.invalidateQueries({
                queryKey: plansQueryKey,
            });
            await queryClient.invalidateQueries({
                queryKey: planDetailQueryKey(planId),
            });
        },
    });

    const deletePlanMutation = useMutation({
        mutationFn: deletePlan,
        onSuccess: async () => {
            setActionError('');
            await queryClient.invalidateQueries({
                queryKey: plansQueryKey,
            });
            navigateTo('/plans');
        },
    });

    const deliveryOption = options[0];
    const summaryDescription = [
        deliveryOption ? `Deliver every ${deliveryOption.frequencyValue} ${deliveryOption.frequencyUnit.toLowerCase()}` : 'No delivery frequency selected',
        getSelectionSummary(selectedProducts, selectedProductVariants),
        discountType === 'No discount'
            ? 'No discount'
            : `${deliveryOption?.percentageOff || 0}${discountType === 'Fixed amount off' ? '$' : '%'} off`,
    ];

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

        console.log("values" ,selectionsByProductId.values());
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
        } catch (loadError) {
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


    async function handleDeletePlan() {
        setSaveSuccess('');
        setActionError('');

        await deletePlanMutation.mutateAsync(planId);
    }

    async function savePlan() {
        setSaveSuccess('');
        setActionError('');

        await updatePlanMutation.mutateAsync({
            planId,
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

    const mutationError =
        actionError ||
        deletePlanMutation.error?.response?.data?.message ||
        updatePlanMutation.error?.response?.data?.message ||
        '';
    const saveError = mutationError || 'Unable to update the subscription plan.';
    const hasSaveError = Boolean(mutationError);

    if (isLoading || (plan && !isFormHydrated)) {
        return (
            <div className="plan-description-page">
                <p className="plan-field__hint">Loading plan details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="plan-description-page">
                <p className="plan-feedback plan-feedback--error">Unable to load this subscription plan right now.</p>
            </div>
        );
    }

    if (!planId || !plan) {
        return (
            <div className="plan-description-page">
                <div className="plan-description-page__header">
                    <AppAnchor className="plan-description-page__back" to="/plans">
                        <span aria-hidden="true">&larr;</span>
                        <span>Back to plans</span>
                    </AppAnchor>
                </div>

                <p className="plan-field__hint">Select a plan from the plans list to view and update its details.</p>
            </div>
        );
    }

    return (
        <div className="plan-description-page">
            <div className="plan-description-page__header">
                <AppAnchor className="plan-description-page__back" to="/plans">
                    <span aria-hidden="true"><s-icon type="arrow-left"> </s-icon></span>
                    <h1>{plan.name}</h1>
                </AppAnchor>
            </div>

            <div className="plan-description-page__layout">
                <div className="plan-description-page__main">
                    <section className="plan-description-card">
                        <div className="plan-description-card__section">
                            <label className="plan-field">
                                <span>Title</span>
                                <input onChange={(event) => setTitle(event.target.value)} type="text" value={title} />
                            </label>
                            <p className="plan-field__hint">
                                {storefrontNote} <AppAnchor to="/plans">storefront product pages</AppAnchor> that have subscriptions.
                            </p>
                        </div>

                        <div className="plan-description-card__section">
                            <label className="plan-field">
                                <span>Internal description</span>
                                <input onChange={(event) => setInternalDescription(event.target.value)} type="text" value={internalDescription} />
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
                                <select onChange={(event) => setDiscountType(event.target.value)} value={discountType}>
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
                                                onChange={(event) => updateOption(option.id, 'frequencyValue', event.target.value)}
                                                type="number"
                                                value={option.frequencyValue}
                                            />
                                            <select
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
                                        <span>
                                            {discountType === 'No discount'
                                                ? 'Discount value'
                                                : discountType === 'Fixed amount off'
                                                  ? 'Fixed amount off'
                                                  : 'Percentage off'}
                                        </span>
                                        <div className="plan-field__suffix">
                                            <input
                                                disabled={discountType === 'No discount'}
                                                onChange={(event) => updateOption(option.id, 'percentageOff', event.target.value)}
                                                type="number"
                                                value={option.percentageOff}
                                            />
                                            <span>
                                                {discountType === 'No discount' ? '-' : discountType === 'Fixed amount off' ? '$' : '%'}
                                            </span>
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
                    <h3>{title || 'No title'}</h3>

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
                <button className="plan-secondary-button" onClick={() => navigateTo('/plans')} type="button">
                    Cancel
                </button>
                <button
                    className="plan-danger-button"
                    disabled={deletePlanMutation.isPending || updatePlanMutation.isPending}
                    onClick={handleDeletePlan}
                    type="button"
                >
                    {deletePlanMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
                <button
                    className="plan-save-button"
                    disabled={updatePlanMutation.isPending || deletePlanMutation.isPending}
                    onClick={savePlan}
                    type="button"
                >
                    {updatePlanMutation.isPending ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}

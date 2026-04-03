import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appUrl, navigateTo } from '../navigation.js';
import { deletePlan, fetchPlanDetail, planDetailQueryKey, plansQueryKey, updatePlan } from '../planQueries.js';

const storefrontNote = 'Customers will see this on';
const getProductsUrl = '/api/get-products';
const searchProductsUrl = '/api/search-products';

function getPlanIdFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);

    return searchParams.get('planId');
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
    return plan?.description ?? plan?.plans?.[0]?.description ?? '';
}

function getInitialDiscountType(plan) {
    const firstDiscountedPlan = (plan?.plans ?? []).find((sellingPlan) => {
        return Boolean(sellingPlan.discountType) && sellingPlan.discountType !== 'No discount';
    });

    return firstDiscountedPlan?.discountType ?? plan?.plans?.[0]?.discountType ?? 'No discount';
}

export default function PlanDescriptionPage() {
    const queryClient = useQueryClient();
    const planId = getPlanIdFromUrl();
    const { data: plan = null, error, isLoading } = useQuery({
        enabled: Boolean(planId),
        queryKey: planDetailQueryKey(planId),
        queryFn: () => fetchPlanDetail(planId),
    });
    const [title, setTitle] = useState('');
    const [internalDescription, setInternalDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [catalogProducts, setCatalogProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [options, setOptions] = useState([]);
    const [discountType, setDiscountType] = useState('No discount');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [actionError, setActionError] = useState('');
    const [isFormHydrated, setIsFormHydrated] = useState(false);

    useEffect(() => {
        setIsFormHydrated(false);

        if (!plan) {
            return;
        }

        setTitle(getInitialTitle(plan));
        setInternalDescription(getInitialInternalDescription(plan));
        setSelectedProducts(Array.isArray(plan.products) ? plan.products : []);
        setOptions(buildInitialOptions(plan));
        setDiscountType(getInitialDiscountType(plan));
        setIsFormHydrated(true);
    }, [plan]);

    useEffect(() => {
        let isMounted = true;

        async function loadProducts() {
            try {
                const response = await window.axios.get(getProductsUrl, {
                    params: {
                        limit: 12,
                    },
                });

                if (!isMounted) {
                    return;
                }

                setCatalogProducts(response.data.products ?? []);
                setSearchError('');
            } catch (loadError) {
                if (!isMounted) {
                    return;
                }

                setSearchError('Unable to load Shopify products right now.');
            } finally {
                if (isMounted) {
                    setIsLoadingProducts(false);
                }
            }
        }

        loadProducts();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(async () => {
            setIsSearching(true);
            setSearchError('');

            try {
                const response = await window.axios.get(searchTerm.trim() === '' ? getProductsUrl : searchProductsUrl, {
                    params: searchTerm.trim() === ''
                        ? {
                              limit: 12,
                          }
                        : {
                              query: searchTerm,
                              limit: 12,
                          },
                });

                setCatalogProducts(response.data.products ?? []);
            } catch (loadError) {
                setSearchError('Unable to load Shopify products right now.');
            } finally {
                setIsSearching(false);
            }
        }, searchTerm.trim() === '' ? 0 : 300);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [searchTerm]);

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

    const availableProducts = catalogProducts.filter((product) => {
        return selectedProducts.every((selectedProduct) => selectedProduct.id !== product.id);
    });

    const deliveryOption = options[0];
    const summaryDescription = [
        deliveryOption ? `Deliver every ${deliveryOption.frequencyValue} ${deliveryOption.frequencyUnit.toLowerCase()}` : 'No delivery frequency selected',
        selectedProducts.length === 1 ? '1 product' : `${selectedProducts.length} products`,
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

    function addProduct(product) {
        setSelectedProducts((currentProducts) => {
            if (currentProducts.some((currentProduct) => currentProduct.id === product.id)) {
                return currentProducts;
            }

            return [...currentProducts, product];
        });
        setSearchTerm('');
    }

    function removeProduct(productId) {
        setSelectedProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
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
                    <a className="plan-description-page__back" href={appUrl('/plans')}>
                        <span aria-hidden="true">&larr;</span>
                        <span>Back to plans</span>
                    </a>
                </div>

                <p className="plan-field__hint">Select a plan from the plans list to view and update its details.</p>
            </div>
        );
    }

    return (
        <div className="plan-description-page">
            <div className="plan-description-page__header">
                <a className="plan-description-page__back" href={appUrl('/plans')}>
                    <span aria-hidden="true">&larr;</span>
                    <span>{plan.name}</span>
                </a>
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
                                {storefrontNote} <a href={appUrl('/plans')}>storefront product pages</a> that have subscriptions.
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
                                    placeholder="Search products"
                                    type="text"
                                    value={searchTerm}
                                />
                            </label>

                            <button className="plan-secondary-button" onClick={() => setSearchTerm('')} type="button">
                                Browse
                            </button>
                        </div>

                        {searchError ? <p className="plan-field__hint">{searchError}</p> : null}
                        {isLoadingProducts ? <p className="plan-field__hint">Loading Shopify products...</p> : null}
                        {isSearching ? <p className="plan-field__hint">Searching Shopify products...</p> : null}

                        {!isLoadingProducts && availableProducts.length > 0 ? (
                            <div className="plan-product-list plan-product-list--search">
                                {availableProducts.map((product) => (
                                    <article className="plan-product-item plan-product-item--action" key={product.id}>
                                        <span className="plan-product-item__thumb" style={getProductThumbStyle(product)} />

                                        <div className="plan-product-item__content">
                                            <h3>{product.title}</h3>
                                            <span>{product.variants}</span>
                                        </div>

                                        <button className="plan-secondary-button" onClick={() => addProduct(product)} type="button">
                                            Add
                                        </button>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="plan-field__hint">
                                {searchTerm.trim() !== '' ? 'No Shopify products match your search.' : 'All available Shopify products are already linked to this plan.'}
                            </p>
                        )}

                        {selectedProducts.length > 0 ? (
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
                            </div>
                        ) : (
                            <p className="plan-field__hint">Search for a product above, then add it to this plan.</p>
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

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppAnchor, useAppNavigate } from '../navigation.jsx';
import { createPlan, fetchPlans, plansQueryKey } from '../planQueries.js';

const storefrontNote = 'Customers will see this on';
const fallbackSummaryTitle = 'No title';
const getProductsUrl = '/api/get-products';
const searchProductsUrl = '/api/search-products';
const initialOptions = [
    {
        id: 'draft-weekly',
        frequencyValue: '1',
        frequencyUnit: 'Weeks',
        percentageOff: '',
    },
];

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
    const [title, setTitle] = useState('');
    const [internalDescription, setInternalDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [catalogProducts, setCatalogProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [options, setOptions] = useState(initialOptions);
    const [discountType, setDiscountType] = useState('Percentage off');
    const [saveSuccess, setSaveSuccess] = useState('');

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
            } catch (error) {
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
        if (searchTerm.trim() === '') {
            const timeoutId = window.setTimeout(async () => {
                setIsSearching(true);
                setSearchError('');

                try {
                    const response = await window.axios.get(getProductsUrl, {
                        params: {
                            limit: 12,
                        },
                    });

                    setCatalogProducts(response.data.products ?? []);
                } catch (error) {
                    setSearchError('Unable to load Shopify products right now.');
                } finally {
                    setIsSearching(false);
                }
            }, 0);

            return () => {
                window.clearTimeout(timeoutId);
            };
        }

        const timeoutId = window.setTimeout(async () => {
            setIsSearching(true);
            setSearchError('');

            try {
                const response = await window.axios.get(searchProductsUrl, {
                    params: {
                        query: searchTerm,
                        limit: 12,
                    },
                });

                setCatalogProducts(response.data.products ?? []);
            } catch (error) {
                setSearchError('Unable to load Shopify products right now.');
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [searchTerm]);

    const availableProducts = catalogProducts.filter((product) => {
        return selectedProducts.every((selectedProduct) => selectedProduct.id !== product.id);
    });
    const deliveryOption = options[0];
    const summaryTitle = title.trim() || fallbackSummaryTitle;
    const summaryDescription = [
        deliveryOption ? `Deliver every ${deliveryOption.frequencyValue} ${deliveryOption.frequencyUnit.toLowerCase()}` : 'No delivery frequency selected',
        selectedProducts.length === 1 ? '1 product' : `${selectedProducts.length} products`,
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
            options: options.map((option) => ({
                id: option.id,
                frequencyValue: Number(option.frequencyValue),
                frequencyUnit: option.frequencyUnit,
                percentageOff: option.percentageOff === '' ? null : Number(option.percentageOff),
            })),
        });
    }

    const saveError = savePlanMutation.error?.response?.data?.message ?? 'Unable to create the subscription plan.';
    const hasSaveError = savePlanMutation.isError;
    const isSaving = savePlanMutation.isPending;

    return (
        <div className="plan-description-page">
            <div className="plan-description-page__header">
                <AppAnchor className="plan-description-page__back" to="/plans">
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
                                {searchTerm.trim() !== '' ? 'No Shopify products match your search.' : 'All available Shopify products have been added to this plan.'}
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
                                        <span>{discountType === 'Fixed amount off' ? 'Fixed amount off' : 'Percentage off'}</span>
                                        <div className="plan-field__suffix">
                                            <input
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
                <button className="plan-save-button" disabled={isSaving} onClick={savePlan} type="button">
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}

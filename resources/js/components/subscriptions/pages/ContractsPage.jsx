import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { contractDetailQueryKey, contractsQueryKey, fetchContractDetail, fetchContracts, importContracts } from '../contractQueries.js';
import { useAppNavigate } from '../navigation.jsx';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const contractCsvTemplate = `handle,upcoming_billing_date,customer_id,currency_code,status,cadence_interval,cadence_interval_count,customer_payment_method_id,delivery_price,delivery_method_type,delivery_address_first_name,delivery_address_last_name,delivery_address_address1,delivery_address_address2,delivery_address_city,delivery_address_province_code,delivery_address_country_code,delivery_address_company,delivery_address_zip,delivery_address_phone,delivery_local_delivery_phone,delivery_local_delivery_instructions,delivery_pickup_method_location_id,line_variant_id,line_quantity,line_current_price,line_selling_plan_id,line_selling_plan_name
Example-beverage-contract,2024-04-12T17:00:00Z,6320530986896,USD,ACTIVE,MONTH,3,24e8c839c47ef47d30ad28346d130e74,0,SHIPPING,Jane,Doe,2470 Bedford Ave,,Buffalo,NY,US,,11226,,,,,53154087005812,1,50,3607724288,"Subscription, delivery every 3 months, save 10%"
Example-beverage-contract,,,,,,,,,,,,,,,,,,,,,,,53174099004429,1,60,3607724288,"Subscription, delivery every 3 months, save 10%"
Example-beauty-contract,2024-05-30T17:00:00Z,78305302228237,USD,ACTIVE,WEEK,1,a1d3d48124f02024b3227690cf000b54,13.36,SHIPPING,John,Doevin,627 Broadway St,,New York,NY,US,,10012,,,,,46603574837304,1,24.99,8406368345,"Subscription, delivery every week, save 15%"`;

function getStatusTone(status) {
    if (status === 'Paused') {
        return 'warning';
    }

    if (status === 'Canceled' || status === 'Failed') {
        return 'critical';
    }

    return 'success';
}

function formatIsoDateForExport(value) {
    if (!value || value === 'Unavailable') {
        return '';
    }

    const timestamp = Date.parse(value);

    if (Number.isNaN(timestamp)) {
        return '';
    }

    return new Date(timestamp).toISOString();
}

function normalizeStatusForExport(status) {
    if (!status) {
        return '';
    }

    if (status === 'Canceled') {
        return 'CANCELLED';
    }

    return String(status).toUpperCase();
}

function normalizeCadenceInterval(intervalLabel) {
    const normalizedLabel = String(intervalLabel ?? '').toUpperCase();

    if (normalizedLabel.startsWith('DAY')) {
        return 'DAY';
    }

    if (normalizedLabel.startsWith('WEEK')) {
        return 'WEEK';
    }

    if (normalizedLabel.startsWith('YEAR')) {
        return 'YEAR';
    }

    return 'MONTH';
}

function parseDeliveryFrequency(deliveryFrequency) {
    const match = String(deliveryFrequency ?? '').match(/Every\s+(\d+)\s+(\w+)/i);

    if (!match) {
        return {
            cadence_interval: '',
            cadence_interval_count: '',
        };
    }

    return {
        cadence_interval: normalizeCadenceInterval(match[2]),
        cadence_interval_count: match[1],
    };
}

function splitCustomerName(name) {
    const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' '),
    };
}

function extractAddressParts(addressLines = []) {
    const [nameLine = '', address1 = '', address2 = '', cityLine = '', country = ''] = addressLines;
    const { firstName, lastName } = splitCustomerName(nameLine);
    const cityParts = String(cityLine).split(',').map((part) => part.trim()).filter(Boolean);

    return {
        delivery_address_first_name: firstName,
        delivery_address_last_name: lastName,
        delivery_address_address1: address1,
        delivery_address_address2: address2,
        delivery_address_city: cityParts[0] ?? '',
        delivery_address_province_code: cityParts[1] ?? '',
        delivery_address_zip: cityParts[2] ?? '',
        delivery_address_country_code: country,
    };
}

function normalizeDeliveryMethodType(type) {
    if (!type) {
        return '';
    }

    if (type === 'Local delivery') {
        return 'LOCAL_DELIVERY';
    }

    if (type === 'Pickup') {
        return 'PICKUP';
    }

    return 'SHIPPING';
}

function buildExportRows(contracts) {
    return contracts.flatMap((contract) => {
        const cadence = parseDeliveryFrequency(contract.deliveryFrequency);
        const address = extractAddressParts(contract.deliveryMethod?.addressLines ?? contract.customer?.addressLines ?? []);
        const lineItems = contract.lineItems?.length
            ? contract.lineItems
            : [{
                id: contract.id,
                quantity: contract.quantity ?? '1',
                unitPrice: contract.productPrice ?? '',
                variantId: '',
                sellingPlanId: '',
                sellingPlanName: contract.plan ?? '',
            }];

        return lineItems.map((lineItem, index) => ({
            handle: contract.id ?? '',
            upcoming_billing_date: formatIsoDateForExport(contract.nextBillingDate ?? contract.createdAt),
            customer_id: '',
            currency_code: contract.currencyCode ?? '',
            status: normalizeStatusForExport(contract.status),
            cadence_interval: cadence.cadence_interval,
            cadence_interval_count: cadence.cadence_interval_count,
            customer_payment_method_id: '',
            delivery_price: String(contract.deliveryMethod?.type === 'Shipping' ? (contract.paymentSummary?.find((item) => item.label === 'Shipping')?.value ?? '').replace(/[^\d.-]/g, '') : '0'),
            delivery_method_type: normalizeDeliveryMethodType(contract.deliveryMethod?.type),
            delivery_address_first_name: address.delivery_address_first_name,
            delivery_address_last_name: address.delivery_address_last_name,
            delivery_address_address1: address.delivery_address_address1,
            delivery_address_address2: address.delivery_address_address2,
            delivery_address_city: address.delivery_address_city,
            delivery_address_province_code: address.delivery_address_province_code,
            delivery_address_country_code: address.delivery_address_country_code,
            delivery_address_company: '',
            delivery_address_zip: address.delivery_address_zip,
            delivery_address_phone: '',
            delivery_local_delivery_phone: '',
            delivery_local_delivery_instructions: '',
            delivery_pickup_method_location_id: '',
            line_variant_id: lineItem.variantId ?? '',
            line_quantity: lineItem.quantity ?? '1',
            line_current_price: String(lineItem.unitPrice ?? '').replace(/[^\d.-]/g, ''),
            line_selling_plan_id: lineItem.sellingPlanId ?? '',
            line_selling_plan_name: lineItem.sellingPlanName ?? lineItem.subtitle ?? contract.plan ?? '',
        }));
    });
}

function buildCsvContent(rows) {
    if (rows.length === 0) {
        return '';
    }

    const headers = Object.keys(rows[0]);
    const lines = rows.map((row) =>
        headers
            .map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`)
            .join(',')
    );

    return [headers.join(','), ...lines].join('\n');
}

function downloadFile(filename, content, mimeType = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
}

function getBulkActionButtonClass(action, isEnabled, activeBulkAction) {
    const classes = [''];

    if (isEnabled) {
        classes.push('enabled');
    }

    if (activeBulkAction === action) {
        classes.push('working');
    }

    return classes.join(' ');
}

export default function ContractsPage() {
    const location = useLocation();
    const navigateTo = useAppNavigate();
    const restoredPageState = location.state?.contractsPageState ?? {};
    const initialPage = Math.max(1, Number(restoredPageState.page ?? 1) || 1);
    const initialPageSize = [10, 25, 50].includes(Number(restoredPageState.perPage))
        ? Number(restoredPageState.perPage)
        : 10;
    const initialFilter = ['All', 'Active', 'Paused', 'Canceled'].includes(restoredPageState.filter ?? '')
        ? restoredPageState.filter
        : 'All';
    const queryClient = useQueryClient();
    const exportModalRef = useRef(null);
    const importModalRef = useRef(null);
    const importFileInputRef = useRef(null);
    const notificationTimeoutRef = useRef(null);
    const [activeFilter, setActiveFilter] = useState(initialFilter);
    const [selectedContractIds, setSelectedContractIds] = useState([]);
    const [selectedImportFile, setSelectedImportFile] = useState(null);
    const [importError, setImportError] = useState('');
    const [actionError, setActionError] = useState('');
    const [liveNotification, setLiveNotification] = useState('');
    const [activeBulkAction, setActiveBulkAction] = useState('');
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [exportScope, setExportScope] = useState('all');
    const [exportFormat, setExportFormat] = useState('excel');

    const { data, error, isLoading } = useQuery({
        queryKey: contractsQueryKey(currentPage, pageSize, activeFilter),
        queryFn: () => fetchContracts(currentPage, pageSize, activeFilter),
    });
    const contracts = data?.contracts ?? [];
    const pagination = data?.pagination ?? {
        page: currentPage,
        perPage: pageSize,
        hasPreviousPage: false,
        hasNextPage: false,
        from: 0,
        to: 0,
    };


    useEffect(() => {
        const pusherAppKey = document.querySelector('meta[name="pusher-app-key"]')?.getAttribute('content') ?? '';
        const pusherAppCluster = document.querySelector('meta[name="pusher-app-cluster"]')?.getAttribute('content') ?? '';
        const contractsBroadcastChannel = document.querySelector('meta[name="contracts-broadcast-channel"]')?.getAttribute('content') ?? '';

        console.log('[ContractsPage] Live contracts init', {
            hasPusherAppKey: pusherAppKey !== '',
            pusherAppCluster,
            contractsBroadcastChannel,
        });

        if (pusherAppKey === '' || pusherAppCluster === '' || contractsBroadcastChannel === '') {
            console.warn('[ContractsPage] Live contracts listener skipped because Pusher config is missing.');
            return undefined;
        }

        const echo = new Echo({
            broadcaster: 'pusher',
            client: new Pusher(pusherAppKey, {
                cluster: pusherAppCluster,
                forceTLS: true,
            }),
        });

        const channel = echo.channel(contractsBroadcastChannel);

        channel.subscribed(() => {
            console.log('[ContractsPage] Subscribed to live contracts channel', contractsBroadcastChannel);
        });

        channel.error((channelError) => {
            console.error('[ContractsPage] Live contracts channel error', channelError);
        });

        channel.listen('.contract.created', async (event) => {
            console.log('[ContractsPage] Live contract event received', event);

            const contractLabel = event?.contractId ? ` ${event.contractId}` : '';
            const notificationMessage = `A new subscription contract${contractLabel} was received and the list was refreshed.`;

            setLiveNotification(notificationMessage);
            shopify.toast.show(notificationMessage);
            // window.alert(notificationMessage);
            await queryClient.invalidateQueries({ queryKey: ['contracts'] });
        });

        return () => {
            console.log('[ContractsPage] Leaving live contracts channel', contractsBroadcastChannel);
            echo.leave(contractsBroadcastChannel);
            echo.disconnect();
        };
    }, [queryClient]);

    useEffect(() => {
        if (liveNotification === '') {
            if (notificationTimeoutRef.current !== null) {
                window.clearTimeout(notificationTimeoutRef.current);
                notificationTimeoutRef.current = null;
            }

            return undefined;
        }

        notificationTimeoutRef.current = window.setTimeout(() => {
            setLiveNotification('');
            notificationTimeoutRef.current = null;
        }, 5000);

        return () => {
            if (notificationTimeoutRef.current !== null) {
                window.clearTimeout(notificationTimeoutRef.current);
                notificationTimeoutRef.current = null;
            }
        };
    }, [liveNotification]);

    const importMutation = useMutation({
        mutationFn: importContracts,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['contracts'] });
            closeImportModal();
        },
        onError: (requestError) => {
            setImportError(requestError?.response?.data?.message ?? 'Unable to import this CSV right now.');
        },
    });

    const visibleContracts = contracts;
    const selectedVisibleContracts = visibleContracts.filter((contract) => selectedContractIds.includes(contract.id));
    const selectedActionableContracts = selectedVisibleContracts.filter((contract) => !contract.isImported);
    const allVisibleSelected = visibleContracts.length > 0 && selectedVisibleContracts.length === visibleContracts.length;
    const canExportSelected = selectedVisibleContracts.length > 0;
    const selectedCount = selectedVisibleContracts.length;
    const canPauseSelected = selectedActionableContracts.some((contract) => contract.status !== 'Paused' && contract.status !== 'Canceled');
    const canResumeSelected = selectedActionableContracts.some((contract) => contract.status === 'Paused');
    const canCancelSelected = selectedActionableContracts.some((contract) => contract.status !== 'Canceled');
    const hasPreviousPage = pagination.hasPreviousPage;
    const hasNextPage = pagination.hasNextPage;

    function handleRowNavigation(contractId) {
        void queryClient.prefetchQuery({
            queryKey: contractDetailQueryKey(contractId),
            queryFn: () => fetchContractDetail(contractId),
        });

        navigateTo(`/contracts/detail/${encodeURIComponent(contractId)}`, {
            state: {
                contractsPageState: {
                    page: currentPage,
                    perPage: pageSize,
                    filter: activeFilter,
                },
            },
        });
    }

    function prefetchContractDetail(contractId) {
        void queryClient.prefetchQuery({
            queryKey: contractDetailQueryKey(contractId),
            queryFn: () => fetchContractDetail(contractId),
            staleTime: 30_000,
        });
    }

    function handleFilterChange(filter) {
        setActiveFilter(filter);
        setCurrentPage(1);
    }

    function toggleContractSelection(contractId) {
        setActionError('');

        setSelectedContractIds((currentIds) => {
            if (currentIds.includes(contractId)) {
                return currentIds.filter((currentId) => currentId !== contractId);
            }

            return [...currentIds, contractId];
        });
    }

    function toggleVisibleSelections() {
        setActionError('');

        if (allVisibleSelected) {
            setSelectedContractIds((currentIds) => currentIds.filter((contractId) => !visibleContracts.some((contract) => contract.id === contractId)));
            return;
        }

        setSelectedContractIds((currentIds) => {
            const nextIds = new Set(currentIds);

            visibleContracts.forEach((contract) => {
                nextIds.add(contract.id);
            });

            return Array.from(nextIds);
        });
    }

    function openExportModal() {
        setExportScope(selectedVisibleContracts.length > 0 ? 'selected' : 'all');
        setExportFormat('excel');
    }

    function closeExportModal() {
        exportModalRef.current?.hideOverlay();
    }

    function openImportModal() {
        setSelectedImportFile(null);
        setImportError('');
        if (importFileInputRef.current) {
            importFileInputRef.current.value = '';
        }
    }

    function closeImportModal() {
        importModalRef.current?.hideOverlay();
        setSelectedImportFile(null);
        setImportError('');
        if (importFileInputRef.current) {
            importFileInputRef.current.value = '';
        }
    }

    function handleExportContracts() {
        const contractsToExport = exportScope === 'selected' && canExportSelected ? selectedVisibleContracts : visibleContracts;
        const rows = buildExportRows(contractsToExport);
        const csvContent = buildCsvContent(rows);

        if (csvContent === '') {
            closeExportModal();
            return;
        }

        const filePrefix = exportFormat === 'excel' ? '\uFEFF' : '';
        const dateStamp = new Date().toISOString().slice(0, 10);
        downloadFile(`subscription-contracts-${dateStamp}.csv`, `${filePrefix}${csvContent}`);
        closeExportModal();
    }

    function handleDownloadSample() {
        downloadFile('subscription-contracts-csv-template.csv', `\uFEFF${contractCsvTemplate}`);
    }

    function handleOpenImportFilePicker() {
        importFileInputRef.current?.click();
    }

    function handlePreviousPage() {
        if (!hasPreviousPage) {
            return;
        }

        setCurrentPage((page) => page - 1);
    }

    function handleNextPage() {
        if (!hasNextPage) {
            return;
        }

        setCurrentPage((page) => page + 1);
    }

    function handlePageSizeChange(event) {
        setPageSize(Number(event.currentTarget.value));
        setCurrentPage(1);
    }

    function handleImportFileChange(event) {
        const [file] = Array.from(event.target.files ?? []);
        setSelectedImportFile(file ?? null);
        setImportError('');
    }

    function handleUploadImportFile() {
        if (!selectedImportFile || importMutation.isPending) {
            return;
        }

        setImportError('');
        importMutation.mutate(selectedImportFile);
    }

    async function handleBulkAction(action) {
        if (activeBulkAction !== '') {
            return;
        }

        const contractsForAction = selectedActionableContracts.filter((contract) => {
            if (action === 'pause') {
                return contract.status !== 'Paused' && contract.status !== 'Canceled';
            }

            if (action === 'resume') {
                return contract.status === 'Paused';
            }

            return contract.status !== 'Canceled';
        });

        if (contractsForAction.length === 0) {
            return;
        }

        setActionError('');
        setActiveBulkAction(action);

        try {
            await Promise.all(
                contractsForAction.map((contract) => window.axios.post(`/api/contracts/${encodeURIComponent(contract.id)}/${action}`))
            );

            setSelectedContractIds([]);
            await queryClient.invalidateQueries({ queryKey: ['contracts'] });
        } catch (requestError) {
            setActionError(requestError?.response?.data?.message ?? `Unable to ${action} the selected subscription contracts right now.`);
        } finally {
            setActiveBulkAction('');
        }
    }

    return (
        <s-page inlineSize="large">
            <div className="contracts-page__header">
                <h1>Subscription contracts</h1>

                <div className="contracts-page__actions">
                    <s-button className="" command="--show" commandFor="contracts-export-modal" onClick={openExportModal} type="button">
                        Export
                    </s-button>
                    <s-button className="" command="--show" commandFor="contracts-import-modal" onClick={openImportModal} type="button">
                        Import
                    </s-button>
                </div>
            </div>

            <section className="contracts-table-card">
                <div className="contracts-table-card__toolbar">
                    <div className="contracts-filter-tabs">
                        {['All', 'Active', 'Paused', 'Canceled'].map((filter) => (
                            <s-button
                                // className={filter === activeFilter ? '' : ''}

                                variant={filter === activeFilter ? 'primary' : ''}
                                key={filter}
                                onClick={() => handleFilterChange(filter)}
                                type="button"
                            >
                                {filter}
                            </s-button>
                        ))}
                    </div>

                    <button className="contracts-table-sort" type="button">
                        <svg aria-hidden="true" className="contracts-table-sort__icon" viewBox="0 0 20 20">
                            <path d="M7 3l-3 3h2.25v8.25h1.5V6H10L7 3zm6 14l3-3h-2.25V5.75h-1.5V14H10l3 3z" fill="currentColor" />
                        </svg>
                    </button>
                </div>

                <div className="contracts-table">
                    {selectedCount > 0 ? (
                        <div className="contracts-table__selection-bar">
                            <div className="contracts-table__selection-summary">
                                <label className="contracts-table__check">
                                    <input checked={allVisibleSelected} onChange={toggleVisibleSelections} type="checkbox" />
                                </label>
                                <s-heading>{selectedCount} selected</s-heading>
                            </div>

                            <div className="contracts-table__selection-actions">
                                <s-button
                                    className={getBulkActionButtonClass('pause', canPauseSelected, activeBulkAction)}
                                    disabled={!canPauseSelected || activeBulkAction !== ''}
                                    onClick={() => handleBulkAction('pause')}
                                    type="button"
                                >
                                    {activeBulkAction === 'pause' ? 'Pausing...' : 'Pause'}
                                </s-button>
                                <s-button
                                    className={getBulkActionButtonClass('resume', canResumeSelected, activeBulkAction)}
                                    disabled={!canResumeSelected || activeBulkAction !== ''}
                                    onClick={() => handleBulkAction('resume')}
                                    type="button"
                                >
                                    {activeBulkAction === 'resume' ? 'Resuming...' : 'Resume'}
                                </s-button>
                                <s-button
                                    className={getBulkActionButtonClass('cancel', canCancelSelected, activeBulkAction)}
                                    disabled={!canCancelSelected || activeBulkAction !== ''}
                                    onClick={() => handleBulkAction('cancel')}
                                    type="button"
                                >
                                    {activeBulkAction === 'cancel' ? 'Cancelling...' : 'Cancel'}
                                </s-button>
                                <s-button
                                    className=""
                                    command="--show"
                                    commandFor="contracts-export-modal"
                                    onClick={openExportModal}
                                    type="button"
                                >
                                    Export
                                </s-button>
                            </div>
                        </div>
                    ) : (
                        <div className="contracts-table__head">
                            <label className="contracts-table__check">
                                <input checked={allVisibleSelected} onChange={toggleVisibleSelections} type="checkbox" />
                            </label>
                            <span>Contract</span>
                            <span>Customer</span>
                            <span>Product</span>
                            <span>Price</span>
                            <span>Delivery Frequency</span>
                            <span>Status</span>
                        </div>
                    )}

                    {actionError !== '' ? <div className="contracts-table__row contracts-table__row--static plan-feedback plan-feedback--error">{actionError}</div> : null}

                    {isLoading ? <div className="contracts-table__row contracts-table__row--static">Loading subscription contracts...</div> : null}

                    {!isLoading && error ? <div className="contracts-table__row contracts-table__row--static">Unable to load Shopify contracts right now.</div> : null}

                    {!isLoading && !error && visibleContracts.length === 0 ? (
                        <div className="contracts-table__row contracts-table__row--static">No subscription contracts match this filter.</div>
                    ) : null}

                    {!isLoading && !error
                        ? visibleContracts.map((contract) => (
                              <div
                                  className="contracts-table__row contracts-table__row--clickable"
                                  key={contract.id}
                                  onFocus={() => prefetchContractDetail(contract.id)}
                                  onMouseEnter={() => prefetchContractDetail(contract.id)}
                                  onClick={() => handleRowNavigation(contract.id)}
                                  onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          handleRowNavigation(contract.id);
                                      }
                                  }}
                                  role="button"
                                  tabIndex={0}
                              >
                                  <label className="contracts-table__check" onClick={(event) => event.stopPropagation()}>
                                      <input
                                          checked={selectedContractIds.includes(contract.id)}
                                          onChange={() => toggleContractSelection(contract.id)}
                                          type="checkbox"
                                      />
                                  </label>
                                  <s-paragraph>{contract.displayId ?? contract.id}</s-paragraph>
                                  <s-paragraph>{contract.customer?.name ?? 'Unknown customer'}</s-paragraph>
                                  <s-paragraph>{contract.plan ?? contract.productTitle ?? 'Subscription plan'}</s-paragraph>
                                  <s-paragraph>{contract.amount ?? 'N/A'}</s-paragraph>
                                  <s-paragraph>{contract.deliveryFrequency ?? 'N/A'}</s-paragraph>
                                  <span>
                                      {/*<span className={`contracts-status-pill contracts-status-pill--${getStatusTone(contract.status)}`}>{contract.status}</span>*/}
                                      <s-badge tone={getStatusTone(contract.status)}>{contract.status}</s-badge>
                                  </span>
                              </div>
                          ))
                        : null}
                </div>

                {!isLoading && !error && visibleContracts.length > 0 ? (
                    <div className="contracts-table__pagination">
                        <s-text>
                            Showing {pagination.from}-{pagination.to}{hasNextPage ? '' : ` of ${pagination.to}`} contracts
                        </s-text>

                        <div className="contracts-table__pagination-controls">
                            <label className="contracts-table__pagination-size">
                                <s-paragraph>Per page</s-paragraph>
                                <s-select onChange={handlePageSizeChange} value={String(pageSize)}>
                                    <s-option value="10">10</s-option>
                                    <s-option value="25">25</s-option>
                                    <s-option value="50">50</s-option>
                                </s-select>
                            </label>

                            <s-text>Page {pagination.page}</s-text>

                            <s-button disabled={!hasPreviousPage} onClick={handlePreviousPage} type="button">
                                Previous
                            </s-button>
                            <s-button disabled={!hasNextPage} onClick={handleNextPage} type="button">
                                Next
                            </s-button>
                        </div>
                    </div>
                ) : null}
            </section>

            <div className="polaris-page-help">
                <s-text>
                    Learn more about{' '}
                    <s-link href="https://help.shopify.com/" target="_blank">
                        subscription contracts
                    </s-link>
                </s-text>
            </div>

            <s-modal heading="Export contracts" id="contracts-export-modal" ref={exportModalRef}>
                <div className="contracts-modal__content contracts-export-modal__body">
                    <div className="contracts-export-group">
                        <h3>Export</h3>

                        <label className="contracts-export-option">
                            <input checked={exportScope === 'all'} name="contracts-export-scope" onChange={() => setExportScope('all')} type="radio" />
                            <span>All subscription contracts</span>
                        </label>

                        <label className="contracts-export-option">
                            <input checked={exportScope === 'selected'} disabled={!canExportSelected} name="contracts-export-scope" onChange={() => setExportScope('selected')} type="radio" />
                            <span>
                                {canExportSelected
                                    ? `Selected: ${selectedVisibleContracts.length} subscription contract${selectedVisibleContracts.length === 1 ? '' : 's'} from the current page`
                                    : 'Selected contracts from the current page'}
                            </span>
                        </label>
                    </div>

                    <div className="contracts-export-group">
                        <h3>Export as</h3>

                        <label className="contracts-export-option">
                            <input checked={exportFormat === 'excel'} name="contracts-export-format" onChange={() => setExportFormat('excel')} type="radio" />
                            <span>CSV for Excel, Numbers, or other spreadsheet programs</span>
                        </label>

                        <label className="contracts-export-option">
                            <input checked={exportFormat === 'plain'} name="contracts-export-format" onChange={() => setExportFormat('plain')} type="radio" />
                            <span>Plain CSV file</span>
                        </label>
                    </div>

                    <a className="contracts-modal__link" href="https://help.shopify.com/en/manual/shopify-admin/productivity-tools/import-and-export/export-products" rel="noreferrer" target="_blank">
                        Learn more about exporting CSV files
                    </a>
                </div>

                <div className="contracts-modal__footer">
                    <s-button onClick={closeExportModal}>Cancel</s-button>
                    <s-button onClick={handleExportContracts} variant="primary">
                        Export CSV
                    </s-button>
                </div>
            </s-modal>

            <s-modal heading="Import subscription data by CSV" id="contracts-import-modal" ref={importModalRef}>
                <div className="contracts-modal__content">
                    <input accept=".csv,text/csv" className="contracts-import-modal__input" onChange={handleImportFileChange} ref={importFileInputRef} type="file" />

                    <div className="contracts-import-dropzone">
                        <s-button onClick={handleOpenImportFilePicker}>Add file</s-button>
                        {selectedImportFile ? <p className="contracts-import-dropzone__filename">{selectedImportFile.name}</p> : null}
                    </div>

                    <button className="contracts-modal__link-button" onClick={handleDownloadSample} type="button">
                        Download sample CSV
                    </button>

                    {importError !== '' ? <p className="plan-feedback plan-feedback--error">{importError}</p> : null}
                </div>

                <div className="contracts-modal__footer">
                    <s-button onClick={closeImportModal}>Cancel</s-button>
                    <s-button disabled={!selectedImportFile || importMutation.isPending} onClick={handleUploadImportFile} variant="primary">
                        {importMutation.isPending ? 'Uploading...' : 'Upload file'}
                    </s-button>
                </div>
            </s-modal>
        </s-page>
    );
}

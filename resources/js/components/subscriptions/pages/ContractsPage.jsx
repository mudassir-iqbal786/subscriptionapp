import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { contractsQueryKey, fetchContracts, importContracts } from '../contractQueries.js';
import { useAppNavigate } from '../navigation.jsx';

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

function buildExportRows(contracts) {
    return contracts.map((contract) => ({
        contract: contract.displayId ?? contract.id ?? '',
        customer: contract.customer?.name ?? '',
        product: contract.plan ?? contract.productTitle ?? '',
        price: contract.amount ?? '',
        delivery_frequency: contract.deliveryFrequency ?? '',
        status: contract.status ?? '',
    }));
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
    const classes = ['contracts-table__action-button', `contracts-table__action-button--${action}`];

    if (isEnabled) {
        classes.push('contracts-table__action-button--enabled');
    }

    if (activeBulkAction === action) {
        classes.push('contracts-table__action-button--working');
    }

    return classes.join(' ');
}

export default function ContractsPage() {
    const navigateTo = useAppNavigate();
    const queryClient = useQueryClient();
    const exportModalRef = useRef(null);
    const importModalRef = useRef(null);
    const importFileInputRef = useRef(null);
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedContractIds, setSelectedContractIds] = useState([]);
    const [selectedImportFile, setSelectedImportFile] = useState(null);
    const [importError, setImportError] = useState('');
    const [actionError, setActionError] = useState('');
    const [activeBulkAction, setActiveBulkAction] = useState('');
    const [exportScope, setExportScope] = useState('all');
    const [exportFormat, setExportFormat] = useState('excel');

    const { data: contracts = [], error, isLoading } = useQuery({
        queryKey: contractsQueryKey,
        queryFn: fetchContracts,
    });

    const importMutation = useMutation({
        mutationFn: importContracts,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: contractsQueryKey });
            closeImportModal();
        },
        onError: (requestError) => {
            setImportError(requestError?.response?.data?.message ?? 'Unable to import this CSV right now.');
        },
    });

    const visibleContracts = contracts.filter((contract) => {
        if (activeFilter === 'All') {
            return true;
        }

        return contract.status === activeFilter;
    });
    const selectedVisibleContracts = visibleContracts.filter((contract) => selectedContractIds.includes(contract.id));
    const selectedActionableContracts = selectedVisibleContracts.filter((contract) => !contract.isImported);
    const allVisibleSelected = visibleContracts.length > 0 && selectedVisibleContracts.length === visibleContracts.length;
    const canExportSelected = selectedVisibleContracts.length > 0;
    const selectedCount = selectedVisibleContracts.length;
    const canPauseSelected = selectedActionableContracts.some((contract) => contract.status !== 'Paused' && contract.status !== 'Canceled');
    const canResumeSelected = selectedActionableContracts.some((contract) => contract.status === 'Paused');
    const canCancelSelected = selectedActionableContracts.some((contract) => contract.status !== 'Canceled');

    function handleRowNavigation(contractId) {
        navigateTo(`/contracts/detail/${encodeURIComponent(contractId)}`);
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
            await queryClient.invalidateQueries({ queryKey: contractsQueryKey });
        } catch (requestError) {
            setActionError(requestError?.response?.data?.message ?? `Unable to ${action} the selected subscription contracts right now.`);
        } finally {
            setActiveBulkAction('');
        }
    }

    return (
        <div className="contracts-page">
            <div className="contracts-page__header">
                <h1>Subscription contracts</h1>

                <div className="contracts-page__actions">
                    <button className="contracts-page__button" command="--show" commandFor="contracts-export-modal" onClick={openExportModal} type="button">
                        Export
                    </button>
                    <button className="contracts-page__button" command="--show" commandFor="contracts-import-modal" onClick={openImportModal} type="button">
                        Import
                    </button>
                </div>
            </div>

            <section className="contracts-table-card">
                <div className="contracts-table-card__toolbar">
                    <div className="contracts-filter-tabs">
                        {['All', 'Active', 'Paused', 'Canceled'].map((filter) => (
                            <button
                                className={filter === activeFilter ? 'contracts-filter-tab contracts-filter-tab--active' : 'contracts-filter-tab'}
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                type="button"
                            >
                                {filter}
                            </button>
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
                                <strong>{selectedCount} selected</strong>
                            </div>

                            <div className="contracts-table__selection-actions">
                                <button
                                    className={getBulkActionButtonClass('pause', canPauseSelected, activeBulkAction)}
                                    disabled={!canPauseSelected || activeBulkAction !== ''}
                                    onClick={() => handleBulkAction('pause')}
                                    type="button"
                                >
                                    {activeBulkAction === 'pause' ? 'Pausing...' : 'Pause'}
                                </button>
                                <button
                                    className={getBulkActionButtonClass('resume', canResumeSelected, activeBulkAction)}
                                    disabled={!canResumeSelected || activeBulkAction !== ''}
                                    onClick={() => handleBulkAction('resume')}
                                    type="button"
                                >
                                    {activeBulkAction === 'resume' ? 'Resuming...' : 'Resume'}
                                </button>
                                <button
                                    className={getBulkActionButtonClass('cancel', canCancelSelected, activeBulkAction)}
                                    disabled={!canCancelSelected || activeBulkAction !== ''}
                                    onClick={() => handleBulkAction('cancel')}
                                    type="button"
                                >
                                    {activeBulkAction === 'cancel' ? 'Cancelling...' : 'Cancel'}
                                </button>
                                <button
                                    className="contracts-table__action-button contracts-table__action-button--active"
                                    command="--show"
                                    commandFor="contracts-export-modal"
                                    onClick={openExportModal}
                                    type="button"
                                >
                                    Export
                                </button>
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
                                  <strong>{contract.displayId ?? contract.id}</strong>
                                  <span>{contract.customer?.name ?? 'Unknown customer'}</span>
                                  <span>{contract.plan ?? contract.productTitle ?? 'Subscription plan'}</span>
                                  <span>{contract.amount ?? 'N/A'}</span>
                                  <span>{contract.deliveryFrequency ?? 'N/A'}</span>
                                  <span>
                                      <span className={`contracts-status-pill contracts-status-pill--${getStatusTone(contract.status)}`}>{contract.status}</span>
                                  </span>
                              </div>
                          ))
                        : null}
                </div>
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
        </div>
    );
}

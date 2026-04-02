import { contracts } from '../data.js';

export default function ContractsPage() {
    return (
        <s-page heading="Subscription contracts" inlineSize="large">
            <s-button slot="secondary-actions" variant="secondary">
                Export
            </s-button>
            <s-button slot="secondary-actions" variant="secondary">
                Import
            </s-button>

            <s-section padding="none">
                <s-table>
                    <div slot="filters" className="polaris-table-filters">
                        <div className="polaris-table-filters__group">
                            <s-button variant="secondary">All</s-button>
                            <s-button variant="auto">Active</s-button>
                            <s-button variant="auto">Paused</s-button>
                            <s-button variant="auto">Canceled</s-button>
                        </div>

                        <s-button accessibilityLabel="Sort contracts" variant="secondary">
                            Sort
                        </s-button>
                    </div>

                    <s-table-header-row>
                        <s-table-header listSlot="kicker">Contract</s-table-header>
                        <s-table-header listSlot="primary">Customer</s-table-header>
                        <s-table-header listSlot="secondary">Product</s-table-header>
                        <s-table-header format="currency" listSlot="labeled">
                            Price
                        </s-table-header>
                        <s-table-header listSlot="labeled">Delivery frequency</s-table-header>
                        <s-table-header listSlot="inline">Status</s-table-header>
                    </s-table-header-row>

                    <s-table-body>
                        {contracts.map((contract) => (
                            <s-table-row key={contract.id}>
                                <s-table-cell>{contract.id}</s-table-cell>
                                <s-table-cell>{contract.customer}</s-table-cell>
                                <s-table-cell>{contract.plan}</s-table-cell>
                                <s-table-cell>{contract.amount}</s-table-cell>
                                <s-table-cell>{contract.deliveryFrequency}</s-table-cell>
                                <s-table-cell>
                                    <s-badge tone={contract.status === 'Paused' ? 'warning' : 'success'}>{contract.status}</s-badge>
                                </s-table-cell>
                            </s-table-row>
                        ))}
                    </s-table-body>
                </s-table>
            </s-section>

            <div className="polaris-page-help">
                <s-text>
                    Learn more about{' '}
                    <s-link href="https://help.shopify.com/" target="_blank">
                        subscription contracts
                    </s-link>
                </s-text>
            </div>
        </s-page>
    );
}

export default function PlansPage() {
    return (
        <s-page heading="Subscription plans" inlineSize="large">
            <s-button slot="primary-action" variant="primary">
                Create plan
            </s-button>

            <s-section padding="none">
                <s-table>
                    <div slot="filters" className="polaris-table-filters">
                        <div className="polaris-table-filters__group">
                            <s-button variant="secondary">All</s-button>
                        </div>

                        <s-button accessibilityLabel="Sort plans" variant="secondary">
                            Sort
                        </s-button>
                    </div>

                    <s-table-header-row>
                        <s-table-header listSlot="primary">Plan description</s-table-header>
                        <s-table-header listSlot="inline">Products</s-table-header>
                        <s-table-header listSlot="labeled">Delivery frequency</s-table-header>
                        <s-table-header format="base" listSlot="labeled">
                            Pricing
                        </s-table-header>
                    </s-table-header-row>

                    <s-table-body>
                        <s-table-row>
                            <s-table-cell>Description</s-table-cell>
                            <s-table-cell>3 products</s-table-cell>
                            <s-table-cell>Every week</s-table-cell>
                            <s-table-cell>10% off</s-table-cell>
                        </s-table-row>
                    </s-table-body>
                </s-table>
            </s-section>

            <div className="polaris-page-help">
                <s-text>
                    Learn more about{' '}
                    <s-link href="https://help.shopify.com/" target="_blank">
                        subscription plans
                    </s-link>
                </s-text>
            </div>
        </s-page>
    );
}

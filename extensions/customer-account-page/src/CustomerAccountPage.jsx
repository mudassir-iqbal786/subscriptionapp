/** @jsxImportSource preact */
import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  return (
    <s-section>
      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
        <s-stack direction="block" gap="small-400">
          <s-heading>{shopify.i18n.translate('heading')}</s-heading>
          <s-text>{shopify.i18n.translate('body')}</s-text>
        </s-stack>
        <s-button variant="primary" href="extension:customer-subscriptions-page/">
          {shopify.i18n.translate('manageAction')}
        </s-button>
      </s-stack>
    </s-section>
  );
}

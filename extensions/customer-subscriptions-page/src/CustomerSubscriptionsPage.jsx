/** @jsxImportSource preact */
import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<CustomerSubscriptionsPage />, document.body);
};

function CustomerSubscriptionsPage() {
  const appUrl = globalThis.process?.env?.APP_URL || 'https://46c2-2407-d000-704-d051-b9d8-66a0-ac3d-b8f5.ngrok-free.app';
  const customer = shopify.authenticatedAccount?.customer?.value || shopify.authenticatedAccount?.customer?.current;
  const customerId = typeof customer?.id === 'string' || typeof customer?.id === 'number' ? String(customer.id) : '';
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSubscriptions() {
      if (customerId === '') {
        setSubscriptions([]);
        setError(shopify.i18n.translate('customerUnavailable'));

        return;
      }

      setLoading(true);
      setError('');

      try {
        const sessionToken = await shopify.sessionToken.get();
        const response = await fetch(`${appUrl}/api/customer-account/subscriptions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            customerId,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || shopify.i18n.translate('error'));
        }

        if (!cancelled) {
          setSubscriptions(Array.isArray(payload?.subscriptions) ? payload.subscriptions : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setSubscriptions([]);
          setError(fetchError instanceof Error ? fetchError.message : shopify.i18n.translate('error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSubscriptions();

    return () => {
      cancelled = true;
    };
  }, [appUrl, customerId]);

  return (
    <s-page heading={shopify.i18n.translate('heading')}>
      <s-section>
        <s-stack direction="block" gap="base">
          <s-text>{shopify.i18n.translate('intro')}</s-text>

          {loading ? <s-text>{shopify.i18n.translate('loading')}</s-text> : null}

          {!loading && error !== '' ? (
            <s-banner tone="critical" heading={shopify.i18n.translate('errorTitle')}>
              <s-text>{error}</s-text>
            </s-banner>
          ) : null}

          {!loading && error === '' && subscriptions.length === 0 ? (
            <s-section>
              <s-stack direction="block" gap="small-400">
                <s-heading>{shopify.i18n.translate('emptyTitle')}</s-heading>
                <s-text>{shopify.i18n.translate('emptyBody')}</s-text>
              </s-stack>
            </s-section>
          ) : null}

          {!loading && subscriptions.length > 0 ? (
            <s-stack direction="block" gap="base">
              <s-stack direction="block" gap="small-400">
                <s-heading>{shopify.i18n.translate('activeTitle')}</s-heading>
                <s-text>
                  {shopify.i18n.translate('subscriptionCount', {
                    count: subscriptions.length,
                  })}
                </s-text>
              </s-stack>
              <SubscriptionTable subscriptions={subscriptions} />
            </s-stack>
          ) : null}
        </s-stack>
      </s-section>
    </s-page>
  );
}

function SubscriptionTable({subscriptions}) {
  return (
    <s-section>
      <s-stack direction="block" gap="small-300">
        <s-grid
          gridTemplateColumns="2fr 1fr 1fr 1fr 1fr 1fr"
          gap="base"
          padding="base"
          background="subdued"
          borderRadius="base"
        >
          <s-text emphasis="bold">{shopify.i18n.translate('tableProduct')}</s-text>
          <s-text emphasis="bold">{shopify.i18n.translate('tablePlan')}</s-text>
          <s-text emphasis="bold">{shopify.i18n.translate('tableStatus')}</s-text>
          <s-text emphasis="bold">{shopify.i18n.translate('tableNextOrder')}</s-text>
          <s-text emphasis="bold">{shopify.i18n.translate('tableTotal')}</s-text>
          <s-text emphasis="bold">{shopify.i18n.translate('tableActions')}</s-text>
        </s-grid>

        {subscriptions.map((subscription) => (
          <SubscriptionOrderRow key={subscription.id || subscription.displayId} subscription={subscription} />
        ))}
      </s-stack>
    </s-section>
  );
}

function SubscriptionOrderRow({subscription}) {
  const lineItems = subscriptionLineItems(subscription);
  const primaryLineItem = lineItems[0] || {};

  async function openSubscriptionContract(field) {
    const contractId = subscription.id || '';

    if (contractId === '') {
      return;
    }

    await shopify.intents.invoke('open:shopify/SubscriptionContract', {
      value: contractId,
      data: field ? {field} : undefined,
    });
  }

  return (
    <s-grid
      gridTemplateColumns="2fr 1fr 1fr 1fr 1fr 1fr"
      gap="base"
      padding="base"
      border="base"
      borderRadius="base"
      alignItems="start"
    >
      <s-stack direction="block" gap="small-400">
        <s-stack direction="inline" gap="base" alignItems="center">
          {primaryLineItem.imageUrl ? (
            <s-image
              alt={primaryLineItem.productTitle || shopify.i18n.translate('productFallback')}
              src={primaryLineItem.imageUrl}
              inlineSize="56px"
              aspectRatio="1"
              objectFit="cover"
              borderRadius="small"
            />
          ) : null}
          <s-stack direction="block" gap="small-300">
            <s-text emphasis="bold">
              {primaryLineItem.productTitle || shopify.i18n.translate('productFallback')}
            </s-text>
            <s-text>
              {shopify.i18n.translate('orderLabel', {
                id: subscription.displayId || subscription.id || shopify.i18n.translate('subscriptionFallback'),
              })}
            </s-text>
          </s-stack>
        </s-stack>

        {lineItems.map((lineItem) => (
          <s-grid
            key={lineItem.id || lineItem.productTitle}
            gridTemplateColumns="2fr 1fr 1fr"
            gap="small-400"
            padding="small-400"
            background="subdued"
            borderRadius="small"
          >
            <s-text>{lineItem.productTitle || shopify.i18n.translate('productFallback')}</s-text>
            <s-text>
              {shopify.i18n.translate('quantityShort', {
                quantity: lineItem.quantity || '1',
              })}
            </s-text>
            <s-text>{lineItem.total || lineItem.unitPrice || subscription.amount}</s-text>
          </s-grid>
        ))}
      </s-stack>

      <s-stack direction="block" gap="small-300">
        <s-text emphasis="bold">{subscription.plan || shopify.i18n.translate('subscriptionFallback')}</s-text>
        <s-text>{subscription.deliveryFrequency}</s-text>
      </s-stack>

      <s-badge tone={statusTone(subscription.status)}>
        {subscription.status || shopify.i18n.translate('unavailable')}
      </s-badge>

      <s-text>{subscription.nextOrder || shopify.i18n.translate('unavailable')}</s-text>
      <s-text emphasis="bold">{subscription.amount || shopify.i18n.translate('unavailable')}</s-text>

      <s-stack direction="block" gap="small-300">
        <s-button size="small" onClick={() => openSubscriptionContract()}>
          {shopify.i18n.translate('manageAction')}
        </s-button>
        <s-button size="small" variant="secondary" onClick={() => openSubscriptionContract('paymentMethod')}>
          {shopify.i18n.translate('paymentShortAction')}
        </s-button>
        <s-button size="small" variant="secondary" onClick={() => openSubscriptionContract('deliveryMethod')}>
          {shopify.i18n.translate('deliveryShortAction')}
        </s-button>
      </s-stack>
    </s-grid>
  );
}

function subscriptionLineItems(subscription) {
  if (Array.isArray(subscription.lineItems) && subscription.lineItems.length > 0) {
    return subscription.lineItems;
  }

  return [
    {
      id: subscription.id,
      productTitle: subscription.productTitle,
      subtitle: subscription.productSubtitle,
      quantity: subscription.quantity,
      total: subscription.amount,
      sellingPlanName: subscription.plan,
      imageUrl: subscription.productImageUrl,
    },
  ];
}

function statusTone(status) {
  const normalizedStatus = String(status).toLowerCase();

  return normalizedStatus === 'canceled' || normalizedStatus === 'cancelled' ? 'critical' : 'neutral';
}

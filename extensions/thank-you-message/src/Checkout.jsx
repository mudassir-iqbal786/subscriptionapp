import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const lines = shopify.lines.value || [];
  const subscriptionLines = lines.filter((line) => line?.merchandise?.sellingPlan);

  if (subscriptionLines.length === 0) {
    return null;
  }

  const subscriptionCount = subscriptionLines.reduce(
    (count, line) => count + (Number(line.quantity) || 0),
    0,
  );
  const firstSubscriptionLine = subscriptionLines[0];
  const orderNumber = shopify.orderConfirmation.value?.number;
  const planName = firstSubscriptionLine?.merchandise?.sellingPlan?.name || '';

  return (
    <s-banner heading={shopify.i18n.translate("heading")} tone="success">
      <s-stack gap="base">
        <s-text emphasis="bold">{shopify.i18n.translate("title")}</s-text>
        <s-text>
          {shopify.i18n.translate("body", {
            count: subscriptionCount,
            orderNumber: orderNumber ? `#${orderNumber}` : '',
          })}
        </s-text>
        {planName ? (
          <s-text>
            {shopify.i18n.translate("plan", {
              plan: planName,
            })}
          </s-text>
        ) : null}
        <s-text>{shopify.i18n.translate("footer")}</s-text>
      </s-stack>
    </s-banner>
  );
}

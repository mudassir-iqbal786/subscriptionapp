import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  return (
    <s-banner heading="Shipping profiles">
      <s-stack gap="base">
        <s-text emphasis="bold">Shipping profile details</s-text>
        <s-text>Review the shipping profile assigned to each line item in this checkout.</s-text>
        <s-text>No checkout product variants found yet.</s-text>
      </s-stack>
    </s-banner>
  );
}

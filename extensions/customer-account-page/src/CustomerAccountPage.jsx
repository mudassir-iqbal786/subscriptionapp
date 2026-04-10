import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
    const lines = shopify.lines.value || [];

    // console.log("lines ",lines)
    // const subscriptionLines = lines.filter((line) => line?.merchandise?.sellingPlan);
    // const appUrl = globalThis.process?.env?.APP_URL || "https://6943-2407-d000-704-d051-c828-b95-326b-8f2e.ngrok-free.app";

  return (
    <s-banner heading={shopify.i18n.translate("heading")}>
      <s-block-stack gap="base">
        <s-text>{shopify.i18n.translate("body")}</s-text>
      </s-block-stack>
    </s-banner>
  );
}

import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useEffect, useMemo, useState} from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const lines = shopify.lines.value || [];
  const subscriptionLines = lines.filter((line) => line?.merchandise?.sellingPlan);
  const appUrl = globalThis.process?.env?.APP_URL || "https://6943-2407-d000-704-d051-c828-b95-326b-8f2e.ngrok-free.app";
  const variantIds = useMemo(() => {
    return Array.from(
      new Set(
        subscriptionLines
          .map((line) => line?.merchandise?.id)
          .filter((id) => typeof id === "string" && id.startsWith("gid://shopify/ProductVariant/"))
      )
    );
  }, [lines]);
  const [shippingProfiles, setShippingProfiles] = useState([]);
  const [shippingProfilesLoading, setShippingProfilesLoading] = useState(false);
  const [shippingProfilesError, setShippingProfilesError] = useState("");

  useEffect(() => {
    let cancelled = false;

    console.log("[ThankYouExtension] Subscription lines", subscriptionLines);
    console.log("[ThankYouExtension] Variant IDs for shipping profiles", variantIds);

    async function loadShippingProfiles() {
      if (variantIds.length === 0) {
        if (!cancelled) {
          setShippingProfiles([]);
          setShippingProfilesError("");
        }

        return;
      }

      setShippingProfilesLoading(true);
      setShippingProfilesError("");

      try {
        const sessionToken = await shopify.sessionToken.get();
        const response = await fetch(`${appUrl}/api/checkout/shipping-profiles`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            variantIds
          })
        });
        const payload = await response.json();

        console.log("[ThankYouExtension] Shipping profile response", payload);

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load shipping profiles right now.");
        }

        if (!cancelled) {
          setShippingProfiles(Array.isArray(payload?.profiles) ? payload.profiles : []);
        }
      } catch (error) {
        if (!cancelled) {
          setShippingProfiles([]);
          setShippingProfilesError(error instanceof Error ? error.message : "Unable to load shipping profiles right now.");
        }
      } finally {
        if (!cancelled) {
          setShippingProfilesLoading(false);
        }
      }
    }

    loadShippingProfiles();

    return () => {
      cancelled = true;
    };
  }, [appUrl, variantIds]);

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



        {shippingProfilesLoading ? (
          <s-text>{shopify.i18n.translate("shippingProfilesLoading")}</s-text>
        ) : null}



        {!shippingProfilesLoading && shippingProfiles.length > 0 ? (
          <s-stack gap="tight">
            <s-text emphasis="bold">{shopify.i18n.translate("shippingProfilesHeading")}</s-text>
            {shippingProfiles.map((profile) => (
              <s-text key={profile.id}>
                {shopify.i18n.translate("shippingProfileLine", {
                  item: profile.title || shopify.i18n.translate("subscriptionItemFallback"),
                  profile: profile.shippingProfile?.name || shopify.i18n.translate("shippingProfileFallback"),
                })}
              </s-text>
            ))}
          </s-stack>
        ) : null}
        {!shippingProfilesLoading && shippingProfilesError ? (
          <s-text appearance="subdued">{shippingProfilesError}</s-text>
        ) : null}
        <s-text>{shopify.i18n.translate("footer")}</s-text>
      </s-stack>
    </s-banner>
  );
}

/** @jsxImportSource preact */
import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const lines = shopify.lines.value || [];
  const checkoutId = shopify.checkoutToken?.value || shopify.checkout?.value?.id || '';
  const appUrl = globalThis.process?.env?.APP_URL || 'https://46c2-2407-d000-704-d051-b9d8-66a0-ac3d-b8f5.ngrok-free.app';
  const variantIds = useMemo(() => {
    return Array.from(
      new Set(
        lines
          .map((line) => line?.merchandise?.id)
          .filter((id) => typeof id === 'string' && id.startsWith('gid://shopify/ProductVariant/')),
      ),
    );
  }, [lines]);
  const [shippingProfileItems, setShippingProfileItems] = useState([]);
  const [shippingProfiles, setShippingProfiles] = useState([]);
  const [shippingProfilesLoading, setShippingProfilesLoading] = useState(false);
  const [shippingProfilesError, setShippingProfilesError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadShippingProfiles() {
      if (variantIds.length === 0) {
        setShippingProfileItems([]);
        setShippingProfiles([]);
        setShippingProfilesError('');

        return;
      }

      setShippingProfilesLoading(true);
      setShippingProfilesError('');

      try {
        const sessionToken = await shopify.sessionToken.get();
        const response = await fetch(`${appUrl}/api/checkout/shipping-profiles`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            checkoutId,
            variantIds,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || shopify.i18n.translate('error'));
        }

        if (!cancelled) {
          setShippingProfileItems(Array.isArray(payload?.items) ? payload.items : []);
          setShippingProfiles(Array.isArray(payload?.profiles) ? payload.profiles : []);
        }
      } catch (error) {
        if (!cancelled) {
          setShippingProfileItems([]);
          setShippingProfiles([]);
          setShippingProfilesError(error instanceof Error ? error.message : shopify.i18n.translate('error'));
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
  }, [appUrl, checkoutId, variantIds]);

  return (
    <s-banner heading={shopify.i18n.translate('heading')}>
      <s-stack gap="base">
        <s-text emphasis="bold">{shopify.i18n.translate('title')}</s-text>
        <s-text>{shopify.i18n.translate('body')}</s-text>

        {variantIds.length === 0 ? (
          <s-text>No checkout product variants found yet.</s-text>
        ) : null}

        {shippingProfilesLoading ? (
          <s-text>{shopify.i18n.translate('loading')}</s-text>
        ) : null}

        {!shippingProfilesLoading && shippingProfileItems.length > 0 ? (
          <s-stack gap="tight">
            <s-text emphasis="bold">{shopify.i18n.translate('itemsTitle')}</s-text>
            {shippingProfileItems.map((item) => {
              const itemName = [item.productTitle, item.variantTitle].filter(Boolean).join(' - ');
              const profileName = item.profileName || shopify.i18n.translate('profileFallback');

              return (
                <s-text key={item.variantId}>
                  {itemName || shopify.i18n.translate('itemFallback')}: {profileName}
                </s-text>
              );
            })}
          </s-stack>
        ) : null}

        {!shippingProfilesLoading && shippingProfiles.length > 0 ? (
          <s-stack gap="tight">
            {shippingProfiles.map((profile) => (
              <s-stack key={profile.profileId} gap="tight">
                <s-text emphasis="bold">
                  {profile.name || shopify.i18n.translate('profileFallback')}
                </s-text>
                {profile.shippingZones?.length > 0 ? (
                  profile.shippingZones.map((zone) => (
                    <s-stack key={zone.zoneId || zone.name} gap="none">
                      <s-text>{zone.name}</s-text>
                      {zone.rates?.length > 0 ? (
                        zone.rates.map((rate) => (
                          <s-text key={rate.handle}>
                            {rate.title}: {rate.price}
                          </s-text>
                        ))
                      ) : (
                        <s-text>No rates found for this zone.</s-text>
                      )}
                    </s-stack>
                  ))
                ) : (
                  <s-text>No shipping zones found for this profile.</s-text>
                )}
              </s-stack>
            ))}
          </s-stack>
        ) : null}

        {!shippingProfilesLoading && shippingProfilesError ? (
          <s-text appearance="subdued">{shippingProfilesError}</s-text>
        ) : null}
      </s-stack>
    </s-banner>
  );
}

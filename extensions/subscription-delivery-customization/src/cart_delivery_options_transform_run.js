// @ts-check

/**
 * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunInput} CartDeliveryOptionsTransformRunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} CartDeliveryOptionsTransformRunResult
 */

/**
 * @type {CartDeliveryOptionsTransformRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {CartDeliveryOptionsTransformRunInput} input
 * @returns {CartDeliveryOptionsTransformRunResult}
 */
export function cartDeliveryOptionsTransformRun(input) {
  const configuration = input?.deliveryCustomization?.metafield?.jsonValue ?? {};
  const hiddenTitles = normalizeList(configuration.hiddenDeliveryOptionTitles);
  const hiddenHandles = normalizeList(configuration.hiddenDeliveryOptionHandles);
  const hasSubscriptionLine = input.cart.lines.some((line) => line.sellingPlanAllocation);

  if (!hasSubscriptionLine || (!hiddenTitles.length && !hiddenHandles.length)) {
    return NO_CHANGES;
  }

  const operations = input.cart.deliveryGroups.flatMap((deliveryGroup) => (
    deliveryGroup.deliveryOptions
      .filter((deliveryOption) => shouldHideDeliveryOption(deliveryOption, hiddenTitles, hiddenHandles))
      .map((deliveryOption) => ({
        deliveryOptionHide: {
          deliveryOptionHandle: deliveryOption.handle,
        },
      }))
  ));

  return {operations};
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {{handle: string, title?: string | null}} deliveryOption
 * @param {string[]} hiddenTitles
 * @param {string[]} hiddenHandles
 * @returns {boolean}
 */
function shouldHideDeliveryOption(deliveryOption, hiddenTitles, hiddenHandles) {
  const handle = deliveryOption.handle.toLowerCase();
  const title = deliveryOption.title?.trim().toLowerCase() ?? '';

  return hiddenHandles.includes(handle) || hiddenTitles.includes(title);
}

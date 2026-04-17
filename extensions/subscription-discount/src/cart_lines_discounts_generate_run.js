import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

const NO_CHANGES = {
  operations: [],
};

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const hasProductDiscountClass = input.discount.discountClasses.includes(DiscountClass.Product);

  if (!hasProductDiscountClass) {
    return NO_CHANGES;
  }

  const configuration = normalizeConfiguration(input.discount.metafield?.jsonValue ?? {});

  if (!configuration.enabled || configuration.percentage <= 0) {
    return NO_CHANGES;
  }

  const targets = input.cart.lines
    .filter((line) => line.sellingPlanAllocation)
    .map((line) => ({
      cartLine: {
        id: line.id,
      },
    }));

  if (targets.length === 0) {
    return NO_CHANGES;
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: configuration.message,
              targets,
              value: {
                percentage: {
                  value: configuration.percentage,
                },
              },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}

/**
 * @param {unknown} value
 * @returns {{enabled: boolean, percentage: number, message: string}}
 */
function normalizeConfiguration(value) {
  const configuration = isRecord(value) ? value : {};
  const percentage = Number(configuration.percentage ?? 10);
  const message = typeof configuration.message === 'string' && configuration.message.trim() !== ''
    ? configuration.message.trim()
    : 'Subscription discount';

  return {
    enabled: configuration.enabled !== false,
    percentage: Number.isFinite(percentage) ? Math.min(Math.max(percentage, 0), 100) : 10,
    message,
  };
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

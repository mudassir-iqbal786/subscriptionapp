// @ts-check

/**
 * @typedef {import("../generated/api").CartValidationsGenerateRunInput} CartValidationsGenerateRunInput
 * @typedef {import("../generated/api").CartValidationsGenerateRunResult} CartValidationsGenerateRunResult
 */

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {CartValidationsGenerateRunResult}
 */
export function cartValidationsGenerateRun(input) {
    const errors = [];

    const cartLines = input.cart.lines;
    const subtotal = parseFloat(input.cart.cost.subtotalAmount.amount);

    const subscriptionLines = cartLines.filter((line) => {
        return line.sellingPlanAllocation !== null;
    });

    const hasSubscriptionProduct = subscriptionLines.length > 0;

    if (!hasSubscriptionProduct) {
        return {
            operations: [
                {
                    validationAdd: {
                        errors: [],
                    },
                },
            ],
        };
    }

    const subscriptionQuantity = subscriptionLines.reduce((total, line) => {
        return total + line.quantity;
    }, 0);

    const hasRestrictedProduct = cartLines.some((line) => {
        if (line.merchandise.__typename !== "ProductVariant") {
            return false;
        }

        return line.merchandise.product.hasAnyTag;
    });

    const countryCode =
        input.cart.deliveryGroups?.[0]?.deliveryAddress?.countryCode;

    if (hasRestrictedProduct) {
        errors.push({
            message: "Subscription products cannot be purchased with restricted products.",
            target: "$.cart",
        });
    }

    if (subscriptionQuantity < 3) {
        errors.push({
            message: "Please add at least 3 subscription items to continue.",
            target: "$.cart",
        });
    }

    if (subtotal < 50) {
        errors.push({
            message: "Subscription orders must be at least $50.",
            target: "$.cart",
        });
    }

    if (countryCode === "US") {
        errors.push({
            message: "Subscription products are not available for this country.",
            target: "$.cart.deliveryGroups[0].deliveryAddress.countryCode",
        });
    }

    return {
        operations: [
            {
                validationAdd: {
                    errors,
                },
            },
        ],
    };
}

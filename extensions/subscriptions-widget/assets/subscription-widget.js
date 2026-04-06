(function () {
  function parsePayload(node) {
    if (!node) {
      return null;
    }

    try {
      return JSON.parse(node.textContent || "null");
    } catch (error) {
      console.error("Subscription widget payload error", error);
      return null;
    }
  }

  function getProductForm(container) {
    const section = container.closest(".shopify-section");
    const selectors = [
      'form[action*="/cart/add"]',
      "product-form form",
      "product-info form"
    ];

    for (const scope of [section, document]) {
      if (!scope) {
        continue;
      }

      for (const selector of selectors) {
        const form = scope.querySelector(selector);

        if (form) {
          return form;
        }
      }
    }

    return null;
  }

  function getVariantInput(form) {
    return form?.querySelector('[name="id"]') || null;
  }

  function ensureSellingPlanInput(form) {
    let input = form?.querySelector('input[name="selling_plan"]');

    if (!form) {
      return null;
    }

    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = "selling_plan";
      form.appendChild(input);
    }

    return input;
  }

  function formatMoney(cents, currencyCode) {
    const amount = Number(cents || 0) / 100;

    try {
      return new Intl.NumberFormat(document.documentElement.lang || "en", {
        style: "currency",
        currency: currencyCode || "USD"
      }).format(amount);
    } catch (error) {
      return amount.toFixed(2);
    }
  }

  function initWidget(container) {
    const payload = parsePayload(container.querySelector("[data-subscription-product]"));

    if (!payload) {
      return;
    }

    const form = getProductForm(container);
    const sellingPlanInput = ensureSellingPlanInput(form);
    const modeInputs = Array.from(container.querySelectorAll("[data-mode-input]"));
    const planInputs = Array.from(container.querySelectorAll("[data-plan-input]"));
    const plans = container.querySelector(".subscription-widget__plans");
    const oneTimePrice = container.querySelector("[data-one-time-price]");
    const note = container.querySelector("[data-subscription-note]");

    function currentVariantId() {
      const fallback = payload.selectedVariantId || "";
      const input = getVariantInput(form);

      return String(input?.value || fallback);
    }

    function currentVariant() {
      return (payload.variants || []).find((variant) => String(variant.id) === currentVariantId()) || null;
    }

    function allocationFor(planId) {
      const variant = currentVariant();

      return variant?.allocations?.find((allocation) => String(allocation.planId) === String(planId)) || null;
    }

    function selectFirstAvailablePlan() {
      const available = planInputs.find((input) => allocationFor(input.value));

      if (available) {
        available.checked = true;
      }
    }

    function sync() {
      const variant = currentVariant();
      const hasPlans = Boolean(variant?.allocations?.length);
      const requiresSellingPlan = Boolean(variant?.requiresSellingPlan);
      const selectedMode = modeInputs.find((input) => input.checked)?.value || "one-time";

      if (oneTimePrice && variant) {
        oneTimePrice.textContent = formatMoney(variant.price, variant.currencyCode);
      }

      modeInputs.forEach((input) => {
        const card = input.closest("[data-mode-card]");

        if (input.value === "one-time") {
          input.disabled = requiresSellingPlan;
        }

        if (input.value === "subscription") {
          input.disabled = !hasPlans;
        }

        if (card) {
          card.classList.toggle("is-active", input.checked);
          card.classList.toggle("is-disabled", input.disabled);
        }
      });

      planInputs.forEach((input) => {
        const allocation = allocationFor(input.value);
        const card = input.closest("[data-plan-card]");
        const current = card?.querySelector("[data-price-current]");
        const compare = card?.querySelector("[data-price-compare]");
        const badge = card?.querySelector("[data-price-badge]");

        input.disabled = !allocation;

        if (card) {
          card.hidden = selectedMode !== "subscription" || !allocation;
          card.classList.toggle("is-active", input.checked && !input.disabled);
          card.classList.toggle("is-disabled", input.disabled);
        }

        if (!allocation) {
          return;
        }

        if (current) {
          current.textContent = formatMoney(allocation.price, allocation.currencyCode);
        }

        if (compare) {
          if (allocation.compareAtPrice > allocation.price) {
            compare.textContent = formatMoney(allocation.compareAtPrice, allocation.currencyCode);
            compare.hidden = false;
          } else {
            compare.hidden = true;
          }
        }

        if (badge) {
          if (allocation.percentOff > 0) {
            badge.textContent = `${badge.dataset.prefix || "Save"} ${allocation.percentOff}%`;
            badge.hidden = false;
          } else {
            badge.hidden = true;
          }
        }
      });

      if (plans) {
        plans.hidden = selectedMode !== "subscription" || !hasPlans;
      }

      if (requiresSellingPlan) {
        const subscriptionInput = modeInputs.find((input) => input.value === "subscription");

        if (subscriptionInput) {
          subscriptionInput.checked = true;
        }
      } else if (!hasPlans) {
        const oneTimeInput = modeInputs.find((input) => input.value === "one-time");

        if (oneTimeInput) {
          oneTimeInput.checked = true;
        }
      }

      if (!planInputs.some((input) => input.checked && !input.disabled)) {
        selectFirstAvailablePlan();
      }

      const nextMode = modeInputs.find((input) => input.checked)?.value || "one-time";
      const activePlan = planInputs.find((input) => input.checked && !input.disabled);

      if (sellingPlanInput) {
        sellingPlanInput.value = nextMode === "subscription" && activePlan ? String(activePlan.value) : "";
      }

      if (note) {
        note.hidden = hasPlans;
      }
    }

    container.addEventListener("change", sync);

    if (form) {
      form.addEventListener("change", sync);
    }

    const variantInput = getVariantInput(form);

    if (variantInput) {
      const observer = new MutationObserver(sync);
      observer.observe(variantInput, { attributes: true, attributeFilter: ["value"] });
    }

    sync();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-subscription-widget]").forEach(initWidget);
  });
})();

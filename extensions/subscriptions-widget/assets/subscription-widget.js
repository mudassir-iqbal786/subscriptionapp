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

    console.log("From Section",section);

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
      input.dataset.subscriptionWidgetSellingPlan = "true";
      form.appendChild(input);
    }

    input.dataset.subscriptionWidgetSellingPlan = "true";

    return input;
  }

  function getConflictingPurchaseInputs(container, form) {
    const scope = form || container.closest(".shopify-section") || container.parentElement;

    if (!scope) {
      return [];
    }

    return Array.from(
      scope.querySelectorAll(
        'input[name="selling_plan"], select[name="selling_plan"], input[name*="purchase_option"], input[name*="selling_plan"]'
      )
    ).filter((input) => {
      if (container.contains(input)) {
        return false;
      }

      if (input.dataset.subscriptionWidgetSellingPlan === "true") {
        return false;
      }

      return true;
    });
  }

  function hideDefaultPurchaseOptions(container, form) {
    const selectors = [
      ".product-form__input",
      ".product__info-container > *",
      "fieldset",
      ".shopify-product-form > *",
      "form > div",
      "label"
    ];

    getConflictingPurchaseInputs(container, form).forEach((input) => {
      input.disabled = true;

      const wrapper = selectors
        .map((selector) => input.closest(selector))
        .find((candidate) => candidate && !container.contains(candidate) && candidate !== form);

      if (wrapper) {
        wrapper.style.display = "none";
      }
    });
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

  function getProductPriceTargets(container, form) {
    const scope = container.closest(".shopify-section") || form || document;
    const selectors = [
      ".product__info-container .price",
      ".product__info-container .price__container",
      ".product__info-container [data-product-price]",
      ".product-info .price",
      ".product-info .price__container",
      '[data-product-price]',
      '.price',
      '.product__price',
      '.product .price',
      '.price__container'
    ];

    const targets = selectors
      .flatMap((selector) => Array.from(scope.querySelectorAll(selector)))
      .filter((node, index, list) => {
        if (container.contains(node)) {
          return false;
        }

        if (form && !node.closest("form") && !node.closest(".product") && !node.closest(".product__info-container")) {
          return false;
        }

        return list.indexOf(node) === index;
      });

    return targets.filter((node) => !targets.some((candidate) => candidate !== node && candidate.contains(node)));
  }

  function setMainPriceDisplay(priceTargets, allocation, variant) {
    priceTargets.forEach((target) => {
      if (!target.dataset.subscriptionWidgetOriginalHtml) {
        target.dataset.subscriptionWidgetOriginalHtml = target.innerHTML;
      }

      if (!allocation || !variant) {
        target.innerHTML = target.dataset.subscriptionWidgetOriginalHtml;
        return;
      }

      const comparePrice = Number(allocation.compareAtPrice || variant.price || 0);
      const currentPrice = Number(allocation.price || variant.price || 0);
      const currencyCode = allocation.currencyCode || variant.currencyCode;

      if (comparePrice > currentPrice) {
        target.innerHTML = `
          <span class="subscription-widget-main-price">
            <del class="subscription-widget-main-price__compare">${formatMoney(comparePrice, currencyCode)}</del>
            <span class="subscription-widget-main-price__separator"> - </span>
            <span class="subscription-widget-main-price__current">${formatMoney(currentPrice, currencyCode)}</span>
          </span>
        `;
      } else {
        target.textContent = formatMoney(currentPrice, currencyCode);
      }
    });
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
    const oneTimeInput = modeInputs.find((input) => input.value === "one-time") || null;
    const subscriptionInput = modeInputs.find((input) => input.value === "subscription") || null;
    const oneTimeCard = oneTimeInput?.closest("[data-mode-card]") || null;
    const subscriptionCard = subscriptionInput?.closest("[data-mode-card]") || null;

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

      if (oneTimeCard) {
        oneTimeCard.hidden = Boolean(requiresSellingPlan && hasPlans);
      }

      if (subscriptionCard) {
        subscriptionCard.hidden = !hasPlans;
      }

      planInputs.forEach((input) => {
        const allocation = allocationFor(input.value);
        const card = input.closest("[data-plan-card]");
        const current = card?.querySelector("[data-price-current]");
        const compare = card?.querySelector("[data-price-compare]");
        const separator = card?.querySelector("[data-price-separator]");
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
            if (separator) {
              separator.hidden = false;
            }
          } else {
            compare.hidden = true;
            compare.textContent = "";
            if (separator) {
              separator.hidden = true;
            }
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
        if (subscriptionInput) {
          subscriptionInput.checked = true;
        }
      } else if (!hasPlans) {
        if (oneTimeInput) {
          oneTimeInput.checked = true;
        }
      }

      if (!planInputs.some((input) => input.checked && !input.disabled)) {
        selectFirstAvailablePlan();
      }

      const nextMode = modeInputs.find((input) => input.checked)?.value || "one-time";
      const activePlan = planInputs.find((input) => input.checked && !input.disabled);
      const activeAllocation = activePlan ? allocationFor(activePlan.value) : null;
      const priceTargets = getProductPriceTargets(container, form);

      if (sellingPlanInput) {
        sellingPlanInput.value = nextMode === "subscription" && activePlan ? String(activePlan.value) : "";
      }

      if (nextMode === "subscription" && activeAllocation) {
        setMainPriceDisplay(priceTargets, activeAllocation, variant);
      } else {
        setMainPriceDisplay(priceTargets, null, variant);
      }

      if (note) {
        note.hidden = hasPlans;
      }
    }

    container.addEventListener("change", sync);

    if (form) {
      form.addEventListener("change", sync);
      form.addEventListener("submit", sync);
    }

    const submitButtons = form
      ? Array.from(form.querySelectorAll('[type="submit"], shopify-buy-it-now-button, .shopify-payment-button__button'))
      : [];

    submitButtons.forEach((button) => {
      button.addEventListener("click", sync);
    });

    const variantInput = getVariantInput(form);

    if (variantInput) {
      const observer = new MutationObserver(sync);
      observer.observe(variantInput, { attributes: true, attributeFilter: ["value"] });
    }

    sync();
    hideDefaultPurchaseOptions(container, form);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-subscription-widget]").forEach(initWidget);
  });
})();

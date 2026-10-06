// ============================================
// AURAGEN ADAPTATION PLAN VALIDATION SERVICE
// ============================================

const ALLOWED_ACTIONS = [
  "NO_ACTION",
  "SHOW_GUIDANCE",
  "SIMPLIFY_FORM",
  "HIGHLIGHT_FIELD",
  "HIDE_ADVANCED_FIELDS",
];

const ALLOWED_FIELDS = [
  "annualIncome",
  "taxId",
  "investmentAmount",
  "taxCategory",
];

const ALLOWED_CHANGE_TYPES = [
  "HIDE_FIELD",
  "SHOW_FIELD",
  "HIGHLIGHT_FIELD",
];


// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

function validateAdaptationPlan(plan) {
  console.log("\n🛡️ PLAN VALIDATION");
  console.log("================================");

  const errors = [];

  // ------------------------------------------
  // PLAN EXISTENCE
  // ------------------------------------------

  if (!plan || typeof plan !== "object") {
    errors.push("Adaptation plan must be a valid object.");
  }

  if (errors.length > 0) {
    console.log("❌ PLAN VALIDATION FAILED");
    console.log(errors);

    return {
      valid: false,
      plan: null,
      errors,
    };
  }

  // ------------------------------------------
  // ACTION
  // ------------------------------------------

  if (!ALLOWED_ACTIONS.includes(plan.action)) {
    errors.push(
      `Invalid action: ${plan.action}.`
    );
  }

  // ------------------------------------------
  // TARGET FIELD
  // ------------------------------------------

  if (
    plan.targetField !== undefined &&
    plan.targetField !== null &&
    plan.targetField !== "" &&
    !ALLOWED_FIELDS.includes(plan.targetField)
  ) {
    errors.push(
      `Invalid target field: ${plan.targetField}.`
    );
  }

  // ------------------------------------------
  // CHANGES
  // ------------------------------------------

  if (plan.changes !== undefined) {
    if (!Array.isArray(plan.changes)) {
      errors.push(
        "changes must be an array."
      );
    } else {
      plan.changes.forEach((change, index) => {
        if (!change || typeof change !== "object") {
          errors.push(
            `changes[${index}] must be an object.`
          );
          return;
        }

        if (
          !ALLOWED_CHANGE_TYPES.includes(
            change.type
          )
        ) {
          errors.push(
            `Invalid change type at changes[${index}]: ${change.type}.`
          );
        }

        if (
          change.field !== undefined &&
          !ALLOWED_FIELDS.includes(change.field)
        ) {
          errors.push(
            `Invalid field at changes[${index}]: ${change.field}.`
          );
        }
      });
    }
  }

  // ------------------------------------------
  // CONFIDENCE
  // ------------------------------------------

  if (plan.confidence !== undefined) {
    const confidence = Number(plan.confidence);

    if (
      Number.isNaN(confidence) ||
      confidence < 0 ||
      confidence > 1
    ) {
      errors.push(
        "confidence must be a number between 0 and 1."
      );
    }
  }

  // ------------------------------------------
  // BLOCK UNSAFE PROPERTIES
  // ------------------------------------------

  const blockedProperties = [
    "code",
    "script",
    "javascript",
    "html",
    "css",
    "eval",
    "execute",
    "command",
    "shell",
    "function",
    "functionBody",
    "expression",
    "onClick",
    "onLoad",
    "onError",
    "dangerouslySetInnerHTML",
  ];

  for (const property of blockedProperties) {
    if (
      Object.prototype.hasOwnProperty.call(
        plan,
        property
      )
    ) {
      errors.push(
        `Blocked property detected: ${property}.`
      );
    }
  }

  // ------------------------------------------
  // FINAL RESULT
  // ------------------------------------------

  if (errors.length > 0) {
    console.log("❌ PLAN VALIDATION FAILED");

    errors.forEach((error) => {
      console.log("  -", error);
    });

    return {
      valid: false,
      plan: null,
      errors,
    };
  }

  console.log("✅ PLAN VALIDATION PASSED");

  return {
    valid: true,
    plan: {
      action: plan.action,
      targetField:
        plan.targetField ?? null,
      reason:
        typeof plan.reason === "string"
          ? plan.reason
          : "",
      changes:
        Array.isArray(plan.changes)
          ? plan.changes
          : [],
      guidance:
        typeof plan.guidance === "string"
          ? plan.guidance
          : "",
      confidence:
        plan.confidence !== undefined
          ? Number(plan.confidence)
          : 1,
    },
    errors: [],
  };
}


// ============================================
// EXPORT
// ============================================

module.exports = {
  validateAdaptationPlan,
};
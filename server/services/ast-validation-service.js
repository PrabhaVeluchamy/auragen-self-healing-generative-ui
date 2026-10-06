// server/services/ast-validation-service.js

/**
 * ============================================================
 * AuraGen - AST / Structural Validation Service
 * ============================================================
 *
 * Purpose:
 * Validate Generative UI plans before they are applied
 * to the frontend.
 *
 * AuraGen pipeline:
 *
 * Generate
 *    ↓
 * Parse
 *    ↓
 * Validate
 *    ↓
 * Test
 *    ↓
 * Apply
 *
 * IMPORTANT:
 * AuraGen does NOT execute arbitrary AI-generated
 * JavaScript / HTML / shell commands.
 *
 * The AI produces a controlled UI adaptation plan.
 * Only approved actions, fields and properties are allowed.
 */

// ============================================================
// ALLOWED ACTIONS
// ============================================================

const ALLOWED_ACTIONS = new Set([
  "NO_ACTION",
  "SHOW_GUIDANCE",
  "SIMPLIFY_FORM",
  "HIGHLIGHT_FIELD",
  "HIDE_ADVANCED_FIELDS",
]);

// ============================================================
// ALLOWED FORM FIELDS
// ============================================================

const ALLOWED_FIELDS = new Set([
  "annualIncome",
  "taxId",
  "investmentAmount",
  "taxCategory",
]);

// ============================================================
// ALLOWED UI CHANGE TYPES
// ============================================================

const ALLOWED_CHANGE_TYPES = new Set([
  "HIDE_FIELD",
  "SHOW_FIELD",
  "HIGHLIGHT_FIELD",
]);

// ============================================================
// DANGEROUS PROPERTY NAMES
// ============================================================
//
// These properties should never appear in a generated
// adaptation plan.
//

const BLOCKED_PROPERTIES = new Set([
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
]);

// ============================================================
// UTILITY: RECURSIVE OBJECT INSPECTION
// ============================================================

function findBlockedProperties(
  value,
  path = "root"
) {
  const violations = [];

  if (
    value === null ||
    value === undefined
  ) {
    return violations;
  }

  // ----------------------------------------------------------
  // Objects
  // ----------------------------------------------------------

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    for (
      const [key, childValue] of
      Object.entries(value)
    ) {
      const normalizedKey =
        String(key).toLowerCase();

      if (
        BLOCKED_PROPERTIES.has(
          normalizedKey
        )
      ) {
        violations.push(
          `${path}.${key}`
        );
      }

      violations.push(
        ...findBlockedProperties(
          childValue,
          `${path}.${key}`
        )
      );
    }

    return violations;
  }

  // ----------------------------------------------------------
  // Arrays
  // ----------------------------------------------------------

  if (Array.isArray(value)) {
    value.forEach(
      (item, index) => {
        violations.push(
          ...findBlockedProperties(
            item,
            `${path}[${index}]`
          )
        );
      }
    );
  }

  return violations;
}

// ============================================================
// UTILITY: CHECK STRING SAFETY
// ============================================================

function containsExecutableCode(
  value
) {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  const dangerousPatterns = [
    /<script\b/i,
    /javascript\s*:/i,
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /\bchild_process\b/i,
    /\bprocess\.env\b/i,
    /\bfs\./i,
    /\brequire\s*\(/i,
    /\bimport\s*\(/i,
    /\bfetch\s*\(/i,
    /\bnew\s+Function\b/i,
    /\bFunction\s*\(/i,
  ];

  return dangerousPatterns.some(
    (pattern) =>
      pattern.test(value)
  );
}

// ============================================================
// UTILITY: CHECK ALL STRINGS
// ============================================================

function findUnsafeStrings(
  value,
  path = "root"
) {
  const violations = [];

  if (
    typeof value === "string"
  ) {
    if (
      containsExecutableCode(
        value
      )
    ) {
      violations.push(path);
    }

    return violations;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return violations;
  }

  if (Array.isArray(value)) {
    value.forEach(
      (item, index) => {
        violations.push(
          ...findUnsafeStrings(
            item,
            `${path}[${index}]`
          )
        );
      }
    );

    return violations;
  }

  if (
    typeof value === "object"
  ) {
    Object.entries(value).forEach(
      ([key, childValue]) => {
        violations.push(
          ...findUnsafeStrings(
            childValue,
            `${path}.${key}`
          )
        );
      }
    );
  }

  return violations;
}

// ============================================================
// STEP 1: PARSE
// ============================================================

function parseGeneratedPlan(
  input
) {
  console.log(
    "\n🌳 AST VALIDATION - PARSE"
  );

  if (
    typeof input === "object" &&
    input !== null
  ) {
    return input;
  }

  if (
    typeof input !== "string"
  ) {
    throw new Error(
      "Generated UI plan must be an object or JSON string."
    );
  }

  try {
    const parsed =
      JSON.parse(input);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      throw new Error(
        "Parsed plan is not an object."
      );
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `Generated UI plan contains invalid JSON: ${error.message}`
    );
  }
}

// ============================================================
// STEP 2: STRUCTURAL VALIDATION
// ============================================================

function validateStructure(
  plan
) {
  console.log(
    "\n🔎 AST VALIDATION - STRUCTURE"
  );

  if (
    !plan ||
    typeof plan !== "object"
  ) {
    throw new Error(
      "Plan must be a valid object."
    );
  }

  // ----------------------------------------------------------
  // Check blocked properties
  // ----------------------------------------------------------

  const blockedProperties =
    findBlockedProperties(
      plan
    );

  if (
    blockedProperties.length >
    0
  ) {
    throw new Error(
      `Blocked properties detected: ${blockedProperties.join(
        ", "
      )}`
    );
  }

  // ----------------------------------------------------------
  // Check unsafe strings
  // ----------------------------------------------------------

  const unsafeStrings =
    findUnsafeStrings(
      plan
    );

  if (
    unsafeStrings.length >
    0
  ) {
    throw new Error(
      `Potential executable content detected at: ${unsafeStrings.join(
        ", "
      )}`
    );
  }

  // ----------------------------------------------------------
  // Action
  // ----------------------------------------------------------

  if (
    typeof plan.action !==
    "string"
  ) {
    throw new Error(
      "Plan action must be a string."
    );
  }

  if (
    !ALLOWED_ACTIONS.has(
      plan.action
    )
  ) {
    throw new Error(
      `Unsupported action: ${plan.action}`
    );
  }

  // ----------------------------------------------------------
  // Target field
  // ----------------------------------------------------------

  if (
    plan.targetField !==
      undefined &&
    plan.targetField !==
      null &&
    plan.targetField !== ""
  ) {
    if (
      typeof plan.targetField !==
      "string"
    ) {
      throw new Error(
        "targetField must be a string."
      );
    }

    if (
      !ALLOWED_FIELDS.has(
        plan.targetField
      )
    ) {
      throw new Error(
        `Unsupported target field: ${plan.targetField}`
      );
    }
  }

  // ----------------------------------------------------------
  // Reason
  // ----------------------------------------------------------

  if (
    plan.reason !==
      undefined &&
    typeof plan.reason !==
      "string"
  ) {
    throw new Error(
      "reason must be a string."
    );
  }

  // ----------------------------------------------------------
  // Guidance
  // ----------------------------------------------------------

  if (
    plan.guidance !==
      undefined &&
    typeof plan.guidance !==
      "string"
  ) {
    throw new Error(
      "guidance must be a string."
    );
  }

  // ----------------------------------------------------------
  // Confidence
  // ----------------------------------------------------------

  if (
    plan.confidence !==
      undefined
  ) {
    const confidence =
      Number(
        plan.confidence
      );

    if (
      Number.isNaN(
        confidence
      )
    ) {
      throw new Error(
        "confidence must be numeric."
      );
    }

    if (
      confidence < 0 ||
      confidence > 1
    ) {
      throw new Error(
        "confidence must be between 0 and 1."
      );
    }
  }

  // ----------------------------------------------------------
  // Changes
  // ----------------------------------------------------------

  if (
    plan.changes !==
      undefined
  ) {
    if (
      !Array.isArray(
        plan.changes
      )
    ) {
      throw new Error(
        "changes must be an array."
      );
    }

    plan.changes.forEach(
      (change, index) => {
        if (
          !change ||
          typeof change !==
            "object"
        ) {
          throw new Error(
            `Change ${index} must be an object.`
          );
        }

        if (
          typeof change.type !==
          "string"
        ) {
          throw new Error(
            `Change ${index} type must be a string.`
          );
        }

        if (
          !ALLOWED_CHANGE_TYPES.has(
            change.type
          )
        ) {
          throw new Error(
            `Unsupported change type: ${change.type}`
          );
        }

        if (
          typeof change.field !==
          "string"
        ) {
          throw new Error(
            `Change ${index} field must be a string.`
          );
        }

        if (
          !ALLOWED_FIELDS.has(
            change.field
          )
        ) {
          throw new Error(
            `Unsupported change field: ${change.field}`
          );
        }
      }
    );
  }

  console.log(
    "✅ Structural validation passed"
  );

  return true;
}

// ============================================================
// STEP 3: SANITIZE
// ============================================================

function sanitizePlan(
  plan
) {
  console.log(
    "\n🧹 AST VALIDATION - SANITIZE"
  );

  const confidence =
    plan.confidence ===
    undefined
      ? 0.8
      : Number(
          plan.confidence
        );

  const changes =
    Array.isArray(
      plan.changes
    )
      ? plan.changes.map(
          (change) => ({
            type: change.type,
            field: change.field,
          })
        )
      : [];

  const sanitizedPlan = {
    action: plan.action,

    targetField:
      plan.targetField ||
      null,

    reason:
      plan.reason ||
      "",

    changes,

    guidance:
      plan.guidance ||
      "",

    confidence,
  };

  console.log(
    "✅ Plan sanitized"
  );

  return sanitizedPlan;
}

// ============================================================
// STEP 4: FINAL AST-STYLE VALIDATION
// ============================================================

function validateAdaptationAST(
  input
) {
  console.log(
    "\n========================================"
  );

  console.log(
    "🌳 AURAGEN AST VALIDATION"
  );

  console.log(
    "========================================"
  );

  try {
    // Parse
    const parsedPlan =
      parseGeneratedPlan(
        input
      );

    // Structural validation
    validateStructure(
      parsedPlan
    );

    // Sanitize
    const sanitizedPlan =
      sanitizePlan(
        parsedPlan
      );

    console.log(
      "\n✅ AST VALIDATION PASSED"
    );

    console.log(
      JSON.stringify(
        sanitizedPlan,
        null,
        2
      )
    );

    return {
      valid: true,
      plan: sanitizedPlan,
      errors: [],
    };
  } catch (error) {
    console.error(
      "\n❌ AST VALIDATION FAILED"
    );

    console.error(
      error.message
    );

    return {
      valid: false,
      plan: null,
      errors: [
        error.message,
      ],
    };
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  parseGeneratedPlan,
  validateStructure,
  sanitizePlan,
  validateAdaptationAST,
};
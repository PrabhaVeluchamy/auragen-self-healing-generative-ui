const {
  validateAdaptationAST,
} = require(
  "./server/services/ast-validation-service"
);

console.log(
  "\n🧪 TEST 1 - VALID PLAN"
);

const validPlan = {
  action: "SIMPLIFY_FORM",

  targetField:
    "annualIncome",

  reason:
    "High interaction difficulty detected.",

  changes: [
    {
      type: "HIDE_FIELD",
      field: "investmentAmount",
    },
  ],

  guidance:
    "Complete the required information first.",

  confidence: 0.9,
};

const validResult =
  validateAdaptationAST(
    validPlan
  );

console.log(
  "\nRESULT:",
  validResult
);


console.log(
  "\n🧪 TEST 2 - UNSAFE PLAN"
);

const unsafePlan = {
  action: "SIMPLIFY_FORM",

  targetField:
    "annualIncome",

  code:
    "eval(userInput)",

  changes: [],

  confidence: 0.9,
};

const unsafeResult =
  validateAdaptationAST(
    unsafePlan
  );

console.log(
  "\nRESULT:",
  unsafeResult
);
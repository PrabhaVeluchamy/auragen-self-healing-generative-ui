require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 5000;

const FIELD_GUIDANCE = {
  annualIncome:
    "Please enter your annual income using the details available in your records.",
  taxId:
    "Your Tax Identification Number is a 9-digit number. You can find it in your office account.",
  investmentAmount:
    "Please enter the amount you plan to invest.",
  taxCategory:
    "Please select the tax category that best matches your situation.",
};

const VALID_FIELDS = new Set(Object.keys(FIELD_GUIDANCE));

let ai = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

function withTimeout(promise, timeoutMs = GEMINI_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Gemini timed out after ${timeoutMs} ms`)),
      timeoutMs
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function getActiveField(context = {}, plan = {}) {
  // Context produced by buildGenAIContext uses interaction.activeField.
  const candidate =
    context?.interaction?.activeField ??
    context?.telemetry?.interaction?.activeField ??
    context?.activeField ??
    plan?.targetField;

  return VALID_FIELDS.has(candidate) ? candidate : null;
}

function applyFieldSpecificGuidance(plan, context) {
  if (!plan || typeof plan !== "object" || plan.action === "NO_ACTION") {
    return plan;
  }

  const field = getActiveField(context, plan);
  if (!field) {
    // Do not incorrectly default to annualIncome if telemetry is missing.
    return plan;
  }

  return {
    ...plan,
    targetField: field,
    guidance: FIELD_GUIDANCE[field],
  };
}

async function generateUIAdaptation(genAIContext, prompt) {
  const startedAt = Date.now();
  console.log("\n🤖 GENAI ADAPTATION");

  if (ai) {
    try {
      console.log("🧠 Calling Gemini; model:", GEMINI_MODEL);
      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction:
              "You are AuraGen's safe Generative UI planning component. " +
              "Return only valid JSON. Never generate executable JavaScript, HTML, or arbitrary code. " +
              "Use only the allowed actions, change types, and fields specified in the prompt.",
            temperature: 0.1,
            maxOutputTokens: 300,
            responseMimeType: "application/json",
          },
        }),
        GEMINI_TIMEOUT_MS
      );

      console.log(`[PERF] Gemini: ${Date.now() - startedAt} ms`);
      const rawText = response.text?.trim();
      if (!rawText) throw new Error("Gemini returned an empty response.");

      let plan;
      try {
        plan = JSON.parse(rawText);
      } catch {
        throw new Error("Gemini returned invalid JSON.");
      }

      // Keep AST and final plan validation in the existing caller pipeline.
      plan = applyFieldSpecificGuidance(plan, genAIContext);

      return {
        provider: "gemini",
        model: GEMINI_MODEL,
        plan,
        rawText: JSON.stringify(plan),
      };
    } catch (error) {
      console.error(
        `[PERF] Gemini unavailable after ${Date.now() - startedAt} ms:`,
        error?.message || error
      );
      console.log("🔄 Switching to deterministic safe fallback.");
    }
  } else {
    console.warn("GEMINI_API_KEY not configured; using safe fallback.");
  }

  const fallback = generateMockAdaptation(genAIContext);
  console.log(`[PERF] Fallback service: ${Date.now() - startedAt} ms`);
  return fallback;
}

function generateMockAdaptation(context = {}) {
  const friction = Number(context?.friction?.score ?? context?.frictionScore ?? 0) || 0;
  const cognitiveLoad = Number(context?.cognitiveLoad?.score ?? context?.cognitiveLoadScore ?? 0) || 0;
  const activeField = getActiveField(context);

  let plan;
  if (friction >= 70 || cognitiveLoad >= 70) {
    plan = {
      action: "SIMPLIFY_FORM",
      ...(activeField ? { targetField: activeField } : {}),
      reason: "High interaction difficulty detected.",
      changes: [{ type: "HIDE_FIELD", field: "investmentAmount" }],
      guidance: activeField ? FIELD_GUIDANCE[activeField] : "The form has been simplified to reduce interaction difficulty.",
      confidence: 0.9,
    };
  } else if (friction >= 40 || cognitiveLoad >= 40) {
    plan = {
      action: "SHOW_GUIDANCE",
      ...(activeField ? { targetField: activeField } : {}),
      reason: "Moderate interaction difficulty detected.",
      changes: [],
      guidance: activeField ? FIELD_GUIDANCE[activeField] : "Please complete the field carefully.",
      confidence: 0.8,
    };
  } else {
    plan = {
      action: "NO_ACTION",
      ...(activeField ? { targetField: activeField } : {}),
      reason: "Interaction difficulty is within the normal range.",
      changes: [],
      guidance: "",
      confidence: 0.95,
    };
  }

  return {
    provider: "mock",
    model: "auragen-safe-fallback",
    plan,
    rawText: JSON.stringify(plan),
  };
}

module.exports = { generateUIAdaptation };

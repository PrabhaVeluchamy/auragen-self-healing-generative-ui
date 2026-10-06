require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

let ai = null;

if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });
}

/**
 * Generate an adaptation plan using Gemini.
 *
 * If Gemini is unavailable (for example, 429 quota exceeded),
 * AuraGen uses a deterministic safe fallback.
 */
async function generateUIAdaptation(genAIContext, prompt) {
  console.log("\n🤖 GENAI ADAPTATION");

  // --------------------------------------------------
  // Try Gemini
  // --------------------------------------------------

  if (ai) {
    try {
      console.log("🧠 Calling Gemini...");
      console.log("Model:", GEMINI_MODEL);

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            "You are AuraGen's safe Generative UI planning component. " +
            "Return only valid JSON. " +
            "Never generate executable JavaScript, HTML, or arbitrary code.",
          temperature: 0.2,
        },
      });

      const rawText = response.text?.trim();

      if (!rawText) {
        throw new Error("Gemini returned an empty response.");
      }

      console.log("✅ Gemini response received");

      let plan;

      try {
        plan = JSON.parse(rawText);
      } catch {
        throw new Error("Gemini returned invalid JSON.");
      }

      return {
        provider: "gemini",
        model: GEMINI_MODEL,
        plan,
        rawText,
      };
    } catch (error) {
      console.log("\n⚠️ GEMINI UNAVAILABLE");
      console.log(
        "Status:",
        error?.status || error?.code || "UNKNOWN"
      );

      if (error?.status === 429) {
        console.log(
          "Reason: Gemini API quota exceeded."
        );
      } else {
        console.log(
          "Reason:",
          error?.message || "Unknown Gemini error."
        );
      }

      console.log("🔄 Switching to SAFE MOCK GENAI...");
    }
  } else {
    console.log("⚠️ GEMINI_API_KEY not configured.");
    console.log("🔄 Switching to SAFE MOCK GENAI...");
  }

  // --------------------------------------------------
  // Safe fallback
  // --------------------------------------------------

  return generateMockAdaptation(genAIContext);
}


/**
 * Safe deterministic fallback.
 *
 * IMPORTANT:
 * This does NOT generate executable code.
 * It only returns predefined UI actions.
 */
function generateMockAdaptation(context) {
  const friction =
    Number(context?.friction?.score) || 0;

  const cognitiveLoad =
    Number(context?.cognitiveLoad?.score) || 0;

  const activeField =
    context?.interaction?.activeField ||
    "annualIncome";

  console.log("\n🧪 MOCK GENAI");

  console.log("Friction Score:", friction);
  console.log("Cognitive Load:", cognitiveLoad);
  console.log("Active Field:", activeField);

  let plan;

  if (friction >= 70 || cognitiveLoad >= 70) {
    plan = {
      action: "SIMPLIFY_FORM",

      targetField: activeField,

      reason:
        "High interaction difficulty detected.",

      changes: [
        {
          type: "HIDE_FIELD",
          field: "investmentAmount",
        },
      ],

      guidance:
        "Complete the required information first. " +
        "Advanced fields have been temporarily simplified.",

      confidence: 0.90,
    };
  } else if (
    friction >= 40 ||
    cognitiveLoad >= 40
  ) {
    plan = {
      action: "SHOW_GUIDANCE",

      targetField: activeField,

      reason:
        "Moderate interaction difficulty detected.",

      changes: [],

      guidance:
        "Take a moment to complete the highlighted field.",

      confidence: 0.80,
    };
  } else {
    plan = {
      action: "NO_ACTION",

      targetField: activeField,

      reason:
        "Interaction difficulty is within the normal range.",

      changes: [],

      guidance: "",

      confidence: 0.95,
    };
  }

  console.log(
    "🧠 Mock Adaptation Plan:"
  );

  console.log(
    JSON.stringify(plan, null, 2)
  );

  return {
    provider: "mock",
    model: "auragen-safe-fallback",
    plan,
    rawText: JSON.stringify(plan),
  };
}

module.exports = {
  generateUIAdaptation,
};
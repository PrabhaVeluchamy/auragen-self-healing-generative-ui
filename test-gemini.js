require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is missing");
  process.exit(1);
}

console.log("🔑 Gemini API key loaded");
console.log("🤖 Testing model:", process.env.GEMINI_MODEL);

const ai = new GoogleGenAI({
  apiKey: apiKey,
});

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: "Say hello to AuraGen in one sentence.",
    });

    console.log("\n✅ GEMINI SUCCESS\n");
    console.log(response.text);
  } catch (error) {
    console.log("\n❌ GEMINI TEST FAILED\n");
    console.log(error);
  }
}

test();
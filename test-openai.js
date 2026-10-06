require("dotenv").config();

const OpenAI = require("openai");

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing from .env");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log("🔑 API key loaded");
  console.log("🤖 Model:", process.env.OPENAI_MODEL);

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL,
    input: "Reply with exactly: AuraGen OpenAI connection successful",
  });

  console.log("\n✅ OPENAI RESPONSE:");
  console.log(response.output_text);
}

main().catch((error) => {
  console.error("\n❌ OPENAI TEST FAILED");
  console.error(error.message);
});
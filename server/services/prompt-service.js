function buildGenAIPrompt(genAIContext) {
  const prompt = `
You are the Generative UI decision component of AuraGen.

AuraGen is a Self-Healing Generative UI system that adapts
a user interface when interaction difficulty is detected.

Your task is to analyze the provided interaction context
and create a SAFE UI adaptation plan.

IMPORTANT RULES:

1. Do not execute code.
2. Do not generate arbitrary JavaScript.
3. Do not generate arbitrary HTML.
4. Do not access files, databases, APIs, or the operating system.
5. Only propose UI changes.
6. Use the existing application fields and components.
7. Prefer simple and minimal UI changes.
8. Return ONLY valid JSON.
9. Do not include Markdown.
10. Do not invent user information.

AVAILABLE UI ACTIONS:

- NO_ACTION
- SHOW_GUIDANCE
- SIMPLIFY_FORM
- HIGHLIGHT_FIELD
- HIDE_ADVANCED_FIELDS

USER INTERACTION CONTEXT:

${JSON.stringify(genAIContext, null, 2)}

Return this JSON structure:

{
  "action": "SIMPLIFY_FORM",
  "targetField": "annualIncome",
  "reason": "High interaction difficulty detected",
  "changes": [
    {
      "type": "HIDE_FIELD",
      "field": "investmentAmount"
    }
  ],
  "guidance": "Complete the required income information first.",
  "confidence": 0.90
}
`;

  return prompt.trim();
}

module.exports = {
  buildGenAIPrompt,
};

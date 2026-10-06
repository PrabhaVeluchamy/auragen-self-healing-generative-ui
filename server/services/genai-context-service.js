function buildGenAIContext(telemetry, adaptationDecision) {
  return {
    system: "AuraGen",
    purpose:
      "Self-Healing Generative UI based on interaction difficulty",
    timestamp: Date.now(),

    interaction: {
      activeField:
        telemetry.interaction?.activeField ?? "None",
      movementCount:
        telemetry.movement?.count ??
        telemetry.interaction?.movementCount ??
        0,
    },

    friction: {
      score: telemetry.friction?.score ?? 0,
      status: telemetry.friction?.status ?? "Unknown",
    },

    cognitiveLoad: {
      score: telemetry.cognitiveLoad?.score ?? 0,
      status:
        telemetry.cognitiveLoad?.status ?? "Unknown",
    },

    hesitation: {
      seconds: telemetry.hesitation?.seconds ?? 0,
      detected:
        telemetry.hesitation?.detected ?? false,
    },

    adaptation: {
      action: adaptationDecision.action,
      severity: adaptationDecision.severity,
      reason: adaptationDecision.reason,
      activeField: adaptationDecision.activeField,
      message: adaptationDecision.message,
    },

    instruction:
      "Analyze the interaction difficulty and propose a safe UI adaptation. Do not execute code. Return a structured UI modification plan.",
  };
}

module.exports = {
  buildGenAIContext,
};

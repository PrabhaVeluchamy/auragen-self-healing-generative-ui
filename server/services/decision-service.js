function makeAdaptationDecision(telemetry) {
  const frictionScore = telemetry.friction?.score ?? 0;
  const cognitiveLoad = telemetry.cognitiveLoad?.score ?? 0;
  const hesitationDetected =
    telemetry.hesitation?.detected ?? false;
  const activeField =
    telemetry.interaction?.activeField ?? "None";

  if (frictionScore >= 70 || cognitiveLoad >= 70) {
    return {
      action: "SIMPLIFY_FORM",
      severity: "HIGH",
      reason: "High interaction difficulty detected",
      activeField,
      message:
        "The user appears to be experiencing high interaction difficulty. Simplify the form.",
    };
  }

  if (
    frictionScore >= 40 ||
    cognitiveLoad >= 40 ||
    hesitationDetected
  ) {
    return {
      action: "SHOW_GUIDANCE",
      severity: "MEDIUM",
      reason: "Moderate interaction difficulty detected",
      activeField,
      message: "The user may need additional guidance.",
    };
  }

  return {
    action: "NO_ACTION",
    severity: "LOW",
    reason: "Normal interaction detected",
    activeField,
    message: "No UI adaptation is required.",
  };
}

module.exports = {
  makeAdaptationDecision,
};

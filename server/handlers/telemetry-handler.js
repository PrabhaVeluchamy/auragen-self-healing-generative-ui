function handleTelemetry(telemetry) {
  // ==========================================
  // 1. FRICTION SCORE
  // Supports:
  // telemetry.friction.score
  // telemetry.frictionScore
  // ==========================================
  const frictionScore =
    telemetry.friction?.score ??
    telemetry.frictionScore ??
    0;

  const frictionStatus =
    telemetry.friction?.status ??
    getScoreStatus(frictionScore);

  // ==========================================
  // 2. COGNITIVE LOAD
  // Supports:
  // telemetry.cognitiveLoad.score
  // telemetry.cognitiveLoad
  // ==========================================
  const cognitiveLoad =
    typeof telemetry.cognitiveLoad === "number"
      ? telemetry.cognitiveLoad
      : telemetry.cognitiveLoad?.score ??
        0;

  const cognitiveLoadStatus =
    typeof telemetry.cognitiveLoad === "object"
      ? telemetry.cognitiveLoad?.status ??
        getScoreStatus(cognitiveLoad)
      : getScoreStatus(cognitiveLoad);

  // ==========================================
  // 3. ACTIVE FIELD
  // ==========================================
  const activeField =
    telemetry.interaction?.activeField ??
    telemetry.activeField ??
    "None";

  // ==========================================
  // 4. MOVEMENT COUNT
  // ==========================================
  const movementCount =
    telemetry.movement?.count ??
    telemetry.interaction?.movementCount ??
    telemetry.movementCount ??
    0;

  // ==========================================
  // 5. MOVEMENT DISTANCE
  // ==========================================
  const totalMovementDistance =
    telemetry.movement?.distance ??
    telemetry.movement?.totalDistance ??
    telemetry.totalMovementDistance ??
    0;

  // ==========================================
  // 6. HESITATION
  // ==========================================
  const hesitationSeconds =
    telemetry.hesitation?.seconds ??
    telemetry.hesitationSeconds ??
    0;

  const hesitationDetected =
    telemetry.hesitation?.detected ??
    telemetry.isHesitating ??
    hesitationSeconds > 0;

  // ==========================================
  // 7. FIELD INTERACTIONS
  // ==========================================
  const fieldInteractions =
    telemetry.interaction?.fieldInteractions ??
    telemetry.fieldInteractions ??
    {};

  // ==========================================
  // 8. ADAPTATION ACTION
  // ==========================================
  const currentAction =
    telemetry.adaptation?.action ??
    telemetry.action ??
    "NONE";

  // ==========================================
  // LOGGING
  // ==========================================

  console.log("📡 TELEMETRY HANDLER");

  console.log("Friction Score:", frictionScore);
  console.log("Friction Status:", frictionStatus);

  console.log("Cognitive Load:", cognitiveLoad);
  console.log("Cognitive Load Status:", cognitiveLoadStatus);

  console.log("Active Field:", activeField);

  console.log("Movement Count:", movementCount);
  console.log(
    "Movement Distance:",
    totalMovementDistance
  );

  console.log(
    "Hesitation:",
    hesitationSeconds,
    "seconds"
  );

  console.log(
    "Hesitation Detected:",
    hesitationDetected
  );

  console.log("Current Action:", currentAction);

  // ==========================================
  // RETURN NORMALIZED TELEMETRY
  // ==========================================

  return {
    timestamp:
      telemetry.timestamp ??
      Date.now(),

    friction: {
      score: Number(frictionScore),
      status: frictionStatus,
    },

    cognitiveLoad: {
      score: Number(cognitiveLoad),
      status: cognitiveLoadStatus,
    },

    interaction: {
      activeField,
      movementCount: Number(movementCount),
      fieldInteractions,
    },

    movement: {
      count: Number(movementCount),
      totalDistance: Number(
        totalMovementDistance
      ),
    },

    hesitation: {
      seconds: Number(hesitationSeconds),
      detected: Boolean(hesitationDetected),
    },

    adaptation: {
      action: currentAction,
    },
  };
}


// ==========================================
// SCORE STATUS HELPER
// ==========================================

function getScoreStatus(score) {
  const value = Number(score) || 0;

  if (value >= 70) {
    return "High";
  }

  if (value >= 40) {
    return "Medium";
  }

  if (value > 0) {
    return "Low";
  }

  return "Unknown";
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {
  handleTelemetry,
};
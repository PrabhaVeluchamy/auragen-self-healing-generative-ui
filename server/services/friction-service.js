function calculateFriction(telemetry) {
  const movementCount = telemetry.movement?.count ?? 0;
  const averageDistance =
    telemetry.movement?.averageDistance ?? 0;
  const hesitationDetected =
    telemetry.hesitation?.detected ?? false;

  const score = Math.min(
    Math.round(
      movementCount * 0.2 +
        averageDistance * 0.3 +
        (hesitationDetected ? 20 : 0)
    ),
    100
  );

  let status = "Low";

  if (score >= 60) {
    status = "High";
  } else if (score >= 30) {
    status = "Medium";
  }

  return {
    score,
    status,
  };
}

module.exports = {
  calculateFriction,
};

const WebSocket = require("ws");

const URL = "ws://127.0.0.1:3001";

console.log(`Testing ${URL} ...`);

const socket = new WebSocket(URL);

socket.on("open", () => {
  console.log("✅ TEST CONNECTED");

  socket.send(
    JSON.stringify({
      type: "telemetry",
      timestamp: Date.now(),
      movement: {
        count: 10,
        totalDistance: 500,
        averageDistance: 50,
        status: "Moderate Movement",
      },
      interaction: {
        activeField: "annualIncome",
        movementCount: 10,
        totalInteractions: 2,
      },
      hesitation: {
        seconds: 4,
        detected: true,
      },
      friction: {
        score: 45,
        status: "Medium",
      },
      cognitiveLoad: {
        score: 50,
        status: "Medium",
      },
      adaptation: {
        action: "SHOW_GUIDANCE",
      },
    })
  );
});

socket.on("message", (data) => {
  console.log("📨 SERVER:", data.toString());
  socket.close();
});

socket.on("error", (error) => {
  console.error("❌ TEST ERROR:", error.message);
  process.exitCode = 1;
});

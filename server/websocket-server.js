// ============================================================
// AURAGEN WEBSOCKET SERVER
// Self-Healing Generative UI via Cognitive Load
// ============================================================

require("dotenv").config();

const WebSocket = require("ws");

// ============================================================
// IMPORT SERVICES
// ============================================================

const {
  handleTelemetry,
} = require("./handlers/telemetry-handler");

const {
  makeAdaptationDecision,
} = require("./services/decision-service");

const {
  buildGenAIContext,
} = require("./services/genai-context-service");

const {
  buildGenAIPrompt,
} = require("./services/prompt-service");

const {
  generateUIAdaptation,
} = require("./services/genai-service");

const {
  validateAdaptationAST,
} = require("./services/ast-validation-service");

const {
  validateAdaptationPlan,
} = require("./services/validation-service");


// ============================================================
// SERVER CONFIGURATION
// ============================================================

const HOST = "127.0.0.1";
const PORT = 3001;

const wss = new WebSocket.Server({
  host: HOST,
  port: PORT,
});


// ============================================================
// SERVER START
// ============================================================

console.log("");
console.log("========================================");
console.log("🚀 AURAGEN WEBSOCKET SERVER");
console.log("========================================");
console.log(`📡 WebSocket Server: ws://${HOST}:${PORT}`);

console.log(
  "🧠 GenAI Provider:",
  process.env.GEMINI_API_KEY
    ? "Gemini"
    : "Safe Mock"
);

console.log(
  "🤖 Gemini Model:",
  process.env.GEMINI_MODEL ||
    "gemini-3.8-flash"
);

console.log("🌳 AST Validation: ENABLED");
console.log("🛡️ Plan Validation: ENABLED");

console.log("========================================");
console.log("");


// ============================================================
// SAFE SEND
// ============================================================

function sendMessage(socket, data) {
  try {
    if (
      socket &&
      socket.readyState === WebSocket.OPEN
    ) {
      socket.send(
        JSON.stringify(data)
      );

      return true;
    }

    console.log(
      "⚠️ WebSocket is not open. Message not sent."
    );

    return false;
  } catch (error) {
    console.error(
      "❌ WebSocket send error:",
      error.message
    );

    return false;
  }
}


// ============================================================
// CLIENT CONNECTION
// ============================================================

wss.on("connection", (socket, request) => {
  const clientAddress =
    request?.socket?.remoteAddress ||
    "Unknown";

  console.log("========================================");
  console.log(
    "🔌 CLIENT CONNECTED:",
    clientAddress
  );

  console.log(
    "👥 Active Clients:",
    wss.clients.size
  );

  console.log("========================================");


  // ----------------------------------------------------------
  // CONNECTION RESPONSE
  // ----------------------------------------------------------

  sendMessage(socket, {
    type: "connection",

    connected: true,

    message:
      "AuraGen WebSocket connected successfully.",

    timestamp: Date.now(),

    server: {
      host: HOST,
      port: PORT,
    },

    services: {
      telemetry: true,
      decisionEngine: true,
      genAI: true,
      astValidation: true,
      planValidation: true,
    },

    genAI: {
      provider:
        process.env.GEMINI_API_KEY
          ? "gemini"
          : "mock",

      model:
        process.env.GEMINI_MODEL ||
        "gemini-3.8-flash",
    },
  });


  // ==========================================================
  // MESSAGE RECEIVED
  // ==========================================================

  socket.on("message", async (message) => {

    console.log("");
    console.log("📨 MESSAGE RECEIVED");

    try {

      // --------------------------------------------------------
      // PARSE MESSAGE
      // --------------------------------------------------------

      const data = JSON.parse(
        message.toString()
      );

      console.log(
        "📦 Message Type:",
        data.type
      );


      // ========================================================
      // PING
      // ========================================================

      if (data.type === "ping") {

        sendMessage(socket, {
          type: "pong",
          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // ONLY TELEMETRY IS PROCESSED
      // ========================================================

      if (data.type !== "telemetry") {

        console.log(
          "ℹ️ Unsupported message type:",
          data.type
        );

        sendMessage(socket, {
          type: "message_ack",
          received: true,
          messageType: data.type,
          message:
            "Message received but no telemetry pipeline was triggered.",
          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // STEP 1 — TELEMETRY HANDLER
      // ========================================================

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "📡 STEP 1: TELEMETRY HANDLER"
      );

      console.log(
        "========================================"
      );


      let processedTelemetry;

      try {

        processedTelemetry =
          handleTelemetry(data);

        console.log(
          "📊 Telemetry processed successfully"
        );

      } catch (error) {

        console.error(
          "❌ Telemetry processing failed:",
          error
        );

        sendMessage(socket, {
          type: "telemetry_error",

          valid: false,

          error:
            error?.message ||
            "Telemetry processing failed.",

          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // STEP 2 — ADAPTATION DECISION
      // ========================================================

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "🧠 STEP 2: ADAPTATION DECISION"
      );

      console.log(
        "========================================"
      );


      let adaptationDecision;

      try {

        adaptationDecision =
          makeAdaptationDecision(
            processedTelemetry
          );

        console.log(
          "\n🤖 ADAPTATION DECISION"
        );

        console.log(
          JSON.stringify(
            adaptationDecision,
            null,
            2
          )
        );

      } catch (error) {

        console.error(
          "❌ Decision engine failed:",
          error
        );

        sendMessage(socket, {
          type: "decision_error",

          valid: false,

          error:
            error?.message ||
            "Adaptation decision failed.",

          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // TELEMETRY ACK
      // ========================================================

      sendMessage(socket, {
        type: "telemetry_ack",

        received: true,

        timestamp: Date.now(),

        message:
          "Telemetry processed successfully.",

        decision:
          adaptationDecision.action,

        friction:
          processedTelemetry.friction,

        cognitiveLoad:
          processedTelemetry.cognitiveLoad,

        interaction:
          processedTelemetry.interaction,

        hesitation:
          processedTelemetry.hesitation,
      });


      // ========================================================
      // NO ACTION
      // ========================================================

      if (
        adaptationDecision.action ===
        "NO_ACTION"
      ) {

        console.log("");
        console.log(
          "ℹ️ NO ADAPTATION REQUIRED"
        );

        sendMessage(socket, {
          type: "no_adaptation",

          action: "NO_ACTION",

          severity:
            adaptationDecision.severity,

          reason:
            adaptationDecision.reason,

          message:
            adaptationDecision.message,

          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // STEP 3 — ADAPTATION REQUIRED
      // ========================================================

      console.log("");
      console.log(
        "⚡ ADAPTATION REQUIRED"
      );

      console.log(
        "Action:",
        adaptationDecision.action
      );

      console.log(
        "Severity:",
        adaptationDecision.severity
      );

      console.log(
        "Reason:",
        adaptationDecision.reason
      );


      // ========================================================
      // STEP 4 — GENAI CONTEXT
      // ========================================================

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "🧠 STEP 3: BUILD GENAI CONTEXT"
      );

      console.log(
        "========================================"
      );


      let genAIContext;

      try {

        genAIContext =
          buildGenAIContext(
            processedTelemetry,
            adaptationDecision
          );

        console.log(
          "🤖 GENAI CONTEXT"
        );

        console.log(
          JSON.stringify(
            genAIContext,
            null,
            2
          )
        );

      } catch (error) {

        console.error(
          "❌ GenAI context creation failed:",
          error
        );

        sendMessage(socket, {
          type: "genai_context_error",

          valid: false,

          error:
            error?.message ||
            "GenAI context creation failed.",

          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // STEP 5 — BUILD GENAI PROMPT
      // ========================================================

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "📝 STEP 4: BUILD GENAI PROMPT"
      );

      console.log(
        "========================================"
      );


      let genAIPrompt;

      try {

        genAIPrompt =
          buildGenAIPrompt(
            genAIContext
          );

        console.log(
          "📝 GENAI PROMPT CREATED"
        );

        console.log(
          genAIPrompt
        );

      } catch (error) {

        console.error(
          "❌ GenAI prompt creation failed:",
          error
        );

        sendMessage(socket, {
          type: "genai_prompt_error",

          valid: false,

          error:
            error?.message ||
            "GenAI prompt creation failed.",

          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // STEP 6 — GENERATIVE AI
      // ========================================================

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "🤖 STEP 5: GENERATIVE AI"
      );

      console.log(
        "========================================"
      );


      let genAIResult;

      try {

        genAIResult =
          await generateUIAdaptation(
            genAIContext,
            genAIPrompt
          );

        console.log(
          "🤖 GENAI RESULT"
        );

        console.log(
          JSON.stringify(
            genAIResult,
            null,
            2
          )
        );

      } catch (error) {

        console.error(
          "❌ GenAI generation failed:",
          error
        );

        sendMessage(socket, {
          type: "genai_error",

          valid: false,

          error:
            error?.message ||
            "GenAI generation failed.",

          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // CHECK GENAI PLAN
      // ========================================================

      if (
        !genAIResult ||
        !genAIResult.plan
      ) {

        console.error(
          "❌ GenAI returned no adaptation plan."
        );

        sendMessage(socket, {
          type: "genai_error",

          valid: false,

          provider:
            genAIResult?.provider ||
            "unknown",

          model:
            genAIResult?.model ||
            "unknown",

          error:
            "GenAI returned no adaptation plan.",

          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // STEP 7 — AST VALIDATION
      // ========================================================

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "🌳 STEP 6: AST VALIDATION"
      );

      console.log(
        "========================================"
      );


      let astResult;

      try {

        astResult =
          validateAdaptationAST(
            genAIResult.plan
          );

      } catch (error) {

        console.error(
          "❌ AST validation exception:",
          error
        );

        sendMessage(socket, {
          type: "ast_validation_error",

          valid: false,

          validationStage: "AST",

          provider:
            genAIResult.provider,

          model:
            genAIResult.model,

          errors: [
            error?.message ||
              "AST validation exception.",
          ],

          error:
            error?.message ||
            "AST validation failed.",

          timestamp: Date.now(),
        });

        return;
      }


      // --------------------------------------------------------
      // AST FAILED
      // --------------------------------------------------------

      if (
        !astResult ||
        !astResult.valid
      ) {

        const astErrors =
          Array.isArray(
            astResult?.errors
          )
            ? astResult.errors
            : [
                "AST validation failed.",
              ];

        console.error(
          "❌ AST VALIDATION FAILED"
        );

        console.error(
          astErrors
        );

        sendMessage(socket, {
          type: "ast_validation_error",

          valid: false,

          validationStage: "AST",

          provider:
            genAIResult.provider,

          model:
            genAIResult.model,

          errors: astErrors,

          error:
            astErrors.join("; "),

          timestamp: Date.now(),
        });

        return;
      }


      console.log(
        "✅ AST VALIDATION PASSED"
      );


      // --------------------------------------------------------
      // SAFE AST PLAN
      // --------------------------------------------------------

      const safePlan =
        astResult.plan ||
        genAIResult.plan;


      console.log(
        "🌳 SAFE AST PLAN:"
      );

      console.log(
        JSON.stringify(
          safePlan,
          null,
          2
        )
      );


      // ========================================================
      // STEP 8 — FINAL PLAN VALIDATION
      // ========================================================

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "🛡️ STEP 7: FINAL PLAN VALIDATION"
      );

      console.log(
        "========================================"
      );


      let validationResult;

      try {

        validationResult =
          validateAdaptationPlan(
            safePlan
          );

      } catch (error) {

        console.error(
          "❌ Plan validation exception:",
          error
        );

        sendMessage(socket, {
          type: "genai_validation_error",

          valid: false,

          validationStage: "PLAN",

          provider:
            genAIResult.provider,

          model:
            genAIResult.model,

          errors: [
            error?.message ||
              "Plan validation exception.",
          ],

          error:
            error?.message ||
            "Plan validation failed.",

          timestamp: Date.now(),
        });

        return;
      }


      // --------------------------------------------------------
      // PLAN VALIDATION FAILED
      // --------------------------------------------------------

      if (
        !validationResult ||
        !validationResult.valid
      ) {

        const validationErrors =
          Array.isArray(
            validationResult?.errors
          )
            ? validationResult.errors
            : [
                "Adaptation plan validation failed.",
              ];

        console.error(
          "❌ FINAL PLAN VALIDATION FAILED"
        );

        validationErrors.forEach(
          (error) => {
            console.error(
              "  -",
              error
            );
          }
        );


        sendMessage(socket, {
          type: "genai_validation_error",

          valid: false,

          validationStage: "PLAN",

          provider:
            genAIResult.provider,

          model:
            genAIResult.model,

          errors: validationErrors,

          error:
            validationErrors.join(
              "; "
            ),

          timestamp: Date.now(),
        });

        return;
      }


      // ========================================================
      // FINAL APPROVED PLAN
      // ========================================================

      const finalPlan =
        validationResult.plan ||
        safePlan;


      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "🎯 FINAL APPROVED PLAN"
      );

      console.log(
        "========================================"
      );

      console.log(
        JSON.stringify(
          finalPlan,
          null,
          2
        )
      );


      console.log("");
      console.log(
        "✅ AST VALIDATION APPROVED"
      );

      console.log(
        "✅ FINAL PLAN VALIDATION PASSED"
      );


      // ========================================================
      // STEP 9 — SEND GENAI RESPONSE
      // ========================================================

      sendMessage(socket, {

        type: "genai_response",

        valid: true,

        provider:
          genAIResult.provider,

        model:
          genAIResult.model,

        plan: finalPlan,

        validation: {
          ast: true,
          schema: true,
        },

        timestamp: Date.now(),
      });


      // ========================================================
      // STEP 10 — SEND ADAPTATION TRIGGER
      // ========================================================

      console.log("");
      console.log(
        "🎯 ADAPTATION TRIGGER SENT"
      );


      sendMessage(socket, {

        type: "adaptation_trigger",

        action:
          finalPlan.action,

        targetField:
          finalPlan.targetField ||
          adaptationDecision.activeField,

        severity:
          adaptationDecision.severity,

        reason:
          finalPlan.reason ||
          adaptationDecision.reason,

        message:
          finalPlan.guidance ||
          adaptationDecision.message,

        guidance:
          finalPlan.guidance || "",

        confidence:
          finalPlan.confidence ?? 1,

        plan: finalPlan,

        provider:
          genAIResult.provider,

        model:
          genAIResult.model,

        validation: {
          ast: true,
          schema: true,
        },

        timestamp: Date.now(),
      });


      // ========================================================
      // PIPELINE COMPLETE
      // ========================================================

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "🎉 AURAGEN PIPELINE COMPLETED"
      );

      console.log(
        "========================================"
      );

      console.log(
        "Telemetry      : ✅"
      );

      console.log(
        "Decision       : ✅"
      );

      console.log(
        "GenAI          : ✅"
      );

      console.log(
        "AST Validation : ✅"
      );

      console.log(
        "Plan Validation: ✅"
      );

      console.log(
        "UI Trigger     : ✅"
      );

      console.log(
        "========================================"
      );

    } catch (error) {

      // ========================================================
      // GLOBAL MESSAGE ERROR
      // ========================================================

      console.error("");
      console.error(
        "❌ AURAGEN SERVER ERROR"
      );

      console.error(
        error
      );


      sendMessage(socket, {

        type: "server_error",

        valid: false,

        error:
          error?.message ||
          "Unexpected server error.",

        timestamp: Date.now(),
      });
    }
  });


  // ==========================================================
  // CLIENT ERROR
  // ==========================================================

  socket.on("error", (error) => {

    console.error(
      "❌ CLIENT SOCKET ERROR:",
      error.message
    );

  });


  // ==========================================================
  // CLIENT CLOSE
  // ==========================================================

  socket.on("close", () => {

    console.log("");
    console.log(
      "🔴 CLIENT DISCONNECTED"
    );

    console.log(
      "👥 Active Clients:",
      wss.clients.size
    );

  });

});


// ============================================================
// SERVER ERROR
// ============================================================

wss.on("error", (error) => {

  console.error("");
  console.error(
    "❌ WEBSOCKET SERVER ERROR"
  );

  console.error(
    error
  );

});


// ============================================================
// SERVER LISTENING
// ============================================================

wss.on("listening", () => {

  console.log(
    "========================================"
  );

  console.log(
    "✅ AURAGEN WEBSOCKET SERVER READY"
  );

  console.log(
    `📡 ws://${HOST}:${PORT}`
  );

  console.log(
    "🌳 AST Validation: ON"
  );

  console.log(
    "🛡️ Plan Validation: ON"
  );

  console.log(
    "🤖 GenAI: Gemini / Safe Mock"
  );

  console.log(
    "========================================"
  );

});


// ============================================================
// PROCESS SHUTDOWN
// ============================================================

function shutdown(signal) {

  console.log("");
  console.log(
    `🛑 ${signal} received.`
  );

  console.log(
    "🔄 Closing AuraGen WebSocket Server..."
  );


  wss.clients.forEach(
    (client) => {

      try {

        client.close(
          1001,
          "Server shutting down"
        );

      } catch (error) {

        console.error(
          "Client close error:",
          error.message
        );

      }

    }
  );


  wss.close(() => {

    console.log(
      "✅ WebSocket server closed."
    );

    process.exit(0);

  });

}


// ============================================================
// SHUTDOWN SIGNALS
// ============================================================

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);


// ============================================================
// UNHANDLED ERROR PROTECTION
// ============================================================

process.on(
  "uncaughtException",
  (error) => {

    console.error(
      "❌ UNCAUGHT EXCEPTION:",
      error
    );

  }
);


process.on(
  "unhandledRejection",
  (reason) => {

    console.error(
      "❌ UNHANDLED REJECTION:",
      reason
    );

  }
);
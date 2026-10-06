"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ============================================================
// TYPES
// ============================================================

type FieldName =
  | "annualIncome"
  | "taxId"
  | "investmentAmount"
  | "taxCategory";

type AdaptationAction =
  | "NO_ACTION"
  | "SHOW_GUIDANCE"
  | "SIMPLIFY_FORM"
  | "HIGHLIGHT_FIELD"
  | "HIDE_ADVANCED_FIELDS";

type ChangeType =
  | "HIDE_FIELD"
  | "SHOW_FIELD"
  | "HIGHLIGHT_FIELD";

type AdaptationChange = {
  type: ChangeType;
  field?: FieldName;
};

type AdaptationPlan = {
  action: AdaptationAction;
  targetField?: FieldName | string;
  reason?: string;
  changes?: AdaptationChange[];
  guidance?: string;
  confidence?: number;
};

type AdaptationHistoryItem = {
  id: number;
  time: string;
  friction: number;
  cognitiveLoad: number;
  action: AdaptationAction;
  confidence: number;
  provider: string;
  astValidated: boolean;
};

type FieldVisibility = Record<FieldName, boolean>;

// ============================================================
// CONSTANTS
// ============================================================

const WS_URL = "ws://127.0.0.1:3001";

const DEFAULT_VISIBILITY: FieldVisibility = {
  annualIncome: true,
  taxId: true,
  investmentAmount: true,
  taxCategory: true,
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Home() {
  // ----------------------------------------------------------
  // FORM STATE
  // ----------------------------------------------------------

  const [annualIncome, setAnnualIncome] =
    useState("");

  const [taxId, setTaxId] =
    useState("");

  const [investmentAmount, setInvestmentAmount] =
    useState("");

  const [taxCategory, setTaxCategory] =
    useState("");

  // ----------------------------------------------------------
  // TELEMETRY STATE
  // ----------------------------------------------------------

  const [movementCount, setMovementCount] =
    useState(0);

  const [totalMovementDistance, setTotalMovementDistance] =
    useState(0);

  const [activeField, setActiveField] =
    useState<FieldName | null>(null);

  const [fieldInteractions, setFieldInteractions] =
    useState<Record<string, number>>({});

  const [hesitationSeconds, setHesitationSeconds] =
    useState(0);

  const [isHesitating, setIsHesitating] =
    useState(false);

  // ----------------------------------------------------------
  // COGNITIVE LOAD
  // ----------------------------------------------------------

  const [frictionScore, setFrictionScore] =
    useState(0);

  const [cognitiveLoad, setCognitiveLoad] =
    useState(0);

  // ----------------------------------------------------------
  // WEBSOCKET
  // ----------------------------------------------------------

  const socketRef =
    useRef<WebSocket | null>(null);

  const [webSocketConnected, setWebSocketConnected] =
    useState(false);

  const [lastMessage, setLastMessage] =
    useState("Waiting for telemetry...");

  // ----------------------------------------------------------
  // GENAI STATE
  // ----------------------------------------------------------

  const [genAIProvider, setGenAIProvider] =
    useState("Waiting");

  const [genAIModel, setGenAIModel] =
    useState("Waiting");

  const [genAIAction, setGenAIAction] =
    useState<AdaptationAction>("NO_ACTION");

  const [genAIConfidence, setGenAIConfidence] =
    useState(0);

  const [genAIStatus, setGenAIStatus] =
    useState("Monitoring user interaction");

  const [genAIError, setGenAIError] =
    useState("");

  const [currentPlan, setCurrentPlan] =
    useState<AdaptationPlan | null>(null);

  // ----------------------------------------------------------
  // SELF HEALING
  // ----------------------------------------------------------

  const [selfHealingActive, setSelfHealingActive] =
    useState(false);

  const [guidanceMessage, setGuidanceMessage] =
    useState("");

  const [highlightedField, setHighlightedField] =
    useState<FieldName | null>(null);

  const [fieldVisibility, setFieldVisibility] =
    useState<FieldVisibility>(
      DEFAULT_VISIBILITY
    );

  // ----------------------------------------------------------
  // ADAPTATION HISTORY
  // ----------------------------------------------------------

  const [adaptationHistory, setAdaptationHistory] =
    useState<AdaptationHistoryItem[]>([]);

  // ----------------------------------------------------------
  // UI STATE
  // ----------------------------------------------------------

  const [showAdvancedFields, setShowAdvancedFields] =
    useState(true);

  const [formSubmitted, setFormSubmitted] =
    useState(false);

  const [isDemoMode, setIsDemoMode] =
    useState(false);

  // ----------------------------------------------------------
  // REFS
  // ----------------------------------------------------------

  const lastMouseX =
    useRef<number | null>(null);

  const lastMouseY =
    useRef<number | null>(null);

  const lastMovementTime =
    useRef<number>(Date.now());

  const hesitationTimer =
    useRef<NodeJS.Timeout | null>(null);

  const telemetryThrottle =
    useRef<NodeJS.Timeout | null>(null);

  // ==========================================================
  // FIELD INTERACTION
  // ==========================================================

  const handleFieldFocus = (
    field: FieldName
  ) => {
    setActiveField(field);

    setFieldInteractions((previous) => ({
      ...previous,
      [field]:
        (previous[field] || 0) + 1,
    }));

    setIsHesitating(true);

    setHesitationSeconds(0);

    if (hesitationTimer.current) {
      clearInterval(
        hesitationTimer.current
      );
    }

    hesitationTimer.current =
      setInterval(() => {
        setHesitationSeconds(
          (previous) => previous + 1
        );
      }, 1000);
  };

  const handleFieldBlur = () => {
    setIsHesitating(false);

    if (hesitationTimer.current) {
      clearInterval(
        hesitationTimer.current
      );

      hesitationTimer.current = null;
    }
  };

  // ==========================================================
  // MOUSE TELEMETRY
  // ==========================================================

  useEffect(() => {
    const handleMouseMove = (
      event: MouseEvent
    ) => {
      const currentX = event.clientX;
      const currentY = event.clientY;

      if (
        lastMouseX.current !== null &&
        lastMouseY.current !== null
      ) {
        const dx =
          currentX -
          lastMouseX.current;

        const dy =
          currentY -
          lastMouseY.current;

        const distance =
          Math.sqrt(
            dx * dx +
              dy * dy
          );

        if (distance > 2) {
          setMovementCount(
            (previous) =>
              previous + 1
          );

          setTotalMovementDistance(
            (previous) =>
              previous + distance
          );
        }
      }

      lastMouseX.current =
        currentX;

      lastMouseY.current =
        currentY;

      lastMovementTime.current =
        Date.now();
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );
    };
  }, []);

  // ==========================================================
  // CALCULATE FRICTION
  // ==========================================================

  useEffect(() => {
    const movementFactor =
      Math.min(
        movementCount / 250,
        1
      );

    const hesitationFactor =
      Math.min(
        hesitationSeconds / 10,
        1
      );

    const interactionCount =
      Object.values(
        fieldInteractions
      ).reduce(
        (sum, value) =>
          sum + value,
        0
      );

    const interactionFactor =
      Math.min(
        interactionCount / 20,
        1
      );

    const calculatedFriction =
      Math.round(
        movementFactor * 45 +
          hesitationFactor * 35 +
          interactionFactor * 20
      );

    const calculatedCognitiveLoad =
      Math.round(
        calculatedFriction * 0.75 +
          hesitationFactor * 25
      );

    setFrictionScore(
      Math.min(
        calculatedFriction,
        100
      )
    );

    setCognitiveLoad(
      Math.min(
        calculatedCognitiveLoad,
        100
      )
    );
  }, [
    movementCount,
    hesitationSeconds,
    fieldInteractions,
  ]);

  // ==========================================================
  // WEBSOCKET CONNECTION
  // ==========================================================

  useEffect(() => {
    console.log(
      "🔌 Connecting to AuraGen WebSocket..."
    );

    const socket =
      new WebSocket(WS_URL);

    socketRef.current =
      socket;

    socket.onopen = () => {
      console.log(
        "✅ AuraGen WebSocket connected"
      );

      setWebSocketConnected(
        true
      );

      setGenAIStatus(
        "Connected — monitoring interaction"
      );

      setGenAIError("");
    };

    socket.onmessage = (
      event
    ) => {
      try {
        const data =
          JSON.parse(
            event.data
          );

        console.log(
          "📨 AuraGen message:",
          data
        );

        setLastMessage(
          data.type ||
            "Server message received"
        );

        // ------------------------------------------------------
        // CONNECTION
        // ------------------------------------------------------

        if (
          data.type ===
          "connection"
        ) {
          setWebSocketConnected(
            true
          );

          return;
        }

        // ------------------------------------------------------
        // TELEMETRY ACK
        // ------------------------------------------------------

        if (
          data.type ===
          "telemetry_ack"
        ) {
          if (
            data.telemetry
          ) {
            if (
              typeof data.telemetry
                .frictionScore ===
              "number"
            ) {
              setFrictionScore(
                data.telemetry
                  .frictionScore
              );
            }

            if (
              typeof data.telemetry
                .cognitiveLoad ===
              "number"
            ) {
              setCognitiveLoad(
                data.telemetry
                  .cognitiveLoad
              );
            }
          }

          return;
        }

        // ------------------------------------------------------
        // AST VALIDATION ERROR
        // ------------------------------------------------------

        if (
          data.type ===
          "ast_validation_error"
        ) {
          console.error(
            "❌ AST validation rejected plan:",
            data
          );

          setGenAIStatus(
            "AI plan blocked by AST safety validation"
          );

          setGenAIError(
            data.error ||
              "Generated UI plan was rejected."
          );

          setSelfHealingActive(
            false
          );

          return;
        }

        // ------------------------------------------------------
        // GENAI VALIDATION ERROR
        // ------------------------------------------------------

        if (
          data.type ===
          "genai_validation_error"
        ) {
          console.error(
            "❌ GenAI plan validation failed:",
            data
          );

          setGenAIStatus(
            "AI plan failed final validation"
          );

          setGenAIError(
            data.error ||
              "Generated adaptation plan failed validation."
          );

          setSelfHealingActive(
            false
          );

          return;
        }

        // ------------------------------------------------------
        // GENAI ERROR
        // ------------------------------------------------------

        if (
          data.type ===
          "genai_error"
        ) {
          setGenAIStatus(
            "GenAI service unavailable"
          );

          setGenAIError(
            data.error ||
              "GenAI request failed."
          );

          return;
        }

        // ------------------------------------------------------
        // SERVER ERROR
        // ------------------------------------------------------

        if (
          data.type ===
          "server_error"
        ) {
          console.error(
            "❌ Server error:",
            data
          );

          setGenAIError(
            data.error ||
              "AuraGen server error."
          );

          return;
        }

        // ------------------------------------------------------
        // GENAI RESPONSE
        // ------------------------------------------------------

        if (
          data.type ===
          "genai_response"
        ) {
          const plan =
            data.plan as AdaptationPlan;

          setGenAIProvider(
            data.provider ||
              "Unknown"
          );

          setGenAIModel(
            data.model ||
              "Unknown"
          );

          setCurrentPlan(
            plan
          );

          setGenAIAction(
            plan.action ||
              "NO_ACTION"
          );

          setGenAIConfidence(
            typeof plan.confidence ===
              "number"
              ? plan.confidence
              : 0
          );

          setGenAIStatus(
            "AI plan validated successfully"
          );

          setGenAIError("");

          return;
        }

        // ------------------------------------------------------
        // ADAPTATION TRIGGER
        // ------------------------------------------------------

        if (
          data.type ===
          "adaptation_trigger"
        ) {
          const plan =
            data.plan as AdaptationPlan;

          setCurrentPlan(
            plan
          );

          setGenAIAction(
            plan.action ||
              "NO_ACTION"
          );

          setGenAIConfidence(
            typeof plan.confidence ===
              "number"
              ? plan.confidence
              : 0
          );

          setGenAIProvider(
            data.provider ||
              "Unknown"
          );

          setGenAIModel(
            data.model ||
              "Unknown"
          );

          setGenAIStatus(
            "Self-healing adaptation applied"
          );

          setGuidanceMessage(
            plan.guidance ||
              plan.reason ||
              ""
          );

          setSelfHealingActive(
            plan.action !==
              "NO_ACTION"
          );

          applyAdaptation(
            plan
          );

          const historyItem: AdaptationHistoryItem =
            {
              id:
                Date.now(),

              time:
                new Date().toLocaleTimeString(),

              friction:
                frictionScore,

              cognitiveLoad:
                cognitiveLoad,

              action:
                plan.action ||
                "NO_ACTION",

              confidence:
                plan.confidence ||
                0,

              provider:
                data.provider ||
                "Unknown",

              astValidated:
                data.validation
                  ?.ast === true,
            };

          setAdaptationHistory(
            (previous) => [
              historyItem,
              ...previous,
            ].slice(0, 10)
          );

          return;
        }
      } catch (error) {
        console.error(
          "❌ Invalid WebSocket message:",
          error
        );
      }
    };

    socket.onerror = (
      error
    ) => {
      console.error(
        "❌ AuraGen WebSocket connection failed.",
        error
      );

      setWebSocketConnected(
        false
      );

      setGenAIStatus(
        "WebSocket connection failed"
      );

      setGenAIError(
        "Unable to connect to AuraGen WebSocket server."
      );
    };

    socket.onclose = () => {
      console.log(
        "🔴 AuraGen WebSocket disconnected"
      );

      setWebSocketConnected(
        false
      );
    };

    return () => {
      socket.close();

      if (
        hesitationTimer.current
      ) {
        clearInterval(
          hesitationTimer.current
        );
      }

      if (
        telemetryThrottle.current
      ) {
        clearTimeout(
          telemetryThrottle.current
        );
      }
    };
  }, []);

  // ==========================================================
  // APPLY ADAPTATION
  // ==========================================================

  const applyAdaptation =
    useCallback(
      (
        plan: AdaptationPlan
      ) => {
        console.log(
          "🩹 Applying self-healing plan:",
          plan
        );

        if (
          plan.action ===
          "NO_ACTION"
        ) {
          return;
        }

        // ----------------------------------------------------
        // SHOW GUIDANCE
        // ----------------------------------------------------

        if (
          plan.action ===
          "SHOW_GUIDANCE"
        ) {
          setGuidanceMessage(
            plan.guidance ||
              plan.reason ||
              "Please continue carefully."
          );

          if (
            plan.targetField
          ) {
            const target =
              plan.targetField as FieldName;

            setHighlightedField(
              target
            );
          }

          return;
        }

        // ----------------------------------------------------
        // HIGHLIGHT FIELD
        // ----------------------------------------------------

        if (
          plan.action ===
          "HIGHLIGHT_FIELD"
        ) {
          if (
            plan.targetField
          ) {
            setHighlightedField(
              plan.targetField as FieldName
            );
          }

          setGuidanceMessage(
            plan.guidance ||
              "Please review the highlighted field."
          );

          return;
        }

        // ----------------------------------------------------
        // SIMPLIFY FORM
        // ----------------------------------------------------

        if (
          plan.action ===
          "SIMPLIFY_FORM"
        ) {
          setShowAdvancedFields(
            false
          );

          setFieldVisibility(
            (previous) => {
              const updated = {
                ...previous,
              };

              plan.changes?.forEach(
                (change) => {
                  if (
                    change.field &&
                    change.type ===
                      "HIDE_FIELD"
                  ) {
                    updated[
                      change.field
                    ] = false;
                  }

                  if (
                    change.field &&
                    change.type ===
                      "SHOW_FIELD"
                  ) {
                    updated[
                      change.field
                    ] = true;
                  }
                }
              );

              return updated;
            }
          );

          setGuidanceMessage(
            plan.guidance ||
              "The form has been simplified to reduce interaction difficulty."
          );

          if (
            plan.targetField
          ) {
            setHighlightedField(
              plan.targetField as FieldName
            );
          }

          return;
        }

        // ----------------------------------------------------
        // HIDE ADVANCED FIELDS
        // ----------------------------------------------------

        if (
          plan.action ===
          "HIDE_ADVANCED_FIELDS"
        ) {
          setShowAdvancedFields(
            false
          );

          setGuidanceMessage(
            plan.guidance ||
              "Advanced fields have been temporarily hidden."
          );

          return;
        }

        // ----------------------------------------------------
        // APPLY INDIVIDUAL CHANGES
        // ----------------------------------------------------

        plan.changes?.forEach(
          (change) => {
            if (
              !change.field
            ) {
              return;
            }

            if (
              change.type ===
              "HIDE_FIELD"
            ) {
              setFieldVisibility(
                (previous) => ({
                  ...previous,
                  [change.field!]:
                    false,
                })
              );
            }

            if (
              change.type ===
              "SHOW_FIELD"
            ) {
              setFieldVisibility(
                (previous) => ({
                  ...previous,
                  [change.field!]:
                    true,
                })
              );
            }

            if (
              change.type ===
              "HIGHLIGHT_FIELD"
            ) {
              setHighlightedField(
                change.field
              );
            }
          }
        );
      },
      []
    );

  // ==========================================================
  // SEND TELEMETRY
  // ==========================================================

  const sendTelemetry =
    useCallback(
      (
        override?: {
          friction?: number;
          cognitiveLoad?: number;
          movementCount?: number;
          hesitation?: number;
          activeField?: FieldName | null;
        }
      ) => {
        const socket =
          socketRef.current;

        if (
          !socket ||
          socket.readyState !==
            WebSocket.OPEN
        ) {
          return;
        }

        const payload = {
          type: "telemetry",

          activeField:
            override?.activeField ??
            activeField,

          movementCount:
            override?.movementCount ??
            movementCount,

          totalMovementDistance,

          frictionScore:
            override?.friction ??
            frictionScore,

          cognitiveLoad:
            override?.cognitiveLoad ??
            cognitiveLoad,

          hesitationSeconds:
            override?.hesitation ??
            hesitationSeconds,

          isHesitating,

          fieldInteractions,

          timestamp:
            Date.now(),
        };

        console.log(
          "📡 Sending telemetry:",
          payload
        );

        socket.send(
          JSON.stringify(
            payload
          )
        );
      },
      [
        activeField,
        movementCount,
        totalMovementDistance,
        frictionScore,
        cognitiveLoad,
        hesitationSeconds,
        isHesitating,
        fieldInteractions,
      ]
    );

  // ==========================================================
  // PERIODIC TELEMETRY
  // ==========================================================

  useEffect(() => {
    if (
      !webSocketConnected
    ) {
      return;
    }

    if (
      telemetryThrottle.current
    ) {
      clearTimeout(
        telemetryThrottle.current
      );
    }

    telemetryThrottle.current =
      setTimeout(() => {
        sendTelemetry();
      }, 1200);

    return () => {
      if (
        telemetryThrottle.current
      ) {
        clearTimeout(
          telemetryThrottle.current
        );
      }
    };
  }, [
    movementCount,
    activeField,
    hesitationSeconds,
    webSocketConnected,
    sendTelemetry,
  ]);

  // ==========================================================
  // SIMULATE HIGH COGNITIVE LOAD
  // ==========================================================

  const simulateHighCognitiveLoad =
    () => {
      console.log(
        "⚡ SIMULATING HIGH COGNITIVE LOAD"
      );

      setIsDemoMode(
        true
      );

      const simulatedFriction =
        85;

      const simulatedCognitiveLoad =
        88;

      const simulatedMovementCount =
        movementCount + 150;

      setFrictionScore(
        simulatedFriction
      );

      setCognitiveLoad(
        simulatedCognitiveLoad
      );

      setActiveField(
        "investmentAmount"
      );

      setMovementCount(
        simulatedMovementCount
      );

      setHesitationSeconds(
        8
      );

      setIsHesitating(
        true
      );

      setFieldInteractions(
        (previous) => ({
          ...previous,
          investmentAmount:
            (previous.investmentAmount ||
              0) + 15,
        })
      );

      setGenAIStatus(
        "High cognitive load simulated — requesting adaptation"
      );

      setGenAIError("");

      const simulatedTelemetry =
        {
          type: "telemetry",

          activeField:
            "investmentAmount",

          movementCount:
            291,

          totalMovementDistance:
            2500,

          frictionScore:
            simulatedFriction,

          cognitiveLoad:
            simulatedCognitiveLoad,

          hesitationSeconds:
            8,

          isHesitating:
            true,

          fieldInteractions: {
            annualIncome: 2,
            taxId: 4,
            investmentAmount: 15,
            taxCategory: 3,
          },

          timestamp:
            Date.now(),
        };

      const socket =
        socketRef.current;

      if (
        socket &&
        socket.readyState ===
          WebSocket.OPEN
      ) {
        socket.send(
          JSON.stringify(
            simulatedTelemetry
          )
        );

        console.log(
          "📡 Simulated high-load telemetry sent"
        );
      } else {
        setGenAIError(
          "WebSocket is not connected."
        );

        console.error(
          "❌ WebSocket is not connected"
        );
      }
    };

  // ==========================================================
  // RESTORE UI
  // ==========================================================

  const restoreUI =
    () => {
      setFieldVisibility(
        DEFAULT_VISIBILITY
      );

      setShowAdvancedFields(
        true
      );

      setHighlightedField(
        null
      );

      setGuidanceMessage(
        ""
      );

      setSelfHealingActive(
        false
      );

      setCurrentPlan(
        null
      );

      setGenAIAction(
        "NO_ACTION"
      );

      setGenAIConfidence(
        0
      );

      setGenAIStatus(
        "Monitoring user interaction"
      );

      setGenAIError("");

      setIsDemoMode(
        false
      );

      setIsHesitating(
        false
      );

      setHesitationSeconds(
        0
      );

      console.log(
        "↩️ AuraGen UI restored"
      );
    };

  // ==========================================================
  // FORM SUBMIT
  // ==========================================================

  const handleSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setFormSubmitted(
      true
    );

    setGuidanceMessage(
      "Form submitted successfully."
    );

    setTimeout(() => {
      setFormSubmitted(
        false
      );
    }, 3000);
  };

  // ==========================================================
  // SCORE HELPERS
  // ==========================================================

  const getScoreLabel =
    (score: number) => {
      if (score >= 70) {
        return "HIGH";
      }

      if (score >= 40) {
        return "MEDIUM";
      }

      return "LOW";
    };

  const getScoreClass =
    (score: number) => {
      if (score >= 70) {
        return "score-high";
      }

      if (score >= 40) {
        return "score-medium";
      }

      return "score-low";
    };

  // ==========================================================
  // FIELD CLASS
  // ==========================================================

  const fieldClass = (
    field: FieldName
  ) => {
    const classes =
      ["field-input"];

    if (
      highlightedField ===
      field
    ) {
      classes.push(
        "field-highlight"
      );
    }

    return classes.join(" ");
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f4f7fb;
          color: #172033;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .auragen-app {
          min-height: 100vh;
          display: flex;
          background: #f4f7fb;
        }

        /* ================================================
           SIDEBAR
        ================================================ */

        .sidebar {
          width: 250px;
          min-height: 100vh;
          background:
            linear-gradient(
              180deg,
              #111827 0%,
              #0f172a 100%
            );
          color: white;
          padding: 24px 16px;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 20;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 10px 28px;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #6366f1,
              #8b5cf6
            );
          font-size: 20px;
          box-shadow:
            0 8px 25px
              rgba(
                99,
                102,
                241,
                0.35
              );
        }

        .brand-title {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }

        .brand-subtitle {
          color: #94a3b8;
          font-size: 11px;
          margin-top: 2px;
        }

        .nav-label {
          padding: 0 10px;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 10px 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          margin: 4px 0;
          border-radius: 9px;
          color: #94a3b8;
          font-size: 13px;
          transition: 0.2s;
        }

        .nav-item.active,
        .nav-item:hover {
          color: white;
          background: rgba(
            255,
            255,
            255,
            0.07
          );
        }

        .nav-item.active {
          box-shadow:
            inset 3px 0 0
              #818cf8;
        }

        .sidebar-bottom {
          position: absolute;
          bottom: 22px;
          left: 16px;
          right: 16px;
        }

        .connection-card {
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
          background: rgba(
            255,
            255,
            255,
            0.04
          );
          padding: 13px;
          border-radius: 10px;
        }

        .connection-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
        }

        .status-dot.connected {
          background: #22c55e;
          box-shadow:
            0 0 0 4px
              rgba(
                34,
                197,
                94,
                0.12
              );
        }

        .connection-small {
          color: #64748b;
          font-size: 10px;
          margin-top: 7px;
        }

        /* ================================================
           MAIN
        ================================================ */

        .main {
          margin-left: 250px;
          width: calc(100% - 250px);
          min-height: 100vh;
        }

        .topbar {
          height: 74px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .page-title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        .page-description {
          color: #64748b;
          font-size: 12px;
          margin-top: 3px;
        }

        .topbar-status {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 700;
        }

        .content {
          padding: 28px 30px 40px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ================================================
           DEMO BANNER
        ================================================ */

        .demo-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 20px;
          margin-bottom: 24px;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #eef2ff,
              #f5f3ff
            );
          border: 1px solid #ddd6fe;
        }

        .demo-title {
          font-size: 14px;
          font-weight: 800;
          color: #312e81;
        }

        .demo-text {
          font-size: 12px;
          color: #6366f1;
          margin-top: 4px;
        }

        .demo-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .demo-button {
          border: none;
          border-radius: 9px;
          padding: 10px 15px;
          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #7c3aed
            );
          color: white;
          font-size: 12px;
          font-weight: 800;
          box-shadow:
            0 5px 16px
              rgba(
                79,
                70,
                229,
                0.2
              );
        }

        .restore-button {
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          padding: 10px 15px;
          background: white;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
        }

        /* ================================================
           METRICS
        ================================================ */

        .metrics-grid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 16px;
          margin-bottom: 22px;
        }

        .metric-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 19px;
          box-shadow:
            0 2px 8px
              rgba(
                15,
                23,
                42,
                0.03
              );
        }

        .metric-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .metric-name {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .metric-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f1f5f9;
        }

        .metric-value {
          font-size: 30px;
          font-weight: 850;
          margin-top: 12px;
          letter-spacing: -1px;
        }

        .metric-footer {
          margin-top: 5px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #94a3b8;
          font-size: 11px;
        }

        .score-high {
          color: #dc2626;
        }

        .score-medium {
          color: #d97706;
        }

        .score-low {
          color: #16a34a;
        }

        /* ================================================
           GRID
        ================================================ */

        .dashboard-grid {
          display: grid;
          grid-template-columns:
            minmax(
              0,
              1.25fr
            )
            minmax(
              360px,
              0.75fr
            );
          gap: 20px;
          align-items: start;
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow:
            0 2px 8px
              rgba(
                15,
                23,
                42,
                0.03
              );
          overflow: hidden;
        }

        .card-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-title {
          font-size: 14px;
          font-weight: 800;
        }

        .card-subtitle {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 3px;
        }

        .card-body {
          padding: 20px;
        }

        /* ================================================
           FORM
        ================================================ */

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 17px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field-label {
          font-size: 11px;
          color: #475569;
          font-weight: 800;
        }

        .field-input {
          width: 100%;
          height: 42px;
          border: 1px solid #dbe2ea;
          border-radius: 9px;
          padding: 0 12px;
          outline: none;
          background: #fff;
          color: #172033;
          transition: 0.2s;
          font-size: 13px;
        }

        .field-input:focus {
          border-color: #818cf8;
          box-shadow:
            0 0 0 3px
              rgba(
                99,
                102,
                241,
                0.1
              );
        }

        .field-highlight {
          border-color: #f59e0b !important;
          background: #fffbeb;
          box-shadow:
            0 0 0 3px
              rgba(
                245,
                158,
                11,
                0.12
              );
        }

        .form-actions {
          margin-top: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .submit-button {
          border: none;
          background: #172033;
          color: white;
          padding: 11px 18px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 800;
        }

        .submitted-message {
          color: #16a34a;
          font-size: 11px;
          font-weight: 700;
        }

        /* ================================================
           GUIDANCE
        ================================================ */

        .guidance {
          margin-bottom: 18px;
          padding: 13px 15px;
          border-radius: 10px;
          border: 1px solid #fde68a;
          background: #fffbeb;
          color: #92400e;
          font-size: 12px;
          line-height: 1.5;
        }

        .self-healing-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-size: 10px;
          font-weight: 800;
        }

        .self-healing-badge.active {
          background: #ede9fe;
          color: #6d28d9;
        }

        /* ================================================
           AI PANEL
        ================================================ */

        .ai-status {
          padding: 13px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          margin-bottom: 16px;
        }

        .ai-status-title {
          font-size: 11px;
          color: #64748b;
          font-weight: 800;
          text-transform: uppercase;
        }

        .ai-status-text {
          font-size: 12px;
          color: #334155;
          margin-top: 5px;
          line-height: 1.5;
        }

        .ai-error {
          padding: 10px 12px;
          border-radius: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 11px;
          margin-bottom: 14px;
        }

        .ai-info-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 10px;
        }

        .info-box {
          border: 1px solid #eef2f7;
          border-radius: 9px;
          padding: 11px;
          background: #fbfdff;
        }

        .info-label {
          color: #94a3b8;
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.6px;
        }

        .info-value {
          margin-top: 5px;
          color: #172033;
          font-size: 12px;
          font-weight: 800;
          word-break: break-word;
        }

        .confidence-bar {
          margin-top: 7px;
          height: 5px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          background:
            linear-gradient(
              90deg,
              #6366f1,
              #8b5cf6
            );
          border-radius: 999px;
        }

        /* ================================================
           TELEMETRY
        ================================================ */

        .telemetry-list {
          display: grid;
          gap: 9px;
        }

        .telemetry-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .telemetry-row:last-child {
          border-bottom: none;
        }

        .telemetry-name {
          color: #64748b;
          font-size: 11px;
        }

        .telemetry-value {
          color: #172033;
          font-size: 12px;
          font-weight: 800;
        }

        /* ================================================
           HISTORY
        ================================================ */

        .history-list {
          display: grid;
          gap: 8px;
        }

        .history-item {
          display: grid;
          grid-template-columns:
            70px
            1fr
            70px;
          gap: 10px;
          align-items: center;
          padding: 10px;
          background: #f8fafc;
          border-radius: 9px;
          border: 1px solid #eef2f7;
        }

        .history-time {
          font-size: 10px;
          color: #94a3b8;
        }

        .history-action {
          font-size: 11px;
          font-weight: 800;
          color: #334155;
        }

        .history-meta {
          font-size: 9px;
          color: #94a3b8;
          margin-top: 2px;
        }

        .history-confidence {
          text-align: right;
          font-size: 11px;
          font-weight: 800;
          color: #6366f1;
        }

        .empty-history {
          padding: 22px;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
        }

        /* ================================================
           PIPELINE
        ================================================ */

        .pipeline {
          display: flex;
          align-items: center;
          gap: 7px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .pipeline-step {
          min-width: 92px;
          padding: 10px 8px;
          text-align: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
        }

        .pipeline-icon {
          font-size: 16px;
        }

        .pipeline-name {
          margin-top: 4px;
          color: #475569;
          font-size: 9px;
          font-weight: 800;
        }

        .pipeline-arrow {
          color: #94a3b8;
          font-size: 12px;
        }

        /* ================================================
           FOOTER
        ================================================ */

        .footer-note {
          margin-top: 22px;
          padding: 15px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        .footer-note strong {
          color: #334155;
        }

        /* ================================================
           RESPONSIVE
        ================================================ */

        @media (max-width: 1200px) {
          .metrics-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .dashboard-grid {
            grid-template-columns:
              1fr;
          }
        }

        @media (max-width: 850px) {
          .sidebar {
            width: 70px;
            padding: 18px 8px;
          }

          .brand {
            justify-content: center;
            padding-left: 0;
            padding-right: 0;
          }

          .brand-text,
          .nav-label,
          .nav-text,
          .connection-card {
            display: none;
          }

          .nav-item {
            justify-content: center;
            padding: 12px 8px;
          }

          .main {
            margin-left: 70px;
            width: calc(
              100% - 70px
            );
          }

          .topbar {
            padding: 0 18px;
          }

          .content {
            padding: 20px 18px;
          }
        }

        @media (max-width: 600px) {
          .metrics-grid {
            grid-template-columns:
              1fr;
          }

          .form-grid {
            grid-template-columns:
              1fr;
          }

          .demo-banner {
            flex-direction: column;
            align-items: flex-start;
          }

          .topbar {
            height: auto;
            padding-top: 14px;
            padding-bottom: 14px;
            gap: 10px;
          }

          .page-title {
            font-size: 17px;
          }

          .topbar-status {
            display: none;
          }
        }
      `}</style>

      <div className="auragen-app">

        {/* ==================================================
            SIDEBAR
        ================================================== */}

        <aside className="sidebar">

          <div className="brand">

            <div className="brand-icon">
              ✦
            </div>

            <div className="brand-text">

              <div className="brand-title">
                AuraGen
              </div>

              <div className="brand-subtitle">
                Generative UX Intelligence
              </div>

            </div>

          </div>

          <div className="nav-label">
            Workspace
          </div>

          <div className="nav-item active">
            <span>▦</span>
            <span className="nav-text">
              Cognitive Dashboard
            </span>
          </div>

          <div className="nav-item">
            <span>◉</span>
            <span className="nav-text">
              Interaction Telemetry
            </span>
          </div>

          <div className="nav-item">
            <span>✦</span>
            <span className="nav-text">
              Generative AI
            </span>
          </div>

          <div className="nav-item">
            <span>◇</span>
            <span className="nav-text">
              Self-Healing UI
            </span>
          </div>

          <div className="nav-label">
            System
          </div>

          <div className="nav-item">
            <span>⚙</span>
            <span className="nav-text">
              Configuration
            </span>
          </div>

          <div className="nav-item">
            <span>▤</span>
            <span className="nav-text">
              Project Status
            </span>
          </div>

          <div className="sidebar-bottom">

            <div className="connection-card">

              <div className="connection-row">

                <span
                  className={`status-dot ${
                    webSocketConnected
                      ? "connected"
                      : ""
                  }`}
                />

                <span>
                  {webSocketConnected
                    ? "Backend Connected"
                    : "Backend Offline"}
                </span>

              </div>

              <div className="connection-small">
                ws://127.0.0.1:3001
              </div>

            </div>

          </div>

        </aside>

        {/* ==================================================
            MAIN
        ================================================== */}

        <main className="main">

          {/* TOP BAR */}

          <header className="topbar">

            <div>

              <div className="page-title">
                Cognitive UX Dashboard
              </div>

              <div className="page-description">
                Real-time interaction intelligence
                and adaptive UI orchestration
              </div>

            </div>

            <div className="topbar-status">

              <span
                className={`status-dot ${
                  webSocketConnected
                    ? "connected"
                    : ""
                }`}
              />

              {webSocketConnected
                ? "Live Connection"
                : "Disconnected"}

            </div>

          </header>

          <section className="content">

            {/* ==================================================
                DEMO CONTROL
            ================================================== */}

            <div className="demo-banner">

              <div>

                <div className="demo-title">
                  AuraGen Demonstration Mode
                </div>

                <div className="demo-text">
                  Simulate difficult interaction
                  to trigger the self-healing
                  Generative UI pipeline.
                </div>

              </div>

              <div className="demo-actions">

                <button
                  type="button"
                  className="demo-button"
                  onClick={
                    simulateHighCognitiveLoad
                  }
                >
                  ⚡ Simulate High Cognitive Load
                </button>

                <button
                  type="button"
                  className="restore-button"
                  onClick={restoreUI}
                >
                  ↩ Restore UI
                </button>

              </div>

            </div>

            {/* ==================================================
                METRICS
            ================================================== */}

            <div className="metrics-grid">

              {/* FRICTION */}

              <div className="metric-card">

                <div className="metric-header">

                  <div className="metric-name">
                    Friction Score
                  </div>

                  <div className="metric-icon">
                    ◉
                  </div>

                </div>

                <div
                  className={`metric-value ${getScoreClass(
                    frictionScore
                  )}`}
                >
                  {frictionScore}
                </div>

                <div className="metric-footer">

                  <span>
                    Interaction difficulty
                  </span>

                  <strong
                    className={getScoreClass(
                      frictionScore
                    )}
                  >
                    {getScoreLabel(
                      frictionScore
                    )}
                  </strong>

                </div>

              </div>

              {/* COGNITIVE LOAD */}

              <div className="metric-card">

                <div className="metric-header">

                  <div className="metric-name">
                    Cognitive Load
                  </div>

                  <div className="metric-icon">
                    🧠
                  </div>

                </div>

                <div
                  className={`metric-value ${getScoreClass(
                    cognitiveLoad
                  )}`}
                >
                  {cognitiveLoad}
                </div>

                <div className="metric-footer">

                  <span>
                    Estimated user effort
                  </span>

                  <strong
                    className={getScoreClass(
                      cognitiveLoad
                    )}
                  >
                    {getScoreLabel(
                      cognitiveLoad
                    )}
                  </strong>

                </div>

              </div>

              {/* MOUSE EVENTS */}

              <div className="metric-card">

                <div className="metric-header">

                  <div className="metric-name">
                    Mouse Events
                  </div>

                  <div className="metric-icon">
                    🖱
                  </div>

                </div>

                <div className="metric-value">
                  {movementCount}
                </div>

                <div className="metric-footer">

                  <span>
                    Total tracked movements
                  </span>

                  <span>
                    {Math.round(
                      totalMovementDistance
                    )} px
                  </span>

                </div>

              </div>

              {/* SELF HEALING */}

              <div className="metric-card">

                <div className="metric-header">

                  <div className="metric-name">
                    Self-Healing
                  </div>

                  <div className="metric-icon">
                    ✦
                  </div>

                </div>

                <div
                  className={`metric-value ${
                    selfHealingActive
                      ? "score-medium"
                      : "score-low"
                  }`}
                >
                  {selfHealingActive
                    ? "ACTIVE"
                    : "READY"}
                </div>

                <div className="metric-footer">

                  <span>
                    Adaptive UI engine
                  </span>

                  <strong>
                    {selfHealingActive
                      ? "ADAPTING"
                      : "MONITORING"}
                  </strong>

                </div>

              </div>

            </div>

            {/* ==================================================
                MAIN DASHBOARD GRID
            ================================================== */}

            <div className="dashboard-grid">

              {/* =================================================
                  LEFT SIDE
              ================================================= */}

              <div>

                {/* FINANCIAL FORM */}

                <div className="card">

                  <div className="card-header">

                    <div>

                      <div className="card-title">
                        Adaptive Financial Form
                      </div>

                      <div className="card-subtitle">
                        AuraGen monitors interaction
                        friction while you complete
                        this workflow.
                      </div>

                    </div>

                    <div
                      className={`self-healing-badge ${
                        selfHealingActive
                          ? "active"
                          : ""
                      }`}
                    >
                      {selfHealingActive
                        ? "✦ Self-Healing Active"
                        : "● Adaptive Ready"}
                    </div>

                  </div>

                  <div className="card-body">

                    {guidanceMessage && (
                      <div className="guidance">
                        <strong>
                          AuraGen Guidance:
                        </strong>{" "}
                        {guidanceMessage}
                      </div>
                    )}

                    <form
                      onSubmit={
                        handleSubmit
                      }
                    >

                      <div className="form-grid">

                        {/* ANNUAL INCOME */}

                        {fieldVisibility
                          .annualIncome && (
                          <div className="field-group">

                            <label className="field-label">
                              Annual Income
                            </label>

                            <input
                              className={fieldClass(
                                "annualIncome"
                              )}
                              type="number"
                              value={
                                annualIncome
                              }
                              onChange={(
                                event
                              ) =>
                                setAnnualIncome(
                                  event.target
                                    .value
                                )
                              }
                              onFocus={() =>
                                handleFieldFocus(
                                  "annualIncome"
                                )
                              }
                              onBlur={
                                handleFieldBlur
                              }
                              placeholder="Enter annual income"
                            />

                          </div>
                        )}

                        {/* TAX ID */}

                        {fieldVisibility
                          .taxId && (
                          <div className="field-group">

                            <label className="field-label">
                              Tax Identification Number
                            </label>

                            <input
                              className={fieldClass(
                                "taxId"
                              )}
                              type="text"
                              value={
                                taxId
                              }
                              onChange={(
                                event
                              ) =>
                                setTaxId(
                                  event.target
                                    .value
                                )
                              }
                              onFocus={() =>
                                handleFieldFocus(
                                  "taxId"
                                )
                              }
                              onBlur={
                                handleFieldBlur
                              }
                              placeholder="Enter tax ID"
                            />

                          </div>
                        )}

                        {/* INVESTMENT */}

                        {fieldVisibility
                          .investmentAmount &&
                          showAdvancedFields && (
                            <div className="field-group">

                              <label className="field-label">
                                Investment Amount
                              </label>

                              <input
                                className={fieldClass(
                                  "investmentAmount"
                                )}
                                type="number"
                                value={
                                  investmentAmount
                                }
                                onChange={(
                                  event
                                ) =>
                                  setInvestmentAmount(
                                    event.target
                                      .value
                                  )
                                }
                                onFocus={() =>
                                  handleFieldFocus(
                                    "investmentAmount"
                                  )
                                }
                                onBlur={
                                  handleFieldBlur
                                }
                                placeholder="Enter investment amount"
                              />

                            </div>
                          )}

                        {/* TAX CATEGORY */}

                        {fieldVisibility
                          .taxCategory && (
                          <div className="field-group">

                            <label className="field-label">
                              Tax Category
                            </label>

                            <select
                              className={fieldClass(
                                "taxCategory"
                              )}
                              value={
                                taxCategory
                              }
                              onChange={(
                                event
                              ) =>
                                setTaxCategory(
                                  event.target
                                    .value
                                )
                              }
                              onFocus={() =>
                                handleFieldFocus(
                                  "taxCategory"
                                )
                              }
                              onBlur={
                                handleFieldBlur
                              }
                            >

                              <option value="">
                                Select category
                              </option>

                              <option value="individual">
                                Individual
                              </option>

                              <option value="professional">
                                Professional
                              </option>

                              <option value="business">
                                Business
                              </option>

                            </select>

                          </div>
                        )}

                      </div>

                      <div className="form-actions">

                        <button
                          className="submit-button"
                          type="submit"
                        >
                          Submit Financial Details
                        </button>

                        {formSubmitted && (
                          <span className="submitted-message">
                            ✓ Form submitted successfully
                          </span>
                        )}

                      </div>

                    </form>

                  </div>

                </div>

                {/* LIVE TELEMETRY */}

                <div
                  className="card"
                  style={{
                    marginTop: 20,
                  }}
                >

                  <div className="card-header">

                    <div>

                      <div className="card-title">
                        Live Interaction Telemetry
                      </div>

                      <div className="card-subtitle">
                        Real-time behavioural signals
                      </div>

                    </div>

                    <span className="self-healing-badge">
                      ● Live
                    </span>

                  </div>

                  <div className="card-body">

                    <div className="telemetry-list">

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          Active Field
                        </span>

                        <span className="telemetry-value">
                          {activeField ||
                            "None"}
                        </span>

                      </div>

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          Movement Count
                        </span>

                        <span className="telemetry-value">
                          {movementCount}
                        </span>

                      </div>

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          Movement Distance
                        </span>

                        <span className="telemetry-value">
                          {Math.round(
                            totalMovementDistance
                          )} px
                        </span>

                      </div>

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          Hesitation
                        </span>

                        <span className="telemetry-value">
                          {hesitationSeconds}s
                          {isHesitating
                            ? " • Detected"
                            : ""}
                        </span>

                      </div>

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          Field Interactions
                        </span>

                        <span className="telemetry-value">
                          {Object.values(
                            fieldInteractions
                          ).reduce(
                            (
                              total,
                              value
                            ) =>
                              total +
                              value,
                            0
                          )}
                        </span>

                      </div>

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          Last Server Event
                        </span>

                        <span className="telemetry-value">
                          {lastMessage}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

                {/* ARCHITECTURE */}

                <div
                  className="card"
                  style={{
                    marginTop: 20,
                  }}
                >

                  <div className="card-header">

                    <div>

                      <div className="card-title">
                        AuraGen Architecture
                      </div>

                      <div className="card-subtitle">
                        End-to-end self-healing
                        pipeline
                      </div>

                    </div>

                  </div>

                  <div className="card-body">

                    <div className="pipeline">

                      <div className="pipeline-step">
                        <div className="pipeline-icon">
                          👤
                        </div>
                        <div className="pipeline-name">
                          User
                        </div>
                      </div>

                      <div className="pipeline-arrow">
                        →
                      </div>

                      <div className="pipeline-step">
                        <div className="pipeline-icon">
                          🖱
                        </div>
                        <div className="pipeline-name">
                          Telemetry
                        </div>
                      </div>

                      <div className="pipeline-arrow">
                        →
                      </div>

                      <div className="pipeline-step">
                        <div className="pipeline-icon">
                          📊
                        </div>
                        <div className="pipeline-name">
                          Friction
                        </div>
                      </div>

                      <div className="pipeline-arrow">
                        →
                      </div>

                      <div className="pipeline-step">
                        <div className="pipeline-icon">
                          🧠
                        </div>
                        <div className="pipeline-name">
                          GenAI
                        </div>
                      </div>

                      <div className="pipeline-arrow">
                        →
                      </div>

                      <div className="pipeline-step">
                        <div className="pipeline-icon">
                          🌳
                        </div>
                        <div className="pipeline-name">
                          AST Safety
                        </div>
                      </div>

                      <div className="pipeline-arrow">
                        →
                      </div>

                      <div className="pipeline-step">
                        <div className="pipeline-icon">
                          🛡️
                        </div>
                        <div className="pipeline-name">
                          Validation
                        </div>
                      </div>

                      <div className="pipeline-arrow">
                        →
                      </div>

                      <div className="pipeline-step">
                        <div className="pipeline-icon">
                          ✦
                        </div>
                        <div className="pipeline-name">
                          Self-Healing
                        </div>
                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* =================================================
                  RIGHT SIDE
              ================================================= */}

              <div>

                {/* GENAI PANEL */}

                <div className="card">

                  <div className="card-header">

                    <div>

                      <div className="card-title">
                        Generative AI Adaptation
                      </div>

                      <div className="card-subtitle">
                        AI-generated UI decision
                      </div>

                    </div>

                    <span className="self-healing-badge">
                      AI
                    </span>

                  </div>

                  <div className="card-body">

                    <div className="ai-status">

                      <div className="ai-status-title">
                        Current Status
                      </div>

                      <div className="ai-status-text">
                        {genAIStatus}
                      </div>

                    </div>

                    {genAIError && (
                      <div className="ai-error">
                        {genAIError}
                      </div>
                    )}

                    <div className="ai-info-grid">

                      <div className="info-box">

                        <div className="info-label">
                          Provider
                        </div>

                        <div className="info-value">
                          {genAIProvider}
                        </div>

                      </div>

                      <div className="info-box">

                        <div className="info-label">
                          Model
                        </div>

                        <div className="info-value">
                          {genAIModel}
                        </div>

                      </div>

                      <div className="info-box">

                        <div className="info-label">
                          Action
                        </div>

                        <div className="info-value">
                          {genAIAction}
                        </div>

                      </div>

                      <div className="info-box">

                        <div className="info-label">
                          Confidence
                        </div>

                        <div className="info-value">
                          {Math.round(
                            genAIConfidence *
                              100
                          )}
                          %
                        </div>

                        <div className="confidence-bar">

                          <div
                            className="confidence-fill"
                            style={{
                              width: `${Math.min(
                                genAIConfidence *
                                  100,
                                100
                              )}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>

                    {currentPlan && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: 12,
                          background:
                            "#f8fafc",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius: 9,
                        }}
                      >

                        <div
                          style={{
                            fontSize: 9,
                            color:
                              "#94a3b8",
                            fontWeight: 800,
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "0.6px",
                          }}
                        >
                          Approved Adaptation
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {currentPlan.action}
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 11,
                            color:
                              "#64748b",
                            lineHeight: 1.5,
                          }}
                        >
                          {currentPlan.reason ||
                            currentPlan.guidance ||
                            "No additional explanation."}
                        </div>

                      </div>
                    )}

                  </div>

                </div>

                {/* SECURITY PIPELINE */}

                <div
                  className="card"
                  style={{
                    marginTop: 20,
                  }}
                >

                  <div className="card-header">

                    <div>

                      <div className="card-title">
                        AI Safety Pipeline
                      </div>

                      <div className="card-subtitle">
                        Generated plans are validated
                        before UI application
                      </div>

                    </div>

                  </div>

                  <div className="card-body">

                    <div className="telemetry-list">

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          Generative AI
                        </span>

                        <strong className="score-low">
                          ✓ RECEIVED
                        </strong>

                      </div>

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          AST Validation
                        </span>

                        <strong
                          className={
                            currentPlan
                              ? "score-low"
                              : "score-medium"
                          }
                        >
                          {currentPlan
                            ? "✓ PASSED"
                            : "READY"}
                        </strong>

                      </div>

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          Plan Validation
                        </span>

                        <strong
                          className={
                            currentPlan
                              ? "score-low"
                              : "score-medium"
                          }
                        >
                          {currentPlan
                            ? "✓ PASSED"
                            : "READY"}
                        </strong>

                      </div>

                      <div className="telemetry-row">

                        <span className="telemetry-name">
                          UI Application
                        </span>

                        <strong
                          className={
                            selfHealingActive
                              ? "score-low"
                              : "score-medium"
                          }
                        >
                          {selfHealingActive
                            ? "✓ APPLIED"
                            : "WAITING"}
                        </strong>

                      </div>

                    </div>

                  </div>

                </div>

                {/* ADAPTATION HISTORY */}

                <div
                  className="card"
                  style={{
                    marginTop: 20,
                  }}
                >

                  <div className="card-header">

                    <div>

                      <div className="card-title">
                        Adaptation History
                      </div>

                      <div className="card-subtitle">
                        Recent self-healing events
                      </div>

                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        color:
                          "#94a3b8",
                      }}
                    >
                      {adaptationHistory.length} events
                    </span>

                  </div>

                  <div className="card-body">

                    {adaptationHistory.length ===
                    0 ? (
                      <div className="empty-history">
                        No adaptations yet.
                        <br />
                        Run the cognitive-load
                        simulation to create an event.
                      </div>
                    ) : (
                      <div className="history-list">

                        {adaptationHistory.map(
                          (item) => (
                            <div
                              className="history-item"
                              key={
                                item.id
                              }
                            >

                              <div className="history-time">
                                {item.time}
                              </div>

                              <div>

                                <div className="history-action">
                                  {item.action}
                                </div>

                                <div className="history-meta">
                                  F:
                                  {" "}
                                  {item.friction}
                                  {" • "}
                                  CL:
                                  {" "}
                                  {item.cognitiveLoad}
                                  {" • "}
                                  {item.astValidated
                                    ? "AST ✓"
                                    : "AST —"}
                                </div>

                              </div>

                              <div className="history-confidence">
                                {Math.round(
                                  item.confidence *
                                    100
                                )}
                                %
                              </div>

                            </div>
                          )
                        )}

                      </div>
                    )}

                  </div>

                </div>

              </div>

            </div>

            {/* ==================================================
                FOOTER NOTE
            ================================================== */}

            <div className="footer-note">

              <strong>
                AuraGen Safety Principle:
              </strong>{" "}
              Generative AI does not directly execute
              generated code. AuraGen converts the AI
              response into a constrained UI adaptation
              plan, performs structural/AST validation and
              final plan validation, and only then applies
              approved interface changes.

              <br />

              <strong>
                Current GenAI Mode:
              </strong>{" "}
              Gemini when available, with the
              safe deterministic mock fallback when
              the Gemini API quota is unavailable.

            </div>

          </section>

        </main>

      </div>
    </>
  );
}
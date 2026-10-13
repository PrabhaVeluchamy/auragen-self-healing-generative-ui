# AuraGen

AuraGen: Self-Healing Generative UI via Cognitive Load.

## Architecture

User
  ↓
React / Next.js UI
  ↓
Mouse + field interaction telemetry
  ↓
Friction / Cognitive Load calculation
  ↓
WebSocket
  ↓
Node.js telemetry handler
  ↓
Decision service
  ↓
GenAI context
  ↓
GenAI prompt
  ↓
Future LLM integration
  ↓
Adaptive UI

## Requirements

- Node.js 18+ (Node.js 20+ recommended)
- npm
- VS Code

## 1. Install dependencies

Open a terminal in the AuraGen project folder:

```powershell
npm install
```

## 2. Start WebSocket server

Terminal 1:

```powershell
npm run ws
```

Expected:

```text
🚀 AuraGen WebSocket Server running on ws://127.0.0.1:3001
✅ WebSocket listening on ws://127.0.0.1:3001
```

## 3. Start Next.js

Terminal 2:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## 4. Test WebSocket independently

Keep the WebSocket server running and open another terminal:

```powershell
node server/test-ws.js
```

Expected:

```text
✅ TEST CONNECTED
📨 SERVER: ...
```

## 5. Build validation

```powershell
npm run build
```

## 6. Lint

```powershell
npm run lint
```

## Important

The current project uses a rule-based decision service and prompt generation.

The actual external LLM call is intentionally not included yet. The prompt-service produces a structured prompt that can later be passed to the selected LLM provider.

Do not execute generated JavaScript/HTML directly. Future generated UI should pass through schema validation, AST validation where applicable, allow-listed components/actions, and build/runtime testing before being applied.

AuraGen field-specific guidance fix

1. Replace app/page.tsx with page.tsx from this package.
   - Existing dashboard layout/styles are preserved.
   - Field focus immediately displays the correct guidance.
   - Active field telemetry is sent immediately over the existing WebSocket.
   - Adaptation responses prefer guidance for the plan's target field.

2. Replace server/services/genai-service.js with genai-service.js from this package.
   - Preserves generateUIAdaptation(genAIContext, prompt) signature.
   - Uses context.interaction.activeField when available.
   - Adds a 5-second Gemini timeout and deterministic fallback.
   - Does not remove AST or final-plan validation; keep those in the existing caller pipeline.

3. IMPORTANT: Keep the existing websocket-server.js and its AST/final-plan validation pipeline. The current integration must call generateUIAdaptation(genAIContext, prompt), validate the returned plan, and only then send the approved plan in an adaptation_trigger message with a `plan` property. Do not bypass validation.

4. Restart the backend and frontend after replacing the files.

Field guidance is selected from the active field telemetry. If the active field is absent or invalid, the backend does not silently default to annual-income guidance.

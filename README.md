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

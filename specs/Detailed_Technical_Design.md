# Detailed Technical Design - SynthVision Data Forge

## 1. Data Models (`types.ts`)

### 1.1. Session Entity
The core unit of work. It encapsulates the intent and the resulting data.
```typescript
interface Session {
  id: string;
  name: string;
  basePrompt: string;
  referenceImages: string[]; // Base64 data
  generatedImages: GeneratedImage[];
  generatedPrompts: string[]; // Expanded versions
  status: 'idle' | 'generating' | 'completed' | 'failed' | 'stopped';
  totalTarget: number;
  progress: number;
  logs: string[];
}
```

### 1.2. Model Configuration
Supports polymorphic generation backends.
```typescript
interface ModelConfig {
  id: string;
  name: string;
  type: ModelType; // GEMINI | OPENAI_COMPATIBLE
  endpoint?: string;
  apiKey?: string;
  modelId: string;
}
```

## 2. API Service Design (`api.ts`)

### 2.1. Prompt Expansion (`generateDiversePrompts`)
*   **Model:** `gemini-3-flash-latest` (chosen for speed and instruction following).
*   **Logic:** Uses a strictly typed response schema to ensure JSON output. 
*   **Key Behavior:** Translates Chinese input to English and maps user-specified ratios (e.g., "16:9") to restricted enums supported by the VLLM.

### 2.2. Image Generation (`generateImageWithGemini`)
*   **Multimodal Input:** Combines `inlineData` (reference images) with `text` (prompt).
*   **Output Handling:** Iterates through `content.parts` to find `inlineData` and reconstructs the data URI.

## 3. UI Component Details

### 3.1. Main Control Loop (`App.tsx`)
The `startGeneration` function implements an asynchronous loop with early exit (abort) capability.
```typescript
for (let i = 0; i < diversePrompts.length; i++) {
  if (abortControllerRef.current) break; // Check for stop signal
  // ... call api
  // ... update partial state
}
```

### 3.2. Sidebar FLY-OUT Mechanism
Uses absolute positioning and `backdrop-blur` to show session details without shifting the main image grid. Implements `onMouseEnter`/`onMouseLeave` logic with "Pinning" support for persistent inspection.

## 4. UI/UX Specifications
*   **Dark Mode First:** Deep slate palette (#020617) optimized for long-duration image inspection.
*   **Responsive Grid:** Fluid columns (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) for image results.
*   **Stateful Buttons:** Loading cycles with animations and disabled states during active generation.

## 5. Deployment & Environment
*   **Nginx Proxy:** Port 3000 mapping.
*   **Env Vars:** `GEMINI_API_KEY` (Required). Loaded via Vite `define` for secure runtime access in the client.

## 6. Known Constraints & Error Handling
*   **Base64 Limits:** Large reference images can impact prompt length; images are cleaned (prefix removed) before transmission.
*   **JSON Parsing:** Robust extraction helper (`extractJson`) handles cases where the AI wraps JSON in triple backticks.

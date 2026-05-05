# Technical Design Document (TDD) - SynthVision Data Forge

## 1. Component Implementation Details

### 1.1 App (Root Component)
- **State Management:** Uses `sessions` array as the primary source of truth.
- **Async Pattern:** Implements a sequential `for` loop for image generation to prevent overwhelming system resources and provide stable progress updates.
- **Generation Control:** Uses `abortControllerRef` (boolean) to allow users to stop long-running generation tasks safely.

### 1.2 ImageEditorModal
- **Canvas-Based Processing:** Uses an HTML5 Canvas to perform image manipulations (brightness, contrast, cropping).
- **Reactive Preview:** Maintains a `previewUrl` state that reflects changes visually using CSS filters (`brightness`, `contrast`, `clip-path`) before the final bake to canvas.
- **Export Logic:** The `applyChanges` function converts the canvas content back to a Base64 PNG using `toDataURL` and propagates it back to the parent session.

### 1.3 Sidebar
- **Fly-out Navigation:** Implements a details panel that appears on hover/pin, showing the technical configuration of historical sessions without cluttering the list view.
- **Session Lifecycle:** Handles deletion and selection dispatching.

## 2. API Design (`services/api.ts`)

### 2.1 `generateDiversePrompts`
- **Model:** Uses `gemini-1.5-flash` for high-speed prompt expansion.
- **logic:** Takes a base prompt and number of targets, returning a JSON-parsed list of prompts and an optimal aspect ratio.

### 2.2 `generateImageWithGemini`
- **Interface:** Accepts prompt, reference images (Base64), and aspect ratio.
- **Streaming Support:** Designed to handle immediate callback with image results.

## 3. Data Models (`types.ts`)

```typescript
export interface GeneratedImage {
  id: string;
  url: string;        // Can be data: or remote URL
  prompt: string;     // Prompt that generated this specific image
  timestamp: number;
  tags: string[];     // Used for metadata annotation
}

export interface Session {
  id: string;
  status: 'idle' | 'generating' | 'completed' | 'failed' | 'stopped';
  generatedImages: GeneratedImage[];
  logs: string[];
  // ... other metadata
}
```

## 4. Key Implementation Solutions

### 4.1 "Empty String src" Fix
- **Problem:** React warnings when initializing `img` tags with `src=""`.
- **Solution:** Integrated conditional rendering `{url && <img src={url} />}` across all gallery and editor views.

### 4.2 Batch Download Reliability
- **Problem:** Missing images in large batch exports (20+).
- **Optimization:** 
  - Switched from multiple individual downloads to a single `JSZip` archive.
  - Implemented async mapping with `Promise.all` to fetch/buffer all images before compression.
  - Added logging to track progress of assets compression.

### 4.3 Prompt Expansion System
- Encapsulates domain-specific randomization (lighting, weather, environment) to ensure high-variance synthetic data while maintaining the user's semantic intent.

## 5. Development Workflow
- **Bundler:** Vite 6
- **Type Checking:** Strict TypeScript 5.x
- **Build Target:** production-ready static assets in `/dist`.

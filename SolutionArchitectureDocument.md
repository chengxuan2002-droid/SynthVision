# Solution Architecture Document (SAD) - SynthVision Data Forge

## 1. System Overview
SynthVision is a client-side heavy React application that integrates with Google's GenAI SDK (Gemini) and other secondary vision models. It follows a Single Page Application (SPA) architecture with state management handled by React hooks (`useState`, `useRef`, `useEffect`).

## 2. High-Level Architecture

### 2.1 Client Layer (Frontend)
- **Framework:** React 19 (TypeScript).
- **Styling:** Tailwind CSS with a custom professional "Technical/Dark" theme.
- **State Management:** Local React state for sessions, active configurations, and transient generation data.
- **Side Effects:** `useEffect` for API key verification and state synchronization.

### 2.2 Service Layer (Integration)
- **Gemini API Service:** Encapsulated logic for multi-modal prompt generation and image synthesis.
- **Diverse Prompt Engine:** Logic to expand base prompts into high-variance descriptions using LLM agents.
- **Storage Strategy:** Temporary browser-based session storage (volatile in this version) with in-memory state tracking.

### 2.3 External Components
- **Google GenAI SDK:** Provides the primary intelligence for image generation and prompt engineering.
- **JSZip:** Handles client-side compression of image sets for batch export.
- **FileSaver.js:** Triggers browser-native file downloads.

## 3. Data Flow Architecture

### 3.1 Generation Flow
1. **Input Capture:** `App.tsx` captures prompt and reference images (converted to Base64 via `FileReader`).
2. **Expansion:** `api.ts` sends the base prompt to Gemini 1.5/pro to generate `N` unique variations.
3. **Looping:** `App.tsx` iterates through prompt variations, calling the generation service sequentially.
4. **Finalization:** Images are added to the session state and rendered in the gallery.

### 3.2 Export Flow
1. **Filtering:** User applies tag filters if necessary.
2. **Buffering:** `downloadVisible` creates a `JSZip` instance.
3. **Fetching:** Remote URLs are fetched via `fetch`, while data URIs are decoded directly.
4. **Zipping:** Images are added to the archive using unique indices.
5. **Streaming:** The ZIP is generated as a Blob and saved to the user's disk.

## 4. Key Security Considerations
- **API Key Management:** API keys are managed via the platform's native selection dialog and stored in the execution environment (`GEMINI_API_KEY`).
- **Data Privacy:** Reference images are processed in-memory and sent to the VLM via secure HTTPS tunnels. No persistent storage is used for user data beyond the current session lifecycle.

## 5. Technology Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js / Vite |
| Frontend | React 19 / TypeScript |
| UI | Tailwind CSS |
| AI Integration | @google/genai (Gemini) |
| Utilities | JSZip, file-saver, lucide-react |

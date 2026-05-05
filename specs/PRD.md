# Product Requirements Document (PRD) - SynthVision Data Forge

## 1. Executive Summary
**SynthVision Data Forge** is a professional-grade synthetic data generation platform designed specifically for Computer Vision (CV) engineers and researchers. The platform enables the creation of high-quality, diverse, and long-tail training datasets by leveraging state-of-the-art Visual LLMs (VLLMs). Users can translate real-world scenarios and physical constraints into thousands of unique, annotated image samples to improve model robustness in challenging environments.

## 2. Target Audience
*   **Computer Vision Engineers:** Needing to solve "edge case" detection problems where real data is scarce.
*   **Data Scientists:** Looking to augment existing datasets with domain-randomized variations.
*   **AI Researchers:** Prototyping new detection or segmentation models using synthetic-first approaches.

## 3. Goals & Objectives
*   **Ease of Use:** Provide a natural language interface (English/Chinese) to describe complex industrial or environmental scenarios.
*   **Diversity via Variable Control:** Systematically vary lighting, weather, and background while keeping the core subject identical.
*   **Scalability:** Support batch generation of up to 50 images per session with real-time status tracking.
*   **Flexibility:** Allow users to switch between integrated Gemini models and custom OpenAI-compatible endpoints.

## 4. Key Features

### 4.1. Intelligent Prompt Engineering
*   **Chinese-to-English Translation:** Automatic high-quality translation of technical subjects.
*   **Domain Randomization Engine:** Automatically expands a single base prompt into multiple variations covering different environments (e.g., tunnels, bridges), lighting (e.g., twilight, harsh sun), and weather (e.g., heavy rain, fog).
*   **Core Subject Extraction:** Ensures physical structures (e.g., a specific "damaged pantograph") remain consistent while the background changes.

### 4.2. Reference-Based Generation
*   **Visual Conditioning:** Users can upload reference images to define the exact subject, perspective, and features.
*   **Context Preservation:** The generator respects the spatial position and structural details found in reference photos.

### 4.3. Session & Workflow Management
*   **Generation History:** Local-first storage of previous generation tasks.
*   **Live Logs & Progress:** Real-time feedback on prompt synthesis and image generation status.
*   **Interruptible Tasks:** Ability to stop ongoing generations.

### 4.4. Image Curation
*   **Tagging & Filtering:** Categorize generated samples for easier export or review.
*   **Detailed Preview:** Inspect generated images alongside the specific prompts that created them.

## 5. Non-Functional Requirements
*   **Performance:** Prompt expansion should take < 3 seconds; image generation depends on model latency.
*   **Security:** API keys are stored only in the browser environment (no server-side persistence of keys).
*   **Responsiveness:** Fluid UI that handles high-resolution image previews and logs without lag.

## 6. Future Roadmap
*   **Auto-Labeling:** Generate bounding boxes or segmentation masks concurrently with images.
*   **Batch Export:** ZIP export of images and associated metadata (JSON/COCO format).
*   **Negative Prompting:** Advanced controls to exclude specific artifacts.

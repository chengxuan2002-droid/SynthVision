# Product Requirements Document (PRD) - SynthVision Data Forge

## 1. Executive Summary
SynthVision Data Forge is a professional-grade synthetic data generation platform designed for computer vision engineers and data scientists. It leverages advanced Vision Language Models (VLMs) to synthesize diverse, high-fidelity image datasets from a small number of reference images and scenario descriptions. This tool addresses the "long-tail" data problem by enabling the rapid creation of rare or hard-to-capture corner cases for training machine learning models.

## 2. Target Audience
- Computer Vision Researchers/Engineers
- AI Model Trainers
- Autonomous Driving & Robotics Teams
- Industrial Inspection Developers

## 3. Key Features

### 3.1 Scenario-Based Generation
- Users can define a "Scenario Definition" (base prompt) describing the desired images.
- Support for "Reference Anchors": Users can upload up to 4 reference images to provide visual context (characters, objects, styles) to the generator.

### 3.2 Diversity Mapping
- Integration with LLMs (Gemini) to expand a single base prompt into a diverse set of varied prompts.
- Controls for "Generation Count" to specify the target dataset size.

### 3.3 Real-Time Generation Pipeline
- Asynchronous image generation with a live status stream.
- Detailed logs tracking the pipeline status (prompt synthesis, image generation, errors).
- Progress visualization with a real-time progress bar.

### 3.4 Data Annotation & Refinement
- Built-in Image Editor for post-generation refinement.
- Features: Brightness/Contrast adjustments, filter application (Grayscale, Sepia, etc.), and custom cropping.
- Custom tagging system to categorize and annotate generated data.

### 3.5 High-Speed Data Export
- Batch export of generated images as a ZIP archive.
- Support for both local (data URI) and remote URL image sources.
- Filtering capabilities to export specific subsets of data based on tags.

### 3.6 Session Management
- Persistent history of generation sessions.
- Detailed view of previous session configurations (prompts, counts, logs).

## 4. User Interaction Flow
1. **Selection:** User selects a model configuration.
2. **Setup:** User uploads reference images and describes the scenario.
3. **Synthesis:** System expands prompts and starts the generation loop.
4. **Observation:** User monitors progress through live logs and gallery.
5. **Annotation:** User edits and tags specific images for better dataset quality.
6. **Export:** User downloads the finalized dataset as a ZIP.

## 5. Non-Functional Requirements
- **Performance:** Low latency in prompt expansion; efficient handling of multi-image batch downloads.
- **Reliability:** Graceful handling of API rate limits or network failures during sequential generation.
- **UI/UX:** Dark-themed, high-density interface suitable for professional technical workflows.

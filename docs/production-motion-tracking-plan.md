# Production Motion Tracking Plan

## Decision

ComeUp must move from `expo-camera` preview-only tracking to a native frame pipeline:

1. Expo SDK 56 with React Native 0.85.3 and a custom development build.
2. React Native VisionCamera v5 for realtime camera frames.
3. VisionCamera Worklets / Nitro frame output for off-main-thread processing.
4. React Native Fast TFLite for on-device inference.
5. MediaPipe Pose Landmarker or MoveNet as the pose model. MediaPipe is preferred for rich 33-point landmarks; MoveNet is a good low-latency fallback.
6. A deterministic rep-counting state machine in app code. The model detects landmarks; the app decides whether a rep happened.

## Why this is required

The current Expo Camera screen can show the user, take photos, record video, and scan barcodes, but it does not provide a production-grade frame-by-frame ML pipeline for realtime exercise counting.

Fake movement simulation is forbidden in production. Automatic reps must only be incremented from pose landmarks with enough confidence and a completed movement cycle.

## Current Cleanup

- Upgraded the UI to Expo SDK 56 compatible dependencies.
- Added VisionCamera v5, VisionCamera Worklets, Nitro modules, and Fast TFLite.
- Replaced Expo Camera usage in the workout screen with a platform-specific camera abstraction.
- Added a native VisionCamera frame output that disposes frames correctly and is ready for model inference.
- Removed simulated `Math.random()` automatic rep counting from the workout screen.
- Removed random lunge counting from the computer vision service.
- Replaced lunge/push-up/squat counting with angle-based movement state transitions.

## Implementation Milestones

### 1. Native Camera Migration

- Build with Node `22.13.0` or another supported RN version, not Node `23.x`.
- Move the app to Expo Development Build / CNG.
- Run `npx expo prebuild --clean` before native testing.
- Add the TFLite pose model assets to the native bundle.
- Build native iOS and Android binaries.

### 2. Pose Inference

- Add a native pose module using MediaPipe Pose Landmarker, or load MoveNet/pose TFLite via Fast TFLite.
- Run inference on camera frames off the JS main thread.
- Emit pose landmarks, world landmarks, and confidence scores to JS.

### 3. Exercise Engine

- Normalize landmark coordinates for front/back camera and portrait/landscape.
- Calibrate user position before a set starts.
- Count reps only after a full top-bottom-top or standing-bottom-standing cycle.
- Add per-exercise validators for push-up, squat, lunge, plank, bench press, shoulder press, row, deadlift.

### 4. Product Truthfulness

- Show `Tracking ready`, `Move into frame`, `Low confidence`, or `Manual fallback`.
- Never show AI/form claims unless pose confidence is high enough.
- Store sessions and form events in backend.

### 5. QA

- Test every exercise with recorded videos and real device sessions.
- Require no double-counting across 50 reps.
- Require no count when user stands still, walks around, or moves only arms during lower-body exercises.

## Recommended Production Stack

- Mobile: Expo SDK 56, Expo Development Build, React Native 0.85, Expo Router.
- Camera: React Native VisionCamera v5.
- Frame processing: VisionCamera Frame Output with Worklets/Nitro.
- On-device inference: React Native Fast TFLite.
- Pose model: MediaPipe Pose Landmarker first; MoveNet Lightning can be a fallback where bundle size or latency requires it.
- Backend: Fastify, MongoDB Atlas, JWT.
- AI service: separate internal service for workout generation, recommendations, and later server-side review of uploaded workout clips.

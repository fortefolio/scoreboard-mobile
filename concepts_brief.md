# Mobile Live Video Streaming & Instant Replay (`scoreboard-mobile`)

* **Author:** gjoforte
* **Date:** 2026-11-27

## Overview

This feature migrates live video streaming from `scoreboard-web#47` to `scoreboard-mobile` (Expo `~58.0.21` / React Native `0.88.1`, targeting both iOS and Android) as a conservative v1 proof-of-concept. It lets a user stream a match directly from their phone to their own YouTube channel while scoring it, using either a single phone or a two-device setup (one phone films on a tripod while another device scores over the existing `match:{id}` Supabase Realtime sync).

The app composites a native scoreboard overlay directly onto the camera feed—avoiding cloud video servers—and maintains an on-device 10-second rolling replay buffer. When triggered, the app saves the last 10 seconds locally and momentarily replaces the live camera feed in the stream with that replay clip (keeping the live score overlay visible with a "Replay" badge) without dropping the YouTube RTMP connection.

## Analysis

### Strategic & Ecosystem Positioning
* **Differentiation vs. Ultimate Streamer:** Ultimate Streamer (`ultimate-streamer.com`) is iOS-only and centered on single-device operation. Supporting both iOS and Android plus two-device scoring via ScoreBoard's existing `match:{id}` Supabase Realtime channel fits amateur clubs where players and parents use mixed phones and mount the filming phone on a tripod or fence.
* **Conservative v1 PoC Discipline:** Locking v1 to `720p30` (~2.0–2.5 Mbps adaptive bitrate), landscape 16:9, a single clean scoreboard layout, and a direct cut into and out of replay avoids v1 scope creep (slow-motion speed ramps, multi-clip highlight reels, sponsor ad carousels).

### Architecture & Codebase Fit
* **Native Module Boundary:** `scoreboard-mobile` already has native `ios/` and `android/` build targets in `package.json`, allowing custom Expo/Nitro native modules. Because Expo Go cannot run custom camera/RTMP pipelines, this requires custom dev/release builds.
* **Recommended Native Libraries:** Wrap **HaishinKit** (iOS, Swift/Metal) and **RootEncoder** (Android, Kotlin/OpenGL ES/CameraX) behind a unified TypeScript/native module interface (`startStream`, `stopStream`, `updateOverlayState`, `triggerReplay`, `saveLast10sClip`, `getStreamStats`).
* **JS vs. Native Split:** The JS/TS layer subscribes to `match:{id}` (`score_update` / `SCORE_UPDATED`), monitors network state (`@react-native-community/netinfo`) and wake lock (`expo-keep-awake`), and pushes a lightweight `OverlaySnapshot` JSON payload to native only when state changes. The native layer owns camera capture, GPU compositing, the 10-second ring buffer, local MP4 export, H.264/AAC hardware encoding, and RTMP publishing.
* **Configuration Gaps:** `scoreboard-mobile/app.json` currently lacks `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, Android `CAMERA`/`RECORD_AUDIO` permissions, and landscape orientation handling for the streaming screen (`expo-screen-orientation`).

### Inventive Contradictions & Ideal Final Result
1. **Rich Live Overlay vs. Thermal/CPU Budget → On-Change Texture Caching:** Rendering a full UI tree at 30fps drains battery and causes thermal throttling. Instead, render the scoreboard overlay into an offscreen bitmap/texture only when score or match state changes (or at 1Hz if a running clock is active), and let the GPU compositor alpha-blend that cached texture onto every video frame at near-zero cost.
2. **Clean Saved Replay vs. Live-Scored Broadcast Replay → Pre-Overlay Pipeline Branching:** Tap the 10-second ring buffer *before* the overlay compositor:
   `Camera → [Tee to 10s Clean Ring Buffer] → [Live / Replay Texture Switcher] → [GPU Overlay Compositor (Live Score + "Replay" Badge)] → [H.264 Encoder → RTMP]`
   This keeps saved local clips clean (reusable without baked-in scores), prevents stale/frozen scores during replay playback, and keeps the live score and "Replay" badge crisp.
3. **Instant Replay Injection vs. Strict RTMP Clock → Single Continuous Encoder:** YouTube RTMP ingest requires monotonic PTS/DTS timestamps, fixed 2-second keyframe intervals (GOP), and an uninterrupted audio clock. Stopping or swapping encoders drops the broadcast. Keeping one hardware H.264/AAC encoder and RTMP session running permanently—while swapping only the upstream input texture (`CameraTexture` ↔ `ReplayPlayerTexture`)—prevents stream drops.

### Secondary Trade-offs & Operational Risks
* **Thermal Throttling (60–120 Minute Matches):** Simultaneous camera capture, GPU compositing, hardware encoding, ring-buffer writes, RTMP upload, and WebSocket sync can overheat mid-range phones. Mitigate with hardware zero-copy pipelines, adaptive bitrate, and OS thermal monitoring (`ProcessInfo.thermalState` on iOS, `PowerManager.getThermalHeadroom` on Android) to warn the operator or shed load (e.g., pause the replay buffer) before the OS kills the app.
* **Single-Device Ergonomics:** Tapping score buttons on a mounted or handheld filming phone can shake the camera or trigger tap-to-focus/exposure changes. Single-device mode needs a camera-touch lock and an edge-docked minimal score strip (`+1`/`-1`).
* **Platform Parity Risk:** HaishinKit (iOS) and RootEncoder (Android) differ in how they mix an MP4 texture into a live RTMP stream. The Live ↔ Replay texture swap must be prototyped on both platforms early as a PoC gate.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * Migrate live streaming scope from `scoreboard-web#47` to `scoreboard-mobile` (iOS and Android).
  * Stream `720p30` video with audio directly from the phone to the user's own YouTube channel.
  * Support both single-device (film + score) and two-device (film on one phone, score on another via `match:{id}` Supabase Realtime) workflows.
  * Native GPU-composited scoreboard overlay driven by `match:{id}` Realtime updates.
  * Rolling 10-second on-device replay buffer that saves the clip locally and momentarily replaces the live camera feed in the RTMP stream (showing live score + a "Replay" badge) without dropping the stream.
* **Out-of-Scope Non-Goals:**
  * Mobile browser streaming inside `scoreboard-web`.
  * Streaming all users to a single ScoreBoard-owned YouTube channel.
  * Server-side cloud video compositing or platform-hosted HLS/WebRTC watch pages.
  * Multi-camera switching, slow-motion speed ramps, multi-clip highlight stitching, and sponsor ad carousels.

## Alternatives Weighed

* **Browser-based streaming in `scoreboard-web#47`:** Rejected by author. Mobile browsers lack reliable backgrounding, low-level hardware RTMP encoding, and deterministic 10-second rolling video buffers across iOS Safari and Android Chrome; migrated to `scoreboard-mobile`.
* **Platform-owned shared YouTube channel:** Rejected by author. Routing all user streams to one ScoreBoard-owned YouTube channel creates single-point-of-failure Content ID / DMCA strike risk (e.g., venue music suspending live streaming for all users), hits YouTube API quota limits, and mixes private/unlisted user VODs on one channel.
* **On-device WebView compositing of `/match/[matchId]/overlay`:** Rejected by author. Running an offscreen WebView alongside live camera capture and hardware encoding adds heavy GPU/CPU/battery load and increases thermal shutdown risk on iOS and Android.
* **Server-side cloud compositing:** Rejected by author. Pushing raw video to a cloud media server to composite `/match/[matchId]/overlay` adds ongoing per-minute transcoding/egress costs and 2–5 seconds of extra latency, which conflicts with a conservative, zero-server-video-cost v1 PoC.

* **Google OAuth / YouTube Broadcast API in v1:** Rejected by author for v1. Full YouTube Data API OAuth (`youtube.force-ssl`) requires Google app verification and token lifecycle management; v1 uses a pasted RTMP URL + Stream Key (saved securely on-device) and defers YouTube OAuth to v2.

## Key Decisions & Staging for Next Steps

* **Resolved:**
  * **Target repository & platforms:** `scoreboard-mobile` (iOS and Android, custom native build—not Expo Go).
  * **Channel ownership & setup:** User's own YouTube channel via pasted RTMP URL + Stream Key (saved securely in `expo-secure-store` for reuse). Google OAuth is deferred to v2.
  * **Scoring workflows:** Support both single-device (minimal edge-docked score strip with camera-touch lock) and two-device (one phone films, another device scores via `match:{id}` Supabase Realtime).
  * **Overlay approach:** Native mobile overlay driven by `match:{id}` Realtime. Render the scoreboard once as a flat image whenever state changes and stamp that cached image onto video frames to protect the thermal/battery budget.
  * **Stream continuity & replay injection:** Keep one hardware H.264/AAC encoder and RTMP session running continuously, switching only the upstream video input between the live camera and the 10-second replay clip. Validate this input switch early on both iOS (HaishinKit) and Android (RootEncoder).
  * **Replay behavior & audio:** Cut away from live action (like a TV broadcast), keep the live scoreboard overlay visible with a "Replay" badge, and keep live microphone audio running during replay playback.
  * **Saved clip format:** Clean (raw pre-overlay camera video saved locally to the device so clips can be reused as highlights).
  * **v1 target bar:** Conservative PoC (`720p30`, landscape 16:9, adaptive bitrate, full-match thermal/network stability focus).
* **Open Technical Gate for `/egm-draft`:**
  * Run a 2-platform native spike confirming that HaishinKit (iOS) and RootEncoder (Android) can switch between live camera input and a 10-second MP4 replay file mid-stream without dropping YouTube's RTMP connection.

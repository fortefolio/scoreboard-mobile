# Stage 7: Critic Review Report (`FeatureRange`: Lines 1–117)

* **Target Document:** [live-video-streaming.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/designs/live-video-streaming.md)
* **Baseline Context:** [concepts_brief.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/concepts_brief.md)
* **Reviewers:** `egm-design`, `egm-structural`, `egm-style`

---

## Design Critic (`egm-design`)

### Blockers

1. **Blocker — Contradictory Ring Buffer & Single-Encoder Architecture (OOM / Dual-Encoder Risk)**
   * **Affected Scope:** Lines 55–67, 73–76
   * **Finding & Action:** Line 73 states the native module runs "one permanent hardware H.264/AAC encoder", yet Line 74 specifies the pre-overlay 10-second ring buffer stores "compressed clean GOP segments in memory or rotating 2-second temp MP4 chunks". Because the main encoder sits *after* the GPU compositor, compressed pre-overlay H.264 GOPs require a **second concurrent hardware H.264 encoder** (whereas uncompressed 720p30 RAM buffering requires ~415 MB and risks OOM kills). Explicitly commit to a second lightweight H.264 encoder (and verify dual-encoder support on target iOS/Android devices within the thermal budget), specify memory/disk footprint (~3–4 MB for 10s @ 2.5 Mbps), and define crash-safe temp-chunk cleanup.

2. **Blocker — Unspecified Replay Buffer Concurrency, Frame-Pacing, and Audio Interruption Handling**
   * **Affected Scope:** Lines 71–80, 101–102
   * **Finding & Action:**
     * *Buffer freeze vs. copy race (Line 76):* Freezing the buffer loses 10s of live footage; back-to-back `triggerReplay()` calls or calls `<10s` after stream start have undefined behavior.
     * *Frame-rate / clock drift (Lines 71, 77):* Live cameras drop below 30fps in low light, and MP4 replay decode must align with the continuous encoder's monotonic 30fps PTS clock via a VFR-to-CFR frame pacer.
     * *Audio interruption (Line 78):* Phone calls, Bluetooth disconnects, or mute interrupt `AVAudioSession` / `AudioRecord`; without silent-PCM fallback injection, YouTube RTMP ingest stalls or drops.

### Majors

3. **Major — Incomplete Native Module Contract & Missing OS Permissions / Background Lifecycle**
   * **Affected Scope:** Lines 48–49, 60, 93, 95–103
   * **Finding & Action:** `FeatureRange` omits `app.json` permission flows (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, Photos/MediaLibrary), lacks `startPreview`/`stopPreview` and camera-touch lock methods in the native contract, and does not specify Android Foreground Service (`camera|microphone` for Android 14+) or iOS `AVCaptureSession` interruption recovery when backgrounded.

4. **Major — Security: Plaintext `rtmp://` Credential Exposure & Missing Log Redaction**
   * **Affected Scope:** Lines 47, 98
   * **Finding & Action:** Default to and validate `rtmps://` for YouTube (warn if plaintext `rtmp://` is used on shared Wi-Fi), mask the Stream Key in UI inputs, and mandate redaction of `rtmpUrl`/`streamKey` from JS/native logs and `StreamHealthEvent`.

5. **Major — Duplicated Scoreboard UI Maintenance Across React Native, Swift, and Kotlin**
   * **Affected Scope:** Lines 50, 82–87
   * **Finding & Action:** Drawing sport-specific HUDs natively in Swift and Kotlin duplicates React Native layout work. Either rasterize the scoreboard HUD in React Native on state change and pass the image to native to cache as a GPU texture, or explicitly scope v1 to a single generic HUD layout.

6. **Major — RTMP Reconnect & Keyframe/Header Resync + Realtime Desync**
   * **Affected Scope:** Lines 46, 92–93, 106
   * **Finding & Action:** RTMP reconnect requires forcing an immediate IDR keyframe and resending H.264 SPS/PPS + AAC `AudioSpecificConfig` headers with a bounded retry timeout. Also define Supabase Realtime WebSocket/JWT reconnect state-resync over 60–120 minute matches and optimistic vs. confirmed single-device overlay updates.

7. **Major — Missing Concrete Thermal/Device Thresholds & Minimum OS Targets**
   * **Affected Scope:** Lines 26, 105–108
   * **Finding & Action:** `PowerManager.getThermalHeadroom` requires Android 11+ (API 30+). Specify minimum iOS/Android OS versions and concrete state-transition thresholds for ABR and thermal load-shedding.

### Nits

8. **Nit — Native API Naming Drift vs. `concepts_brief.md`:** Lines 98–103 vs. `concepts_brief.md` L20 (`updateOverlay` vs. `updateOverlayState`, `triggerReplay` vs. `saveLast10sClip`, `onStreamEvent` vs. `getStreamStats`).
9. **Nit — Orphaned Temp File Cleanup:** Line 74 — add a startup cleanup sweep if rotating temp MP4 chunks are used.

---

## Structural (`egm-structural`)

### Majors

1. **Major — Missing Native Permissions & `app.json` Configuration in `## Technical Plan`**
   * **Affected Scope:** Lines 39–108 (specifically Lines 41–53)
   * **Rationale:** `concepts_brief.md` L22 flagged `app.json` permission gaps, which are missing from `## Technical Plan`.

2. **Major — Incomplete Native Module Type Definitions in `### 5. Native Module Contract & Resilience`**
   * **Affected Scope:** Lines 95–104
   * **Rationale:** `OverlaySnapshot`, `StreamHealthEvent`, and `Subscription` are referenced without field schemas. Format the contract as a fenced `typescript` block with explicit interfaces.

### Nits

3. **Nit — Inconsistent Markdown Bullet Markers (`-` vs `*`):** Lines 19–20 use `-` while the rest of the document uses `*`.
4. **Nit — Heading vs. Bullet Order Symmetry in `### 4`:** Line 89 puts Single-Device first, while lines 92–93 put Two-Device first.
5. **Nit — Inconsistent Formatting/Casing for Replay Badge:** Lines 22, 30 (`"Replay" badge`) vs. Line 79 (`` `REPLAY` badge ``).

---

## Style (`egm-style`)

### Majors

1. **Major — Technical Contradiction in Buffer Description (Line 74):** "Raw camera frames" contradicts "compressed clean GOP segments" / "MP4 chunks". Use "Pre-overlay camera frames" or "Clean (pre-overlay) camera frames".
2. **Major — Filler Word and Uncalibrated Performance Claim (Line 86):** Replace "simply alpha-blends ... at near-zero CPU cost" with a factual mechanism statement ("alpha-blends that static cached texture onto each video frame on the GPU without re-rendering the UI layout on the CPU").
3. **Major — Conflated Runtime Constraint (Line 43):** Separate Expo Go's inability to load custom native modules from JavaScript's lack of low-level camera/GPU/RTMP APIs.

### Nits

4. **Nit — Subjective Qualifier "conservative" (Lines 16, 26, 115):** Drop "conservative"; the concrete `720p30` / v1 PoC bounds already convey it.
5. **Nit — Imprecise Duration "momentarily" (Line 22):** Use "for up to 10 seconds".
6. **Nit — Terminology Drift (Lines 22, 30, 79, 85, 93):** Standardize on `"Replay"` badge, `scoreboard overlay`, and `shift focus or exposure`.
7. **Nit — Vague Adjective "compact" (Line 50):** Drop "compact" or list the fields.
8. **Nit — Buzzword "unlocks" (Line 112):** Replace with "provides direct access to".

# Stage 9: Implementation Readiness Report (`DetailedRange`: Lines 118–155)

* **Target Document:** [live-video-streaming.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/designs/live-video-streaming.md)
* **Baseline Context:** [concepts_brief.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/concepts_brief.md)
* **Reviewers:** `egm-implementation-readiness`, `egm-codebase-details`, `egm-style`

---

## Implementation Readiness (`egm-implementation-readiness`)

### Blockers

1. **Blocker — Missing Native Dependency Versions, Build Files, and Minimum SDK Targets**
   * **Affected Scope:** Lines 122–123, 125–136
   * **Finding:** Links HaishinKit and RootEncoder without pinned versions or repository coordinates (HaishinKit `1.x` vs `2.x` has breaking API differences; RootEncoder needs JitPack artifact coordinates), and omits `modules/live-streamer/package.json`, `ios/LiveStreamer.podspec`, `android/build.gradle`, and `android/src/main/AndroidManifest.xml`, plus `expo-media-library` version / local module linking in `scoreboard-mobile/package.json`.

2. **Blocker — Unspecified TypeScript Schemas (`OverlaySnapshot`, `StreamHealthEvent`, `StreamConfig`, `ReplayResult`)**
   * **Affected Scope:** Line 127 (cross-ref Lines 98–103, 140)
   * **Finding:** `OverlaySnapshot`, `StreamHealthEvent`, `StreamConfig` (audio sample rate/bitrate), and `ReplayResult` are referenced without concrete field definitions or union types.

3. **Blocker — Unresolved Replay Ring Buffer Architecture & Export Ownership**
   * **Affected Scope:** Lines 132, 136 (cross-ref Lines 74, 122)
   * **Finding:** Line 74 leaves the ring buffer storage strategy open (memory GOPs vs. rotating 2s temp MP4s), and export ownership between native MP4 writing and JS `expo-media-library` is ambiguous.

4. **Blocker — Ambiguous Android Storage Permissions & `app.json` Plugin Configuration**
   * **Affected Scope:** Line 121
   * **Finding:** "media write permissions" is unspecific for Android 13+ (`READ_MEDIA_VIDEO` / scoped storage vs. `WRITE_EXTERNAL_STORAGE` / `expo-media-library` config plugin).

### Majors

1. **Missing `LiveStreamerPreview` Component Props & Touch-Lock Mechanism** (Lines 128, 144–145)
2. **Missing Native Scoreboard Overlay Visual & Layout Specification** (Lines 131, 135)
3. **Unspecified ABR, Reconnect, and Thermal Shedding Thresholds** (Lines 130, 134, 106–107)
4. **Audio Handling During Replay Playback** (Lines 130, 134, 78 — explicitly mute/discard MP4 audio track during replay while keeping live mic AAC audio running)
5. **Unspecified `useMatchRealtime` Hook Contract** (Lines 141–142)
6. **Incomplete `RtmpSetupModal` Validation & Defaulting Rules** (Line 143)
7. **Incomplete `StreamControlsOverlay` Interaction & Single-Device Scoring Persistence** (Line 144)
8. **Missing Permission-Denied, Backgrounding (`AppState`), and Network-Drop Lifecycle in `stream.tsx`** (Line 145)
9. **Missing Test Runner Command (`npm run test:run`), Native Mock Strategy, and PoC Pass/Fail Criteria** (Lines 150–152)

### Nits

1. **Unspecified `rtmpCredentials.ts` Key Names & Signatures** (Line 139)
2. **Match Detail "Live Stream" Button Visibility** (Line 146)
3. **i18n Sync Verification (`npm run check:i18n`)** (Line 147)

---

## Codebase Details (`egm-codebase-details`)

### Majors

1. **Missing `src/app/_layout.tsx` update for `/match/[id]/stream` & `BottomTabBar` suppression** (Line 145)
   * `scoreboard-mobile/src/app/_layout.tsx` (lines 80–100) gates `<BottomTabBar />` with `isScoreboardRoute` and registers landscape `Stack.Screen` options. Without updating `_layout.tsx`, `BottomTabBar` will render over `/match/[id]/stream`.

2. **i18n canonical sync constraint (`scripts/sync-i18n.js`) omitted** (Line 147)
   * `scoreboard-mobile/scripts/sync-i18n.js` treats `scoreboard-web/lib/i18n/` (`types.ts`, `locales/en.ts`, `locales/pt.ts`) as the canonical source and overwrites `scoreboard-mobile/src/lib/i18n/` on `npm run sync:i18n` (or fails `npm run check:i18n`). Either update `scoreboard-web/lib/i18n/` or add a mobile-only i18n extension mechanism.

3. **Missing native module build descriptors (`LiveStreamer.podspec` & `android/build.gradle`) in `modules/live-streamer/`** (Lines 123, 125–136)
   * Required by Expo Modules autolinking (`ios/Podfile` lines 3, 30, 48). Note `scoreboard-mobile/android/build.gradle` line 21 already includes `maven { url 'https://www.jitpack.io' }`.

4. **Existing atomic scoring & sport engines omitted from `StreamControlsOverlay.tsx`** (Line 144)
   * Must reuse `recordMatchEventAtomic` (`@/lib/scoring/atomicScoring`) and `@/lib/scoring/*` rather than implementing separate score mutation logic.

### Nits

5. **Hook directory convention (`src/hooks/` vs `src/lib/hooks/`) & `scoreboard.tsx` `useEffect` coupling** (Lines 141–142)
6. **`expo-media-library` config plugin in `app.json` & Swift 6 strict concurrency note (`scripts/patch-expo-modules-jsi.js`)** (Lines 121–122, 129–132)

---

## Style (`egm-style`)

### Nits

1. **Synonym redundancy & repeated modifier ("rolling ... circular buffer", "clean ... pre-overlay")** (Lines 121, 132, 136)
2. **Asymmetric precision in Android vs iOS permissions** (Line 121)
3. **Filler adjective ("unified JS/TS bridge")** (Line 128)
4. **Vague modifiers ("compact OverlaySnapshot", "actual changes")** (Line 140)
5. **Colloquial phrasing ("before going live" → "before starting the stream")** (Line 143)

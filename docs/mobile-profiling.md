# How to Profile React Native (Android & iOS) Like Lighthouse

There isn't a single built-in "Lighthouse" for native mobile, but these tools cover the same areas (startup/TTI, FPS/jank, JS blocking, and network waterfalls):

- **Flashlight (`https://flashlight.dev/`) — closest to Lighthouse for Android:**
  Runs against a Release APK over `adb` (including on your Android emulator), measures **FPS, CPU, RAM, and Time-to-Interactive (TTI)**, and generates a Lighthouse-style score and report.
- **React Native DevTools (built into `npx expo start` → press `j`):**
  - **React Profiler:** Finds unnecessary re-renders (e.g., during live scoring or feed updates).
  - **JS Performance / CPU Profiler:** Equivalent to Lighthouse's TBT (finds slow JS work blocking the bridge/thread).
  - **Network Inspector:** Spots duplicate or slow Supabase queries.
- **Android Studio Profiler (Android):**
  Profile a Release/Profileable build on the emulator or physical device for **CPU trace, Frame Rendering / Jank, Memory, and Network**.
- **Xcode Instruments (iOS — installed at `/Applications/Xcode.app/Contents/Applications/Instruments.app`):**
  - **Time Profiler:** Pinpoints slow JS/native functions.
  - **Animation Hitches / Core Animation:** Equivalent to CLS/jank — catches dropped frames while scrolling lists or opening modals.
  - **Allocations / Leaks:** Catches memory growth during long live-scoring sessions.

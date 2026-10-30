# ScoreBoard Mobile 📱

Cross-platform mobile application for **ScoreBoard**, engineered with **React Native (Expo SDK 58)**, **Expo Router v4**, and **Supabase**. Built to deliver 1:1 design and functional parity with `scoreboard-web`, optimized with handheld referee ergonomics, tactile haptics, pinch-to-zoom tournament brackets, and live realtime score streaming.

---

## 🎨 Design System Alignment

ScoreBoard Mobile adheres strictly to the **Command Center** design specification defined in `DESIGN.md`:
* **Chromatic Hierarchy**:
  * **Base Canvas**: `#0c1324` (deep slate-black)
  * **Surface Low (Cards/Containers)**: `#151b2d`
  * **Surface Mid**: `#191f31`
  * **Surface High (Modals/Popovers)**: `#23293c`
  * **Primary Accent**: `#4f46e5` (Indigo powered buttons and active tabs)
  * **Secondary Accent**: `#4edea3` (Emerald for live scores, set indicators, and winning paths)
  * **Tertiary / Warning**: `#f59e0b` / `#fbbf24` (Amber for favorites, service indicator, and scheduled status)
  * **Critical / Error**: `#ffb4ab` / `#93000a` (Soft red alerts)
* **Typography**:
  * **Digital-7 (`assets/fonts/digital-7.ttf`)**: Brand logo `SCORE:BOARD` and large digital scoreboards.
  * **Space Grotesk / Monospace**: Performance statistics, set breakdowns, and game clocks.
* **The No-Line Rule**: Section boundaries are defined via tonal contrast shifts rather than 1px solid borders.

---

## 🚀 How to Run & Test the Mobile App

Ensure your local Supabase backend is running first:
```bash
docker ps | grep supabase_kong_backend
# Should show port 0.0.0.0:54321->8000/tcp
```

### Option 1: iOS Simulator (macOS Xcode)
> **Recommended for macOS.**

1. **Pre-boot the simulator** (prevents cold boot timeout errors):
   ```bash
   open -a Simulator
   ```
2. Navigate to `scoreboard-mobile`:
   ```bash
   cd scoreboard-mobile
   ```
3. Start Expo targeting the iOS simulator:
   ```bash
   npm run ios
   # Or with explicit localhost routing:
   npx expo start --ios --localhost
   ```
4. Expo will automatically launch the app inside the active iPhone simulator.

---

### Option 2: Web Browser (Chrome / Safari)
> **Fastest for quick UI inspection and responsiveness testing.**

1. In the `scoreboard-mobile` directory, run:
   ```bash
   npm run web
   ```
2. Open [http://localhost:8081](http://localhost:8081) in Google Chrome or Safari.
3. Open Developer Tools (`Cmd + Option + I`), click **Toggle Device Toolbar** (`Cmd + Shift + M`), and select **iPhone 16 Pro** or **Pixel 7** to preview the exact mobile viewport.
4. *Note: Web mode is configured with `"output": "single"` (Single Page Application), eliminating SSR hydration mismatches.*

---

### Option 3: Android Emulator (Android Studio)
1. Start your Android Virtual Device (AVD) from Android Studio.
2. In the `scoreboard-mobile` directory, run:
   ```bash
   npm run android
   ```
3. *Note: The Supabase client automatically resolves `localhost:54321` to `10.0.2.2:54321` when running on Android to communicate directly with your Mac's Docker container.*

---

### Option 4: On Your Physical Phone (iOS / Android via Expo Go)
> **Best for testing native haptics, KeepAwake screen retention, and referee consoles in hand.**

1. Install the free **Expo Go** application:
   * [Apple App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779)
   * [Google Play Store (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Ensure your phone and your Mac are on the **same Wi-Fi network**.
3. Obtain your Mac's local network IP address:
   ```bash
   ipconfig getifaddr en0
   # Example output: 192.168.1.116
   ```
4. Open `scoreboard-mobile/.env` and update `EXPO_PUBLIC_SUPABASE_URL`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=http://<YOUR_MAC_IP>:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
   ```
5. Start the development server:
   ```bash
   npx expo start
   ```
6. Open your phone's **Camera** (iOS) or **Expo Go** (Android) and scan the QR code printed in the terminal.

---

## 🌐 Internationalization (i18n)

The mobile app supports complete dual-language translation:
* **English (`en`)**
* **Portuguese (`pt`)**

### How it works:
* Uses the exact dictionary key structure as `scoreboard-web`.
* Device locale is auto-detected on initial launch via `expo-localization`.
* Users can toggle language at any time in the Top Navigation Bar or Profile screen.
* Selections persist across sessions (`AsyncStorage` on Native, `localStorage` on Web).

### Shared Translations Architecture:
Both `scoreboard-web` and `scoreboard-mobile` share identical translation dictionaries (`types.ts`, `locales/en.ts`, and `locales/pt.ts`).

To keep them synchronized without managing external registry packages or tokens:
```bash
# Verify that translations are 100% in sync
npm run check:i18n

# Synchronize translations from canonical web source into mobile
npm run sync:i18n
```

Automated Vitest regression tests (`lib/i18n/__tests__/drift.test.ts`) guard against translation drift in CI.

---

## 🛠️ Troubleshooting & Known Errors

### 1. `Simulator device failed to open exp://... Operation timed out (domain=NSPOSIXErrorDomain, code=60)`
* **Cause**: The iOS simulator was in a cold shutdown state, taking longer than the default 60s timeout for SpringBoard to boot and launch Expo Go.
* **Fix**:
  ```bash
  # Boot the simulator prior to running expo:
  open -a Simulator
  # Then run:
  npx expo start --ios --localhost
  ```

### 2. `A tree hydrated but some attributes of the server rendered HTML didn't match...`
* **Cause**: Expo Router defaulted to server-side static rendering (`output: "server"`), causing React 19 hydration mismatches with client-side animation and layout components.
* **Fix**: In `app.json`, set `"web": { "output": "single" }`. This sets Expo Web to client SPA mode, completely eliminating hydration discrepancies.

### 3. `Network request failed` on physical device
* **Cause**: The phone cannot reach `http://localhost:54321` (localhost on a phone refers to the phone itself).
* **Fix**: Ensure your computer's LAN IP is set in `.env` (e.g. `http://192.168.1.x:54321`) and that macOS Firewall is not blocking incoming connections on port `54321`.

---

## 📦 Project Structure

```
scoreboard-mobile/
├── app.json                     # Expo configuration (SDK 58, dark theme, SPA output)
├── eas.json                     # EAS build configurations (dev, preview, production)
├── src/
│   ├── app/                     # Expo Router file-based routes
│   │   ├── _layout.tsx          # Root theme, font, auth & language providers
│   │   ├── (tabs)/              # Bottom tab navigation
│   │   │   ├── index.tsx        # Feed & Command Center (Live Arena, filters, search)
│   │   │   ├── my-matches.tsx   # User organized and refereed matches
│   │   │   ├── my-tournaments.tsx # User tournaments & creation wizard
│   │   │   ├── notifications.tsx # Live notifications center
│   │   │   └── profile.tsx      # User profile, language toggle & settings
│   │   ├── match/[id].tsx       # Match detail screen with sets breakdown & umpire tools
│   │   ├── match/[id]/scoreboard.tsx # Fullscreen referee console (5 sports)
│   │   ├── tournament/[id]/     # Tournament hub (standings, bracket tree, teams)
│   │   └── user/[username].tsx  # Public athlete/organizer profile
│   ├── components/              # Modular UI components
│   │   ├── MatchCard.tsx        # Command Center match card matching web
│   │   ├── TournamentCard.tsx   # Tournament card with format & dates
│   │   ├── TopBar.tsx           # Digital-7 logo, language switcher, auth menu
│   │   ├── SportFilterBar.tsx   # Scrollable sports pill selector
│   │   ├── SportIcon.tsx        # Sport vector icons
│   │   ├── FollowButton.tsx     # Star follow toggle
│   │   └── tournament/          # Standings tables & interactive SVG brackets
│   ├── lib/
│   │   ├── i18n/                # Language context, translations (en/pt), types
│   │   ├── supabase/            # Supabase client with SecureStore / localStorage
│   │   ├── scoring/             # Multidisciplinary scoring engines
│   │   └── notifications/       # Push notifications helper & deep links
│   └── constants/
│       └── theme.ts             # ScoreBoardTheme colors & spacing tokens
```

---

## 📜 Verification

Verify types and bundling:
```bash
# Typecheck
npx tsc --noEmit

# Test Web Export
npx expo export --platform web
```

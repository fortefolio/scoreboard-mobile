# Mobile Application Architecture (`scoreboard-mobile`)

The mobile client is built using **React Native** and **Expo Router** with TypeScript, NativeWind (Tailwind CSS for React Native), and `@supabase/supabase-js`.

---

## 1. Expo Router Navigation Structure

Navigation is managed declaratively via file-based routing under `src/app/`:

| Path | Screen Type | Description |
| :--- | :--- | :--- |
| **`src/app/_layout.tsx`** | Root Layout | Global providers (Auth, React Query, Supabase session, Theme, Notifications). |
| **`src/app/(tabs)/`** | Bottom Tab Navigator | Main bottom navigation bar. |
| ├── `index.tsx` | Tab 1: Live Feed | Infinite-scroll list of live and recently completed matches. |
| ├── `tournaments.tsx`| Tab 2: Tournaments | Active tournament list and bracket exploration. |
| ├── `favorites.tsx` | Tab 3: Favorites | Saved teams, players, and bookmarked matches. |
| └── `profile.tsx` | Tab 4: Profile | User stats, referee match log, and settings entrypoint. |
| **`src/app/match/[id].tsx`** | Stack Screen | Match detail overview, spectator scores, and referee access button. |
| **`src/app/match/score/[id].tsx`**| Stack Screen | Full-screen interactive referee scorekeeper interface. |
| **`src/app/tournament/[id].tsx`**| Stack Screen | Tournament bracket, fixture tree, and participant roster. |
| **`src/app/settings.tsx`** | Modal / Stack | Unified settings screen (GDPR data deletion, theme, notification preferences). |

---

## 2. Packaging & Build Pipeline

- **EAS Build (Expo Application Services)**: Configured in `eas.json` for building Android `.aab` bundles and iOS `.ipa` archives.
- **OTA Updates (Expo Updates)**: Deploys urgent JavaScript bug fixes directly to user devices without requiring App Store or Google Play re-reviews.

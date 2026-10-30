# ScoreBoard Mobile — Detailed Implementation Plan

## Executive Summary

The **ScoreBoard Mobile App** is a cross-platform (iOS & Android) application built using **React Native with Expo** and backed by **Supabase**. It provides real-time live scoring, tournament bracket management, offline-first handheld referee consoles for multiple sports (Tennis, Padel, Volleyball, Beach Volleyball, Basketball, Football), and a social tracking feed with push notifications.

This document outlines the end-to-end phased implementation roadmap to achieve complete feature parity with `scoreboard-web` while optimizing for mobile ergonomics, offline resiliency, and native device capabilities.

---

## Architecture & Technology Blueprint

```
                      +---------------------------------------+
                      |         ScoreBoard Mobile             |
                      |   React Native / Expo (SDK 52+)       |
                      +-------------------+-------------------+
                                          |
         +--------------------------------+--------------------------------+
         |                                |                                |
+--------v---------+             +--------v---------+             +--------v---------+
|   Expo Router    |             |  Native Features |             |   State & Data   |
|  - Tabs Layout   |             |  - Expo Haptics  |             |  - Supabase Auth |
|  - Match Stacks  |             |  - Keep Awake    |             |  - Realtime WS   |
|  - Tourn. Stacks |             |  - Notifications |             |  - Offline Queue |
|  - Deep Linking  |             |  - Secure Store  |             |  - i18n (EN/PT)  |
+--------+---------+             +------------------+             +--------+---------+
         |                                                                 |
         +--------------------------------+--------------------------------+
                                          |
                      +-------------------v-------------------+
                      |      Supabase Backend Ecosystem       |
                      |  - PostgreSQL 15+ with RLS & Triggers |
                      |  - Edge Functions & Webhooks          |
                      |  - FCM / APNs Push Notifications      |
                      +---------------------------------------+
```

---

## Phased Implementation Roadmap

### Phase 1: Project Scaffolding & Core Foundations
* **Objective:** Establish the clean Expo project with TypeScript, routing, design tokens, and authentication client.
* **Key Tasks:**
  1. Initialize Expo project structure in `scoreboard-mobile`:
     ```bash
     npx create-expo-app@latest . --template blank-typescript
     ```
  2. Configure **Expo Router v4** (`app/` directory, `_layout.tsx`, root navigation stack).
  3. Set up **NativeWind v4** (Tailwind CSS for React Native) matching ScoreBoard dark theme tokens:
     - Canvas: `#0b0f19`
     - Card / Surface: `#151b2d`
     - Container High: `#1a2035`
     - Accents: Indigo `#4f46e5`, Emerald `#4edea3`, Amber `#f59e0b`
  4. Configure Supabase client (`lib/supabase/client.ts`):
     - Session persistence using `expo-secure-store`.
     - Auth state provider (`AuthProvider.tsx`) providing `user`, `session`, `signIn`, `signUp`, and `signOut`.
  5. Setup Internationalization (`lib/i18n`):
     - English (`en`) & Portuguese (`pt`) dictionaries matching web keys.
     - Device locale detection with manual in-app override.

---

### Phase 2: Navigation & Main Discovery Feed
* **Objective:** Deliver the bottom navigation bar and the main exploration interface.
* **Key Tasks:**
  1. **Tab Navigation Bar (`app/(tabs)/_layout.tsx`)**:
     - Custom styled bottom tab bar matching dark aesthetic.
     - Tabs: `Home` (Explore), `My Matches`, `My Tournaments`, `Notifications`, `Profile`.
     - Live unread notification badge indicator on the Notifications tab.
  2. **Top App Bar Component**:
     - Brand logo with digital scoreboard font styling.
     - Language selector modal / dropdown (EN & PT with flags).
     - Quick notification bell with count.
     - User avatar with auth status.
  3. **Home Page (`app/(tabs)/index.tsx`)**:
     - **Sport Filter Pills**: All, Basketball, Volleyball, Beach Volleyball, Football, Tennis, Padel.
     - **Search Bar**: Debounced text search by tournament name, team, or player.
     - **Status Filter**: All, Live, Upcoming, Finished.
     - **Segmented Views**:
       - *Matches*: Live cards with set scores, sport badges, pulse animations, and follow buttons.
       - *Tournaments*: Cards displaying format, date range, teams registered count.
       - *Following*: Aggregated feed of games and events followed by user.
     - **Pagination / Infinite Scroll**: Mobile `FlatList` with pull-to-refresh and unified `Pagination` footer.

---

### Phase 3: Match Details & Rules Management
* **Objective:** Allow spectators and players to view comprehensive live match details and progression.
* **Key Tasks:**
  1. **Match Detail Screen (`app/match/[id].tsx`)**:
     - Live header showing teams, scores, active period/set, and real-time pulse.
     - Follow button with optimistic state toggle (`useFollow`).
     - Share sheet integration via `expo-sharing` / React Native `Share`.
  2. **Detail Tabs**:
     - **Score Progress Tab**:
       - *Basketball*: Quarter-by-quarter points breakdown (Q1–Q4, OT), point evolution pills (+1 FT, +2 PT, +3 PT).
       - *Volleyball / Beach Volleyball*: Sets history, point-by-point pills, rallies count, side-outs count, service points count.
       - *Tennis / Padel*: Sets, games history, break points, server badges, game points progression (15/30/40/AD/tiebreak).
     - **Match Rules Tab**:
       - Court / venue name, round duration, shot clock, fouls bonus, format, advantage rules (Golden Point vs Standard Ad).
       - Organizer action: Open `RuleModal` to edit rules.
     - **Match Official Tab**:
       - Displays assigned umpire with verification badge.
       - Organizer tools: Search users by username/email to appoint an umpire or unassign.
  3. **Action Bar**:
     - "Start Scoreboard" button (restricted to match organizer or assigned umpire).
     - Navigates directly into the referee scoring console.

---

### Phase 4: Offline-First Handheld Referee Scoreboards
* **Objective:** Build dedicated, high-performance referee interfaces optimized for outdoor and court-side scoring.
* **Key Tasks:**
  1. **Scoreboard Shell (`app/match/[id]/scoreboard.tsx`)**:
     - Screen wake-lock enabled with `expo-keep-awake`.
     - Haptic feedback on button presses with `expo-haptics` (`impactAsync`, `notificationAsync`).
     - Role verification: Only allows appointed umpire or match organizer; displays warning state for unauthorized users.
     - Offline queue indicator (syncing status pill).
  2. **Tennis & Padel Console (`TennisScoreboard.tsx`)**:
     - Point buttons for Team 1 and Team 2.
     - Automatic scoring engine: 0 -> 15 -> 30 -> 40 -> Game / Deuce / Advantage.
     - Padel Golden Point toggle (decisive point at 40-40 without advantage).
     - Tiebreak mode (first to 7 points with 2-point lead).
     - Fault / Double Fault tracker, server indicator with court change alert.
     - Toss coin modal with server selection.
  3. **Volleyball & Beach Volleyball Console (`VolleyballScoreboard.tsx`)**:
     - Rally scoring (first to 21 or 25 with 2-point difference or cap).
     - Side-out tracking and automatic server rotation indicator.
     - Timeout tracking (T1 & T2 with visual countdown).
     - Set won advancement and match completion check.
  4. **Basketball Console (`BasketballScoreboard.tsx`)**:
     - Point scoring buttons (+1 Free Throw, +2 Field Goal, +3 Three Pointer).
     - Period management (Q1, Q2, Q3, Q4, OT).
     - Shot clock timer controls (24s and 14s reset triggers).
     - Team fouls tracking with bonus free throws indicator.
     - Game clock pause/play toggle.
     - "Undo" last event stack.
  5. **Football / Soccer Console (`FootballScoreboard.tsx`)**:
     - Goal logger modal with scorer selection and minute timestamp.
     - Card manager: Yellow and Red card logging with player selector.
     - Substitution tracking.
     - Halves management (1st Half, Halftime, 2nd Half, Stoppage Time).
  6. **Offline Scoring Synchronization Engine (`lib/offline/`)**:
     - Generate UUIDs client-side using `react-native-uuid`.
     - Apply optimistic state update immediately on UI.
     - If network call fails, serialize event to `AsyncStorage` under `offline_match_events`.
     - NetInfo listener flushes queued events sequentially when connection is restored.

---

### Phase 5: Tournament Hub, Brackets & Registration
* **Objective:** Enable tournament organization, group standings, bracket trees, and team registration on mobile.
* **Key Tasks:**
  1. **Tournament Hub (`app/tournament/[id]/index.tsx`)**:
     - Tournament header with status, dates, sport icon, and Follow button.
     - Organizer settings modal.
  2. **Group Standings Tab (`GroupStandingsView.tsx`)**:
     - Table displaying Rank, Team Name, Matches Played (P), Won (W), Lost (L), Sets/Points Differential, Total Points.
  3. **Group Matches Tab (`GroupMatchesView.tsx`)**:
     - Match list segmented by group (Group A, Group B, etc.) with live scores and status.
  4. **Interactive Bracket Tree (`TournamentBracket.tsx`)**:
     - Support for **Single Elimination** and **Double Elimination** (Winners Bracket, Losers Bracket, Grand Finals).
     - Built with `react-native-gesture-handler` and `react-native-reanimated` for smooth 2D panning and pinch-to-zoom navigation across tournament rounds.
     - Visual winner advancement lines and score pills.
  5. **Teams Roster Tab (`teams.tsx`)**:
     - List of confirmed teams with seed numbers.
  6. **Dynamic Signup Portal (`signup.tsx`)**:
     - Form dynamically generated based on tournament's `signup_schema` (JSONB) allowing participants to register directly from their phones.
  7. **Tournament Creation Wizard (`app/(tabs)/my-tournaments.tsx`)**:
     - Step 1: Sport & Tournament Name.
     - Step 2: Format (Single Elimination, Double Elimination, Group Stage).
     - Step 3: Max Teams, Dates & Court configuration.
     - Step 4: Pro-tier validation and automated bracket draw generation.

---

### Phase 6: Push Notifications, Profile & Production Packaging
* **Objective:** Complete social notification loops, deep links, user profile, and prepare production binaries.
* **Key Tasks:**
  1. **Push Notifications Integration (`lib/notifications/`)**:
     - Device token registration using `expo-notifications`.
     - Upsert token to `public.user_tokens` table on login.
     - Background notification handler with deep link dispatching:
       - Match score update / finish $\rightarrow$ opens `scoreboard://match/[id]`
       - Tournament announcement $\rightarrow$ opens `scoreboard://tournament/[id]`
  2. **In-App Notifications Screen (`app/(tabs)/notifications.tsx`)**:
     - Aggregated live notifications feed.
     - Real-time Supabase subscription on `public.notifications`.
     - Actions: Mark as Read, Delete, Clear All, Filter Unread.
  3. **User Profile & Settings (`app/(tabs)/profile.tsx`)**:
     - Match history, organized events, followed entities.
     - Settings: Language selector (EN/PT), notification preferences, Pro subscription status.
  4. **EAS Build Configuration (`eas.json`)**:
     - Configure build profiles: `development`, `preview` (TestFlight / APK), `production` (App Store / Google Play).
     - Configure OTA updates channel for instant bug fixes without App Store review delays.

---

## Deliverables & Milestones Summary

| Milestone | Deliverables | Target Completion | Status |
| :--- | :--- | :--- | :--- |
| **M1: Core Shell** | Expo project init, NativeWind styling, Supabase Auth via SecureStore, Base Navigation | Week 1 | ✅ Completed |
| **M2: Home & Explore** | Matches, Tournaments & Following feeds, Filter bar, i18n support, Follow system | Week 2 | ✅ Completed |
| **M3: Match Details** | Match detail view, set/quarter breakdowns, rules & umpire management | Week 3 | ✅ Completed |
| **M4: Live Scoreboards** | 5 sport consoles (Tennis, Padel, Volleyball, Basketball, Football), Haptics, KeepAwake, Offline sync queue | Week 4–5 | ✅ Completed |
| **M5: Tournaments & Brackets** | Group standings, group matches, pannable visual bracket trees, dynamic signup | Week 6 | ✅ Completed |
| **M6: Push & Polish** | Push notifications (FCM/APNs), deep linking, EAS build setup & App Store readiness | Week 7 | ✅ Completed |

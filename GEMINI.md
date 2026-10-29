# ScoreBoard Mobile — Architecture, Schema & Implementation Directives

This document defines the core architecture, full application scope, database schemas, real-time protocols, and engineering directives for the **ScoreBoard Mobile App** (iOS & Android).

---

## 1. Tech Stack & Mobile Foundations

* **Framework:** React Native with **Expo (SDK 52+)**
* **Navigation:** **Expo Router** (file-based navigation with tabs and nested stack layouts)
* **Language:** TypeScript (strict mode)
* **Styling & UI:** **NativeWind v4** (Tailwind CSS for React Native) matching the ScoreBoard design system:
  * Dark theme background palette: `#0b0f19` (canvas), `#151b2d` (surface-container), `#1a2035` (surface-container-high)
  * Accent colors: `#4f46e5` / `#6366f1` (primary indigo), `#4edea3` (secondary emerald), `#f59e0b` (amber warnings/tiebreaks)
  * Icons: `@expo/vector-icons` (Material Symbols, MaterialIcons, Feather) or `lucide-react-native`
* **Backend & Real-Time:** **Supabase Client (`@supabase/supabase-js`)**
  * PostgreSQL 15+ database
  * Supabase Auth with persistent session storage via `expo-secure-store`
  * Supabase Real-Time WebSocket channels for live match scoring and aggregated notification events
* **Offline-First & Native Capabilities:**
  * Network Detection: `@react-native-community/netinfo`
  * Persistent Storage: `@react-native-async-storage/async-storage` (queue & offline cache)
  * Secure Storage: `expo-secure-store` (tokens & sensitive session keys)
  * Push Notifications: `expo-notifications` (FCM / APNs integration with deep linking)
  * Referee Utilities: `expo-keep-awake` (prevent sleep during live refereeing), `expo-haptics` (tactile feedback on score buttons)
  * App Distribution: EAS Build (`.ipa` / `.aab`) and EAS Update (OTA JS updates)

---

## 2. Complete PostgreSQL Database Schema

The mobile client interfaces with the existing Supabase backend:

### 2.1 Core Tables
* **`users`**: `id` (UUID, auth.users ref), `username`, `email`, `subscription_tier` ('free' | 'pro'), `created_at`.
* **`tournaments`**: `id` (UUID), `organizer_id` (UUID), `name`, `sport_type` ('Tennis' | 'Padel' | 'Volleyball' | 'Beach Volleyball' | 'Basketball' | 'Football'), `status` ('pending' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'), `visibility` ('public' | 'unlisted' | 'private'), `start_date`, `end_date`, `settings` (JSONB), `signup_schema` (JSONB).
* **`tournament_participants`**: `id`, `tournament_id`, `team_id`, `name`, `seed`, `created_at`.
* **`matches`**: `id`, `tournament_id` (nullable), `organizer_id`, `umpire_id` (nullable), `sport_type`, `participants` (JSONB array), `status` ('scheduled' | 'ongoing' | 'completed' | 'cancelled'), `scheduled_at`, `court` (TEXT), `round_number`, `match_order`, `group_label` (TEXT), `bracket_type` ('winners' | 'losers' | 'final'), `settings` (JSONB), `scores` (JSONB), `created_at`, `updated_at`.
* **`match_events`**: `id` (UUID, client-generated), `match_id` (UUID), `event_data` (JSONB), `created_at`.
* **`follows`**: `id`, `user_id` (UUID), `entity_id` (UUID), `entity_type` ('match' | 'tournament' | 'team' | 'player' | 'competition'), `created_at`.
* **`notifications`**: `id`, `user_id` (UUID), `title`, `body`, `data` (JSONB containing `match_id`, `type`, `link`, etc.), `read_at`, `created_at`.
* **`user_tokens`**: `id`, `user_id` (UUID), `fcm_token` (TEXT), `platform` ('ios' | 'android' | 'web'), `created_at`, `updated_at`.

### 2.2 JSONB Data Structures

#### `matches.scores`
* **Tennis / Padel:**
  ```json
  {
    "sets": [{ "home": 6, "away": 4 }, { "home": 4, "away": 6 }, { "home": 6, "away": 3 }],
    "current": { "home": 2, "away": 1 },
    "tennis": {
      "games": [4, 3],
      "points": [3, 2],
      "is_tiebreak": false,
      "serving_index": 0
    }
  }
  ```
* **Volleyball / Beach Volleyball:**
  ```json
  {
    "sets": [{ "home": 25, "away": 22 }, { "home": 21, "away": 25 }],
    "current": { "home": 14, "away": 11 },
    "volleyball": {
      "current_set": 3,
      "timeouts": { "home": 1, "away": 0 },
      "serving_index": 1
    }
  }
  ```
* **Basketball:**
  ```json
  {
    "current": { "home": 84, "away": 79 },
    "basketball": {
      "period": "Q4",
      "quarters": [
        { "home": 22, "away": 20 },
        { "home": 18, "away": 24 },
        { "home": 26, "away": 18 },
        { "home": 18, "away": 17 }
      ],
      "fouls": { "home": 3, "away": 5 }
    }
  }
  ```
* **Football (Soccer):**
  ```json
  {
    "current": { "home": 2, "away": 1 },
    "football": {
      "half": 2,
      "stoppage_minutes": 3,
      "goals": [
        { "player": "Ronaldo", "team_index": 0, "minute": 23 },
        { "player": "Messi", "team_index": 1, "minute": 55 },
        { "player": "Fernandes", "team_index": 0, "minute": 88 }
      ]
    }
  }
  ```

---

## 3. Full Application Scope & Screen Mapping

The mobile app must implement 100% parity with the web scope:

### 3.1 Tab Bar Structure (`app/(tabs)/_layout.tsx`)
1. **Home / Explore (`index.tsx`)**:
   - Top Header: Brand Logo, Language Selector dropdown (EN/PT), Notification Bell with live badge, Profile icon.
   - Filter bar: Sport selector pills (All, Basketball, Volleyball, Beach Volleyball, Football, Tennis, Padel), Search input, Status filter, Sort by date.
   - 3 Segmented Tabs:
     - **Matches**: Live & upcoming games with scores, sets, sport icons, status pills, and direct Follow button.
     - **Tournaments**: Active & scheduled tournaments with format, dates, teams count, and Follow button.
     - **Following**: Aggregated real-time feed of all followed matches and tournaments.
   - Pagination / Infinite scrolling with unified controls.
2. **My Matches (`my-matches.tsx`)**:
   - Matches organized, umpired, or played by the user.
   - Quick match creation modal (Sport, Teams/Players, Venue, Rules).
3. **My Tournaments (`my-tournaments.tsx`)**:
   - Tournament cards created by the user with Pro-tier status badge.
   - Multi-step Tournament Creation Wizard (Sport, Name, Stage 1 Format, Max Teams, Dates, Custom Registration Schema).
4. **Notifications (`notifications.tsx`)**:
   - Notification feed with live Supabase channel updates.
   - Aggregated notifications per match (updates score in-place when a game advances).
   - Filter by All / Unread, Mark as Read, Delete, and Tap-to-Navigate.
5. **Profile & Settings (`profile.tsx`)**:
   - User profile stats (matches umpired, tournaments created, teams followed).
   - Language selector (EN / PT).
   - Theme toggle, Notification toggles, Sign In / Sign Up / Sign Out.

### 3.2 Detail & Control Screens
1. **Match Detail (`match/[id].tsx`)**:
   - Dynamic score header with live pulse and team initials/avatars.
   - Set-by-set or Quarter-by-quarter breakdown.
   - 3 Segmented Tabs:
     - **Score Progress**: Point-by-point progression pills, rallies, breaks, shots.
     - **Match Rules**: Court/venue, format, max sets, shot clock, fouls, Golden Point.
     - **Match Official**: Assigned umpire status; Organizer can search and assign umpires.
   - Action Bar: "Start Scoreboard" (Organizers/Umpires), "Match Completed", or "Follow".
2. **Handheld Referee Scoreboard (`match/[id]/scoreboard.tsx`)**:
   - Fullscreen landscape & portrait support with `expo-keep-awake`.
   - Dedicated scoreboards per sport:
     - **Tennis & Padel**: Point / Game / Set buttons, Fault/Ace, Server indicator, Tiebreak mode, Golden Point (No-Ad), Toss Coin.
     - **Volleyball & Beach Volleyball**: Point scoring, Rally vs Side-out tracking, Timeouts, Server rotation, Sets won.
     - **Basketball**: +1 (Free Throw), +2 (Field Goal), +3 (Three Pointer), Team fouls, Quarter advance, Shot clock controls (24s / 14s), Game clock timer pause/play, Undo event.
     - **Football**: Goal logger (scorer, minute), Yellow/Red cards, Substitutions, Half time controls, Stoppage time.
   - Offline queue badge: Displays pending events syncing status.
3. **Tournament Hub (`tournament/[id]/index.tsx`)**:
   - **Standings Tab**: Real-time group standings (Rank, Team, P, W, L, Sets, Pts).
   - **Matches Tab**: Matches grouped by group label (Group A, Group B, etc.) or round.
   - **Brackets Tab**: Interactive pannable/zoomable visual bracket tree for Single Elimination & Double Elimination.
   - **Teams Tab**: Registered roster list with seeds.
   - **Settings Tab**: Organizer controls (visibility, rule overrides, date scheduling).
4. **Public Tournament Signup (`tournament/[id]/signup.tsx`)**:
   - Dynamic schema-driven registration form for teams/players.
5. **Public User Profile (`user/[username].tsx`)**:
   - Public view of any player or organizer with match history and tournament records.

---

## 4. Mobile Architecture Directives

### 4.1 Offline-First Scoring Protocol
Referee consoles operate in noisy sporting environments with intermittent cellular/WiFi connection:
1. **Local UUID Generation:** Generate event UUIDs client-side using `react-native-uuid` before database insertion.
2. **Optimistic UI Execution:** Apply score state mutations immediately to local state and trigger `expo-haptics`.
3. **Offline Event Queue:** When an insert fails (network error or timeout), serialize the event into `AsyncStorage` under `scoreboard_offline_queue`.
4. **Reconnection Sync:** Listen to network state changes using `@react-native-community/netinfo`. Upon connectivity restoration, drain the queue in chronological order via batch RPC or sequential inserts.

### 4.2 Real-Time WebSocket Directives
* Subscribe to the specific match via `@supabase/supabase-js`:
  ```typescript
  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
      (payload) => updateLocalMatch(payload.new)
    )
    .subscribe();
  ```
* Automatically handle background/foreground app state transitions using React Native's `AppState` API: unsubscribe when backgrounded (unless live scoring) and resync on resume.

### 4.3 Push Notifications & Device Token Management
* Request permissions using `expo-notifications`.
* Retrieve Expo Push Token / FCM Token and upsert to `public.user_tokens` with `user_id` and platform identifier.
* Configure notification response listener: tapping a notification deep-links directly to `/match/[matchId]` or `/tournament/[tournamentId]`.

### 4.4 Internationalization (i18n)
* Synchronized with `scoreboard-web` dictionaries: Portuguese (`pt`) and English (`en`).
* Shared translations for sports, match statuses, tennis/padel terminology, volleyball rallies, basketball quarters, and common actions.
* Default language determined by device locale (`getLocales()` from `expo-localization`) with in-app manual toggle persisted in `AsyncStorage`.

---

## 5. Implementation Standards & Best Practices

1. **Strict Type Safety:** Reuse TypeScript models for database tables, scoring JSONB structures, and navigation parameters.
2. **Modular Code Organization:**
   ```
   scoreboard-mobile/
   ├── app/                      # Expo Router pages and tabs
   │   ├── (tabs)/               # Bottom tab bar routes
   │   ├── match/                # Match detail & scoreboard screens
   │   ├── tournament/           # Tournament hub & brackets
   │   └── user/                 # Profile screens
   ├── components/               # Reusable UI components
   │   ├── scoreboards/          # Sport-specific scoreboard engines
   │   ├── tournament/           # Bracket and standings components
   │   └── ui/                   # Buttons, Modals, Cards, Badges
   ├── lib/
   │   ├── supabase/             # Supabase client & auth helpers
   │   ├── scoring/              # Shared scoring logic & engines
   │   ├── offline/              # Queue manager & NetInfo sync
   │   ├── notifications/        # Push notification setup
   │   └── i18n/                 # Dictionaries and LanguageContext
   ├── assets/                   # Fonts, icons, splash screens
   └── app.json                  # Expo configuration
   ```
3. **Performance Optimization:**
   - Use `FlatList` with `getItemLayout`, `maxToRenderPerBatch`, and `windowSize` for infinite feeds.
   - Use React Native Reanimated for smooth bracket panning/zooming and live score transition animations.

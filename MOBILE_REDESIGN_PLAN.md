# ScoreBoard Mobile — Precision Sports Telemetry Redesign Plan

This plan establishes full visual, architectural, and behavioral parity between `scoreboard-mobile` (Expo / React Native) and the unslop redesign executed on `scoreboard-web` on the `feat/unslop-redesign` branch (**Precision Sports Telemetry**), including the latest architectural abstractions (`ScoreboardLayout`, shared entity list/table formatters), atmospheric court backgrounds, broadcast crimson live status, monochrome telemetry tokens, and streamlined notification state.

---

## 1. Executive Summary & Design System Foundation

### 1.1 Core Philosophy: Precision Sports Telemetry
- **Eliminate AI-Slop**: Remove generic purple-blue glow palettes (`#0c1324`, `#151b2d`), purple-tinted sport icons, neon drop shadows, flex-wrap pill chips, vibrating badge animations, arbitrary team-colored dots, and asymmetric team button colors.
- **Deep Ink Neutral Ramp**: Use true dark-mode neutral ink tones (`#0b0d14` background, `#11141c` surface container, `#161a24` surface high) with 1px hairline subtle borders (`rgba(238, 240, 245, 0.08)`).
- **Broadcast Crimson Live Status**: Adopt **Broadcast Crimson** (`#f43f5e` / `rose-500`) as the universal `LIVE` / `EM DIRETO` pulsing indicator dot and notification badge color across all match views, cards, list items, brackets, and tab bars (replacing green/purple live dots).
- **Monochrome Telemetry Accents**: Neutralize tiebreak numbers, trophy icons, table headers, follow buttons, sport icons, and active tab indicator dots to crisp monochrome `onSurface` (`#eef0f5`) / `onSurfaceVariant` (`#a3a9b8`) tokens.
- **Brand Typography**: `Digital7` (`font-digital`) is the signature brand typography for match scores, clocks, shot clocks, set breakdowns, and telemetry tables. Regular text uses clean sans-serif with tabular numbers (`tabular-nums`) for rankings, dates, and stats.
- **Shared Architectural Primitives**: Avoid per-screen duplication by extracting shared `ScoreboardLayout` primitives across all 4 sports and shared entity list/score formatters (`entityFormatters.ts`) across all match/tournament feeds.
- **Atmospheric Court Background**: Subtle sport-specific (or randomized on feeds) court background `.webp` layer (`MatchAtmosphereBackground`) behind deep ink overlays.
- **Unified Action CTAs & Docked Filter Bar**: High-contrast primary action buttons (`+ Novo Jogo` / `+ Novo Torneio`) positioned directly alongside the List/Cards view mode switchers, paired with a docked telemetry filter bar.

### 1.2 Design Tokens (`src/constants/theme.ts`)
```tsx
export const ScoreBoardTheme = {
  /* Ink Neutral Ramp */
  background: '#0b0d14',
  surface: '#0b0d14',
  surfaceDim: '#07080d',
  surfaceContainerLowest: '#07080d',
  surfaceContainerLow: '#0f121a',
  surfaceContainer: '#11141c',
  surfaceContainerHigh: '#161a24',
  surfaceContainerHighest: '#1a1e28',
  onSurface: '#eef0f5',
  onSurfaceVariant: '#a3a9b8',
  textMuted: '#7a8296',

  /* Brand & Status Accents */
  primary: '#6366f1',
  primaryContainer: '#4f46e5',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#eef0f5',
  secondary: '#4cc38a',
  secondaryContainer: '#15803d',
  tertiary: '#f59e0b',
  tertiaryContainer: '#b45309',
  liveCrimson: '#f43f5e',
  error: '#e5484d',
  errorContainer: '#991b1b',
  gold: '#f59e0b',

  /* Hairline Borders */
  borderGhost: 'rgba(238, 240, 245, 0.05)',
  borderSubtle: 'rgba(238, 240, 245, 0.08)',
  borderAccent: 'rgba(99, 102, 241, 0.25)',
} as const;

export const Typography = {
  digital: {
    fontFamily: 'Digital7',
  },
  tabularNums: {
    fontVariant: ['tabular-nums' as const],
  },
} as const;
```

---

## 2. Phase-by-Phase Implementation Blueprint

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRECISION TELEMETRY STACK                       │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Tokens, Atmosphere & Shell (theme, backgrounds, TopBar, tabs) │
│ Phase 2: Discovery & Shared Lists   (entity formatters, docked bar)    │
│ Phase 3: Match Detail               (hero, breakdown, play-by-play)    │
│ Phase 4: Scoreboard Architecture    (ScoreboardLayout + 4 sports)      │
│ Phase 5: Tournament Hub             (bracket, standings, signup flow)  │
│ Phase 6: My Matches & Tournaments   (shared columns, status tabs, CTAs)│
│ Phase 7: Notifs, Follow & Settings  (pending invites, terms, status)   │
│ Phase 8: Modals & Shared Controls   (UpgradeModal, LanguageSelector)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Tokens, Atmospheric Backgrounds & Global Shell

- **Target Files**:
  - `scoreboard-mobile/src/constants/theme.ts`
  - `scoreboard-mobile/assets/backgrounds/*.webp` *(new — copy 12 portrait/landscape assets from `scoreboard-web/public/backgrounds/`)*
  - `scoreboard-mobile/src/components/match/MatchAtmosphereBackground.tsx` *(new)*
  - `scoreboard-mobile/src/app/_layout.tsx`
  - `scoreboard-mobile/src/app/(tabs)/_layout.tsx`
  - `scoreboard-mobile/src/components/TopBar.tsx`
  - `scoreboard-mobile/src/components/SportIcon.tsx`

- **Key Tasks**:
  1. **Typography, Crimson & Monochrome Tokens**:
     - `Digital7` (`assets/fonts/digital-7.ttf`) is registered in `RootLayout`.
     - Expose `Typography.digital`, `Typography.tabularNums`, and `ScoreBoardTheme.liveCrimson` (`#f43f5e`) in `theme.ts`.
     - Remove all obsolete purple-blue color codes (`#0c1324`, `#151b2d`, `#232d4b`).
  2. **Atmospheric Court Background (`MatchAtmosphereBackground.tsx`)**:
     - Bundle the 12 `.webp` court assets (`football`, `tennis`, `beach_volleyball`, `volleyball`, `basketball`, `padel` in `portrait` and `landscape`).
     - Support specific `sportType` (for Match Detail and Scoreboards with `spectator` vs `umpire` opacity) and `sportType="random"` (for Discovery, My Matches, and My Tournaments feeds).
     - Render as an absolute, pointer-events-none background layer with deep ink gradient/scrim so text contrast remains crisp.
  3. **Neutralize Sport Icons (`SportIcon.tsx`)**:
     - Remove purple tinting from all vector sport icons; default to `textMuted` / `onSurface` tokens.
  4. **TopBar Polish (`src/components/TopBar.tsx`)**:
     - Ink background (`#0b0d14`), subtle hairline bottom border (`borderSubtle`).
     - ScoreBoard logo with clean telemetry tracking.
     - Notification bell with crimson unread indicator dot.
     - Standardized back button with 44px minimum tap target.
  5. **Bottom Tab Bar (`src/app/(tabs)/_layout.tsx`)**:
     - Deep ink surface (`#0b0d14`), hairline top border (`borderSubtle`).
     - Active tab indicator dot in crisp monochrome `onSurface` (`#eef0f5`), NOT purple.
     - Notification badge in crimson `error` (`#e5484d`).

---

### Phase 2: Discovery Feed & Shared Entity List Architecture

- **Target Files**:
  - `scoreboard-mobile/src/lib/utils/entityFormatters.ts` *(new — parity with `scoreboard-web/components/entityTableColumns.tsx`)*
  - `scoreboard-mobile/src/app/(tabs)/index.tsx`
  - `scoreboard-mobile/src/components/SportFilterBar.tsx`
  - `scoreboard-mobile/src/components/MatchCard.tsx`
  - `scoreboard-mobile/src/components/MatchListItem.tsx`
  - `scoreboard-mobile/src/components/FollowButton.tsx`

- **Key Tasks**:
  1. **Shared Entity Formatters (`entityFormatters.ts`)**:
     - Centralize match score extraction (`formatMatchScore`), short date formatting (`formatShortDate`), tournament format labels, and `EntityStatusCell` logic (Broadcast Crimson `liveCrimson` pulsing dot for `ongoing`, muted text for `scheduled`/`completed`).
     - Reuse these helpers across Home, Tournaments, Following, My Matches, My Tournaments, and User Profile to eliminate duplicated formatting logic.
  2. **Docked Telemetry Filter Bar (`SportFilterBar.tsx` & `index.tsx`)**:
     - Single horizontal scrollable row with sport chips, date/live filter, and docked container styling (`surfaceContainer`, `borderSubtle`).
     - Clean active chip styling: `surfaceContainerHighest` with `borderSubtle` and monochrome `onSurface` text.
  3. **Aligned Action Controls & View Mode Toggle**:
     - Position the primary CTA button (`+ Novo Jogo` in Matches tab, `+ Novo Torneio` in Tournaments tab) directly alongside the View Mode Switcher (`list` vs `cards`).
     - Styled identically to web: `onSurface` (`#eef0f5`) background, `surfaceContainerLowest` (`#07080d`) text, rounded-lg, 12px font medium.
     - **Default to compact list view** (`list`) matching web parity.
  4. **Remove Arbitrary Team Dots & Adopt Broadcast Crimson**:
     - Remove colored dots next to team names in `MatchCard` and `MatchListItem`.
     - Use Broadcast Crimson (`#f43f5e`) exclusively for `LIVE` / `EM DIRETO` status indicators.
  5. **Monochrome `FollowButton.tsx`**:
     - Unslop follow/favorite toggle button using crisp monochrome telemetry tokens (`surfaceContainerHigh`, `borderSubtle`, `onSurface` when active).

---

### Phase 3: Match Detail & Play-by-Play Telemetry

- **Target Files**:
  - `scoreboard-mobile/src/app/match/[id].tsx`
  - `scoreboard-mobile/src/components/match/PlayByPlayTable.tsx` *(new)*
  - `scoreboard-mobile/src/components/RuleModal.tsx`

- **Key Tasks**:
  1. **Stable Hero Telemetry Card + Atmospheric Backdrop**:
     - Mount `MatchAtmosphereBackground` with the match's `sport_type` behind the scroll container.
     - Keep the match detail hero card solid and stable (no oscillating sticky-collapse animations).
     - Remove arbitrary team dots; show balanced Home and Away team names and center `Digital7` score module with Broadcast Crimson `LIVE` dot when ongoing.
  2. **Neutralized Match Detail Elements**:
     - Neutralize tiebreak superscript numbers, winner trophy icons, and set/quarter table headers to crisp monochrome/ink tokens (no flashy purple/gold slop).
     - Unslop Tennis/Padel set and game breakdown view (`Sets` table + chronological `Games` history).
  3. **Detail Tabs Bar**:
     - Segmented switch: `[ Progresso / Telemetria ] [ Regras ] [ Árbitro ]` inside `surfaceContainer` with `borderSubtle`.
  4. **Eliminate Slop Event Pills -> Structured Play-by-Play Tables**:
     - **Basketball**: Quarters breakdown table + expandable quarter accordions with chronological baskets (score progression in `Digital7`, team name, action description, delta badge).
     - **Tennis / Padel**: Sets breakdown table + Games history log (server indicator, game winner, points sequence).
     - **Football**: Half-time telemetry breakdown + Goals chronological log (minute badge, scoring team, score after goal).
     - **Volleyball**: Sets breakdown table + set points progression timeline.
  5. **Official, Rules & Launcher CTA**:
     - Clean umpire assignment card, structured rules table, and fixed bottom `[ Iniciar Marcador / Abrir Consola de Árbitro ]` button.

---

### Phase 4: Shared Scoreboard Architecture & 4 Sport Consoles

- **Target Files**:
  - `scoreboard-mobile/src/components/scoreboards/ScoreboardLayout.tsx` *(new — parity with `scoreboard-web/components/scoreboard/ScoreboardLayout.tsx`)*
  - `scoreboard-mobile/src/app/match/[id]/scoreboard.tsx` (Container)
  - `scoreboard-mobile/src/components/scoreboards/BasketballScoreboard.tsx`
  - `scoreboard-mobile/src/components/scoreboards/FootballScoreboard.tsx`
  - `scoreboard-mobile/src/components/scoreboards/TennisScoreboard.tsx`
  - `scoreboard-mobile/src/components/scoreboards/VolleyballScoreboard.tsx`

- **Key Tasks**:
  1. **Shared `ScoreboardLayout` & `ScoreboardProvider` (`ScoreboardLayout.tsx`)**:
     - Extract shared mobile layout shells mirroring web's `ScoreboardLayout.tsx` (`commit 80944e9`):
       - `ScoreboardProvider`: Context passing `onBack` and `onOpenObs` down to the compact landscape header.
       - `ScoreboardHeader`: Standard portrait/tablet top banner (hidden in compact landscape).
       - `ScoreboardMainCard`: Unified 3-column command center with `compactHeader` bar (back, sport icon, sport • event, status badge, OBS, finish), `leftActions` / `rightActions` slots (rendered as **40×40 square side-rail action buttons** flanking the team columns in landscape), and center telemetry column.
       - `ScoreboardTeamColumn`: Unified `teamName`, `subLabel` (serving/home/away), `Digital7` `score`, and bottom stat `pills`.
       - `ScoreboardActionButton`: 4 variants — `primary` (crisp monochrome `onSurface` `#eef0f5` with dark `#07080d` text), `secondary` (`surfaceContainerHigh` + `borderSubtle`), `warning` (amber), `danger` (crimson/rose).
       - `ScoreboardSummaryCard` & `ScoreboardFinalizeButton` (hidden in compact landscape).
     - Inside each sport component, extract a parameterized `renderTeamColumn(idx: 0 | 1)` helper so Home and Away quadrants share a single code path.
  2. **Scoreboard Router Shell (`src/app/match/[id]/scoreboard.tsx`)**:
     - Wrap sport scoreboard in `ScoreboardProvider` (`onBack`, `onOpenObs`).
     - Landscape orientation lock on mount, restore portrait on unmount, `useKeepAwake`, `MatchAtmosphereBackground` in `umpire` mode, `OfflineSyncBadge`, and spectator banner.
  3. **Symmetrical Scoring Action Pads**:
     - **Eliminate color asymmetry**: Replace home=purple / away=green buttons.
     - Both Home and Away teams use identical `ScoreboardActionButton` hierarchies (`primary` monochrome `#eef0f5` / `#07080d` for scoring, `secondary` `surfaceContainerHigh` for correction/undo, `warning`/`danger` for fouls/cards).
  4. **Sport-Specific Telemetry Consoles**:
     - **Basketball**: Quarter game clock & 24s/14s shot clock in `Digital7`, team fouls, timeouts, possession arrow, symmetrical `+1 / +2 / +3` and `-1`.
     - **Football**: Match timer & stoppage badge in `Digital7`, symmetrical `+ Golo` and `-1`, quick card/sub logger.
     - **Tennis & Padel**: Games box & points box (`0, 15, 30, 40, AD`) in `Digital7`, serving/receiver badge, Golden Point / Advantage indicator, set navigator.
     - **Volleyball**: Target points box, serving indicator dot, set breakdown, timeouts, set-point / match-point indicator.

---

### Phase 5: Tournaments Hub, Bracket & Management

- **Target Files**:
  - `scoreboard-mobile/src/lib/csvTeams.ts` *(new — port from `scoreboard-web/lib/csvTeams.ts`)*
  - `scoreboard-mobile/src/app/(tabs)/tournaments.tsx`
  - `scoreboard-mobile/src/app/tournament/[id]/index.tsx`
  - `scoreboard-mobile/src/app/tournament/[id]/signup.tsx`
  - `scoreboard-mobile/src/app/tournament/[id]/teams.tsx`
  - `scoreboard-mobile/src/components/TournamentCard.tsx`
  - `scoreboard-mobile/src/components/tournament/TournamentBracketView.tsx`
  - `scoreboard-mobile/src/components/tournament/GroupStandingsView.tsx`
  - `scoreboard-mobile/src/components/tournament/TournamentSettingsModal.tsx`
  - `scoreboard-mobile/src/components/tournament/CreateTournamentModal.tsx`

- **Key Tasks**:
  1. **Tournaments Feed (`tournaments.tsx`)**:
     - View mode toggle (`list` vs `cards`), sport filter bar, status filter (`all`, `open`, `ongoing`, `completed`), aligned `+ Novo Torneio` CTA, and unsloped `TournamentCard.tsx`.
  2. **Tournament Detail Screen (`tournament/[id]/index.tsx`)**:
     - Hero telemetry summary card, 5 clean tabs (`[ Jogos ] [ Classificação ] [ Chave / Bracket ] [ Equipas ] [ Regras ]`), team registration & bracket generation CTAs.
  3. **High-Contrast Bracket View (`TournamentBracketView.tsx`)**:
     - High-visibility 1.5px connector lines (`rgba(238, 240, 245, 0.20)`), Broadcast Crimson live dots, `Digital7` scores, advancing winner highlight, stage headers.
  4. **Group Standings Telemetry Table (`GroupStandingsView.tsx`)**:
     - Tabular numbers (`#`, `Equipa`, `J`, `V`, `D`, `+/-`, `Pts`), green qualifying rank indicator bar (`#4cc38a`) for top 2, alternating row tinting.
  5. **CSV Team Import / Export (`src/lib/csvTeams.ts` & `tournament/[id]/index.tsx`)**:
     - Port `parseTeamCsv`, `buildCsvTemplate`, and `buildParticipantsCsv` from `scoreboard-web/lib/csvTeams.ts`.
     - Add organizer **Import CSV** modal (template download/share, `.csv` file picker or paste input, live validation preview of valid teams and row errors, capacity cap against `remainingTeamSlots`) and **Export CSV** action.
  6. **Team Registration (`signup.tsx`), Teams Roster (`teams.tsx`) & Settings Modals**:
     - Multi-step unslop registration form (using standardized `DropdownSelect`), clean roster list, and unsloped `CreateTournamentModal` / `TournamentSettingsModal`.

---

### Phase 6: My Matches & My Tournaments Parity

- **Target Files**:
  - `scoreboard-mobile/src/app/(tabs)/my-matches.tsx`
  - `scoreboard-mobile/src/app/(tabs)/my-tournaments.tsx`

- **Key Tasks**:
  1. **Shared Formatters & Atmospheric Backdrop**:
     - Use `MatchAtmosphereBackground` (`sportType="random"`) and shared `entityFormatters.ts` for consistent telemetry rows.
  2. **Aligned Header Controls & Primary CTAs**:
     - Align `+ Novo Jogo` / `+ Novo Torneio` (`t("common.newMatch")` / `t("common.newTournament")`) side-by-side with the View Mode Toggle (`list` vs `cards`), supporting `?create=true` deep-linking.
  3. **Status Tabs & Role Filters**:
     - Status tabs (`Todos`, `Em Curso`, `Agendados`, `Concluídos`) and role filters (`Todos`, `Organizador`, `Árbitro`, `Jogador`).
  4. **View Mode Parity & Quick Actions**:
     - Default to compact list view (`MatchListItem` with `Digital7` scores and Broadcast Crimson live dot), inline `[ Consola de Árbitro ]`, `[ Detalhes ]`, `[ Eliminar ]`, and unsloped empty states.

---

### Phase 7: Notifications, Following, Profile & Settings

- **Target Files**:
  - `scoreboard-mobile/src/lib/hooks/useNotifications.ts` *(new or updated — parity with `scoreboard-web/lib/hooks/useNotifications.ts`)*
  - `scoreboard-mobile/src/app/(tabs)/notifications.tsx`
  - `scoreboard-mobile/src/app/(tabs)/following.tsx`
  - `scoreboard-mobile/src/app/(tabs)/profile.tsx`
  - `scoreboard-mobile/src/app/user/[username].tsx`

- **Key Tasks**:
  1. **Notifications Hook & Pending Invitation Accuracy (`useNotifications.ts`)**:
     - Track `pendingInvitationMatchIds` against the `matches` table (`umpire_id === userId && umpire_invite_status === "pending"`) so accept/decline buttons only appear for genuinely pending invitations.
     - Optimistically update state and broadcast `INVITATION_HANDLED` on accept/decline.
  2. **Streamlined Minimal Notification Card Layout (`notifications.tsx`)**:
     - Entire card is tappable to navigate to the match/tournament.
     - Top row: Category icon + relative timestamp on left, Broadcast Crimson unread dot or neutralized accept/decline buttons on right.
     - Clean 2-line title; no redundant nested footer strips.
  3. **Following Feed (`following.tsx`)**:
     - Parity with home feed: view mode toggle, sport filter, status filter, shared `entityFormatters.ts`, Broadcast Crimson live dots.
  4. **System Status Telemetry, Terms & Footer Parity (`profile.tsx`)**:
     - **System Operational Status Badge**: `[ 🟢 SISTEMA OPERACIONAL ]` (`t("footer.statusOnline")`).
     - **Terms & Privacy**: Dedicated unsloped view/modal (`t("footer.terms")`).
     - **Platform Tagline & Copyright**: `t("footer.tagline")` and `© 2026 ScoreBoard · t("footer.allRightsReserved")`.
     - Grouped telemetry settings cards (Perfil, Preferências, Áudio & Vibração, Idioma, Segurança).
  5. **User Public Profile (`user/[username].tsx`)**:
     - Telemetry user stats and shared match list items (no arbitrary team dots, Broadcast Crimson live status).

---

### Phase 8: Modals, Dialogs & Shared Component System

- **Target Files**:
  - `scoreboard-mobile/src/components/common/DropdownSelect.tsx` *(standardize `field` & `inline` variants — parity with `scoreboard-web/components/SelectField.tsx`)*
  - `scoreboard-mobile/src/components/match/CreateMatchModal.tsx`
  - `scoreboard-mobile/src/components/subscription/UpgradeModal.tsx` *(if present / parity with web `8cfc4f8`)*
  - `scoreboard-mobile/src/components/LanguageSelector.tsx` *(parity with web `202d494`)*
  - `scoreboard-mobile/src/components/AuthModal.tsx`
  - `scoreboard-mobile/src/components/RuleModal.tsx`
  - `scoreboard-mobile/src/components/common/FeedbackModal.tsx`
  - `scoreboard-mobile/src/components/OfflineSyncBadge.tsx`
  - `scoreboard-mobile/src/components/Pagination.tsx`

- **Key Tasks**:
  1. **Unified Modal Anatomy**:
     - `rgba(0, 0, 0, 0.75)` backdrop, `ScoreBoardTheme.surfaceContainer` modal card, 1px hairline `borderSubtle`, `borderRadius: 20`, clean title + close icon button.
  2. **Standardized Dark Dropdown Select (`DropdownSelect.tsx`)**:
     - Mirror `SelectField.tsx` with `variant="field"` (form inputs) and `variant="inline"` (toolbar filters like status/sport/date), crisp checkmark on selected item, and `surfaceContainer` popover/sheet.
  3. **Unslop UpgradeModal & LanguageSelector**:
     - Strip gradient slop from Pro Organizer `UpgradeModal`; use crisp ink surface, monochrome feature checkmarks, and high-contrast primary CTA.
     - Unslop `LanguageSelector` with compact surface container and subtle active indicator.
  4. **Standard Button Hierarchy & Inputs**:
     - Primary (`onSurface` `#eef0f5` with dark `#07080d` text for feed/scoreboard CTAs, or `#6366f1` / `#4f46e5` for form submits), Secondary (`surfaceContainerHigh` + `borderSubtle`), Destructive (`error` `#e5484d`), Ghost (`textMuted`).

---

## 3. Progress Tracking & Verification Matrix

| Area | Component / Screen | Priority | Status | Verification Criteria |
| :--- | :--- | :---: | :---: | :--- |
| **Theme & Tokens** | `src/constants/theme.ts` | **P0** | **In Progress** | Ink ramp, `liveCrimson` (`#f43f5e`), `Digital7` & `tabularNums` helpers |
| **Typography** | `src/app/_layout.tsx` | **P0** | **Done** | `Digital7` font registered & loaded in root layout |
| **i18n Sync** | `src/lib/i18n/locales/*.ts` | **P0** | **In Progress** | Footer keys synced; add `common.newMatch` & `common.newTournament` |
| **Atmosphere Assets** | `assets/backgrounds/*.webp` + `MatchAtmosphereBackground` | **P0** | **Pending** | 12 court `.webp` files bundled; supports `sportType` & `"random"` |
| **Global Navigation** | `src/app/(tabs)/_layout.tsx` | **P0** | **In Progress** | Ink surface, monochrome active dot (`onSurface`), crimson notif badge |
| **TopBar & Icons** | `TopBar.tsx`, `SportIcon.tsx` | **P0** | **In Progress** | Remove purple tint from sport icons; crimson unread dot |
| **Shared Formatters** | `src/lib/utils/entityFormatters.ts` | **P1** | **Pending** | Shared score/date/status helpers replacing duplicated list logic |
| **Home Feed** | `src/app/(tabs)/index.tsx` | **P1** | **In Progress** | Docked filter bar, default list view, `+ Novo Jogo`, crimson live dots |
| **Match List & Card** | `MatchListItem.tsx`, `MatchCard.tsx` | **P1** | **In Progress** | Remove arbitrary team dots; crimson live status; `Digital7` scores |
| **Follow Button** | `src/components/FollowButton.tsx` | **P1** | **Pending** | Crisp monochrome telemetry tokens |
| **Match Detail** | `src/app/match/[id].tsx` | **P1** | **In Progress** | Atmosphere bg, neutralized tiebreaks/trophies, unsloped tennis breakdown |
| **Play-by-Play Table** | `src/components/match/PlayByPlayTable.tsx` | **P1** | **Pending** | Structured telemetry table replacing slop tag pills |
| **Scoreboard Layout** | `src/components/scoreboards/ScoreboardLayout.tsx` | **P1** | **Pending** | `ScoreboardProvider`, `compactHeader`, `TeamColumn`, square side-rail `ActionButton` |
| **Scoreboard Console** | `src/app/match/[id]/scoreboard.tsx` | **P1** | **In Progress** | `ScoreboardProvider`, landscape lock, umpire atmosphere bg, sync badge |
| **4 Sport Scoreboards** | `Basketball`, `Football`, `Tennis`, `Volleyball` | **P1** | **Pending** | Use `ScoreboardLayout` + `renderTeamColumn`, `Digital7`, monochrome primary pads |
| **Tournaments Feed** | `src/app/(tabs)/tournaments.tsx` | **P2** | **Pending** | List/card switcher, docked filters, `+ Novo Torneio` CTA |
| **Tournament Card** | `src/components/TournamentCard.tsx` | **P2** | **In Progress** | Telemetry badges, format, dates, location |
| **Tournament Detail** | `src/app/tournament/[id]/index.tsx` | **P2** | **Pending** | Hero telemetry summary, 5 clean tabs, CSV import/export, registration CTA |
| **CSV Team Import/Export** | `src/lib/csvTeams.ts` | **P2** | **Pending** | `parseTeamCsv`, `buildCsvTemplate`, `buildParticipantsCsv` + modal |
| **Tournament Bracket** | `src/components/tournament/TournamentBracketView.tsx` | **P2** | **Pending** | High-contrast connector lines, `Digital7` scores, crimson live dots |
| **Group Standings** | `src/components/tournament/GroupStandingsView.tsx` | **P2** | **In Progress** | Tabular numbers, green qualification bar indicator |
| **Signup & Teams** | `signup.tsx`, `teams.tsx` | **P2** | **Pending** | Multi-step unslop form, roster list, validation |
| **My Matches & Tours** | `my-matches.tsx`, `my-tournaments.tsx` | **P2** | **Pending** | Atmosphere bg, shared formatters, status/role tabs, aligned CTAs |
| **Notifications Hook** | `src/lib/hooks/useNotifications.ts` | **P3** | **Pending** | `pendingInvitationMatchIds` tracking + `INVITATION_HANDLED` sync |
| **Notifications Feed** | `src/app/(tabs)/notifications.tsx` | **P3** | **Pending** | Streamlined minimal card layout, crimson dot, neutralized invite CTAs |
| **Following & Profile** | `following.tsx`, `profile.tsx`, `user/[username].tsx` | **P3** | **Pending** | Terms link, `SISTEMA OPERACIONAL` pill, shared match list items |
| **Modals & Controls** | `DropdownSelect`, `CreateMatch`, `UpgradeModal`, `LanguageSelector` | **P3** | **Pending** | `field`/`inline` dropdowns, rounded-2xl ink surface, monochrome telemetry |

---

## 4. Execution Roadmap & Daily Cadence

1. **Sprint 1: Architectural Foundation, Assets & Discovery (Days 1–2)**
   - Finalize `src/constants/theme.ts` (`liveCrimson`, `Typography.digital`, `Typography.tabularNums`) and sync `common.newMatch` / `common.newTournament` i18n keys.
   - Copy the 12 court `.webp` assets from `scoreboard-web/public/backgrounds/` and build `MatchAtmosphereBackground.tsx`.
   - Extract `entityFormatters.ts`, remove arbitrary team dots, switch live indicators to Broadcast Crimson, and neutralize `SportIcon`, `FollowButton`, `TopBar`, and `_layout.tsx` active dots.
   - Complete docked filter bar, default list view, and aligned `+ Novo Jogo` CTA on `src/app/(tabs)/index.tsx`.

2. **Sprint 2: ScoreboardLayout & Match Detail Telemetry (Days 3–4)**
   - Build `ScoreboardLayout.tsx` (`ScoreboardProvider`, `ScoreboardHeader`, `ScoreboardMainCard` with `compactHeader` & square side-rail `leftActions`/`rightActions`, `ScoreboardTeamColumn`, `ScoreboardActionButton`, `ScoreboardSummaryCard`, `ScoreboardFinalizeButton`).
   - Refactor all 4 sport scoreboards (`Basketball`, `Football`, `Tennis`, `Volleyball`) to use `ScoreboardLayout` + `renderTeamColumn`, `Digital7` clocks/scores, and monochrome primary pads.
   - Update `src/app/match/[id].tsx` with `MatchAtmosphereBackground`, neutralized tiebreaks/trophies, unsloped tennis breakdown, and structured play-by-play tables.

3. **Sprint 3: Tournament System Overhaul (Days 5–6)**
   - Port `csvTeams.ts` (`parseTeamCsv`, `buildCsvTemplate`, `buildParticipantsCsv`) and add CSV Import/Export modal to `tournament/[id]/index.tsx`.
   - Update `TournamentBracketView` with high-contrast connector lines, `Digital7` scores, and Broadcast Crimson live dots.
   - Complete `GroupStandingsView` qualification rank indicators.
   - Unslop `tournament/[id]/index.tsx`, `signup.tsx`, `teams.tsx`, and `TournamentCard.tsx`.

4. **Sprint 4: My Lists, Notifications, Settings & Modals (Days 7–8)**
   - Implement `my-matches.tsx` and `my-tournaments.tsx` using `MatchAtmosphereBackground`, shared formatters, status/role tabs, and aligned CTAs.
   - Implement `useNotifications` `pendingInvitationMatchIds` accuracy + streamlined minimal cards in `notifications.tsx`.
   - Add `SISTEMA OPERACIONAL` status pill, Terms & Privacy view, and copyright info to `profile.tsx`.
   - Standardize `DropdownSelect.tsx` (`field` & `inline` variants) and polish `LanguageSelector`, `UpgradeModal`, `CreateMatchModal`, `CreateTournamentModal`, `RuleModal`, and `AuthModal`.
   - Run Maestro E2E test suite to verify no regressions in scoring, navigation, or creation flows.

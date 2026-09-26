# Mobile = pixel-identical copy of the web (execution blueprint)

Goal: the Android app renders the WEB's own pages/components (not re-implementations), pixel-identical, except the web header/NavDrawer becomes a bottom tab bar (same glass style). Everything runs locally; only inherently online features hit the server.

## Architecture decisions
1. mobile/ Vite compiles web code directly: alias `@` → repo root, app's own code → `@m` (codemod mobile/src). Shims: next/link, next/navigation, next/image, next/dynamic, next-auth/react, next-auth, @prisma/client (enums + DbNull/JsonNull), throwing stubs for @/lib/prisma, @/lib/auth; Capacitor-backed @/lib/pushClient. `resolve.dedupe` react/react-dom/framer-motion. `define` process.env.NEXT_PUBLIC_*. publicDir: only ../public/images (never sw.js). Rollup guard plugin failing on lib/prisma, lib/auth, next/server, next/headers, next-auth/jwt, bcryptjs, nodemailer, crypto, node:*.
2. Keep lib/storage.ts unchanged; a global fetch interceptor ("local API router", mobile/src/localApi) answers /api/* calls.
3. BrowserRouter (web reads window.location.search directly in 6 places). Routes generated from `import.meta.glob('../../../app/**/page.tsx')` (exclude admin, api, SEO landings /daily-planner /habit-tracker /routine /trading-journal, /offline). `[x]`→`:x`, lazy, inject `params={useParams()}`; app/account/layout.tsx nested; redirects /account/notifications, /account/sport-profile, /analysis/weekly→report page; notFound()/redirect() shims + error boundary rendering app/not-found.tsx; ScrollToTop on navigate; idle-prefetch tab routes.
4. Auth parity: login required like web (AuthGate/useSession). Session shim returns authenticated from stored tokens offline; isSuperAdmin from CACHED /api/account.
5. Endpoint classes: LOCAL (Dexie, exact web response shapes; writes dirty + onLocalWrite), CACHED (forward with Bearer, stale-while-revalidate in new Dexie `arion-http-cache` — add to LOCAL_DB_NAMES), ONLINE (forward with Bearer; offline → 503 {error:"اتصال اینترنت برقرار نیست"}), +B sync barrier (push dirty → forward → pull).
6. Server: web routes accept Bearer via new lib/requestAuth.ts (getRequestUser: Bearer→getMobileAuth only, else getServerSession) used by requireModule, requireSuperAdmin and ~15 direct getServerSession routes (never admin/cron/MT). middleware: Bearer requests from app origins get CORS for all methods + skip Origin CSRF, no cookies. /api/mobile/* stays for auth, sync, billing handoff, catalog.
7. CI guards: every web `/api/` literal classified in localApi/router.ts; every web page routed or excluded; server-only import guard; dep version parity with root package.json.

## Root shell (mobile/src/shell/AppRoot.tsx) mirrors app/layout.tsx
main.tsx runs THEME_INIT_SCRIPT, PERF_INIT_SCRIPT, TAP_FEEDBACK_INIT_SCRIPT (from web libs), installs fetch interceptor, imports @fontsource-variable/vazirmatn + inter (map to --font-vazir / --font-latin), @/app/globals.css, @m/shell/app-shell.css. AppRoot: SvgFilters, BackgroundCanvas (direct), SyncProvider → SessionShimProvider → ThemeProvider → MotionTuner, NotificationsBootstrap (reads web notifPrefs setting), `<div className="wrap">` + routes, AppTabBar, hardware back (close top modal via Escape/LockBodyScroll state first), status bar/theme sync. Do NOT mount NavDrawer topbar, PwaProvider, NotificationEngine, InlineBootstrap, PRELOAD_SCRIPT. app-shell.css on `html[data-shell="app"]`: override body top padding (globals.css ~283, 118px for web topbar) → safe-area top + tab-bar bottom; tab bar reuses `.app-topbar` glass tokens. index.html: web viewport (interactive-widget=resizes-content, viewport-fit=cover, maximum-scale=1), lang=fa dir=rtl data-theme=dark.

## Tab bar (from components/NavDrawer.tsx LINKS ~107-120)
1 روتین (/weekly) · 2 بدنسازی (/exercise; in-page tab for calorie) · 3 ترید (/trade) · 4 پروفایل (avatar chip → /account) · 5 منو (opens the web's own drawer panel: roadmaps, analysis, about, subscription, notifications bell, theme switch). Same module-lock/superAdmin filtering; hidden on /auth/*. Requires NavDrawer split (Phase 0b): useNavModel(), NavMenuPanel, web topbar — web DOM unchanged. Move ICONS to components/NavIcons.tsx (NavDrawer re-exports).

## Endpoint classification
LOCAL: tasks/daily (GET/POST, range, keys) ← arion.dailyEntries; settings/:key ← arion.settings (enforce isUserSettingKey + 64KB); exercise/schedule (active plan gymDays); exercise/plan GET; exercise/plan/manual POST; exercise/plan/substitute PATCH (getCatalogSubstitutes); exercise/log (+range); exercise/media (arion-catalog, CACHED fallback); calorie/foods (searchFoodSeed); calorie/log (+range, DELETE) with customCalories↔caloriesPer100g mapping (extract from sync/fitnessAdapter.ts); calorie/target (pure compute split of lib/calorieTargetService.ts; needsAge from cached account.birthDate); trade accounts/entries/entries/:id/checklists(+items)/notes/tags all methods (reuse lib/tradeServer.ts parseTradeInput/parseAccountInput/serializeEntry, computeTradeStats, new lib/tradeShapes.ts; DELETE account = archive; UTC + snapshot rules; mtConnected/mtLastSyncAt from cached metatrader; default checklist seeding); roadmaps/:id/progress PATCH; auth/2fa/start shim (→ /api/mobile/auth/login; requires2fa→{required:true,phoneHint}); next-auth signIn/signOut/getSession shims (SyncProvider login/verify2fa/logout, owner-wipe rules).
CACHED: trade/economic-calendar, trade/metatrader GET, roadmaps GET + :id GET (seed from arion-roadmaps), reports/weekly* (+B), account GET, account/avatar GET, plans.
ONLINE: calorie/scan; exercise/plan POST (+B); roadmaps POST/regenerate/DELETE (+B); routine/assistant GET/POST (+B); reports refresh/goals POST; trade/chat*, market/prices; account PATCH/banner/username/password/sessions/two-factor/email/*, users/*, friends/*, support/* (FormData/Blob untouched), analytics/track, subscription/discount-preview; auth/signup*, forgot-password/* (public). subscription/checkout → existing mobile billing handoff via lib/platform/external.ts (openExternalUrl), deep link back to /subscription?checkout=.
N/A: push/subscribe (Capacitor LocalNotifications instead), bootstrap (skip preload).
Local guards: 401 without tokens; 403 {error:"این بخش نیاز به اشتراک فعال دارد"} when cached moduleAccess lacks module.
Setting keys to add to MOBILE_SYNC_SETTING_KEYS (both contract copies + parity test): notifPrefs, dismissedStaticNotifs, tradeTickerSymbols, tradeCalendarSystem, tradeVisibleStats, tradeVisibleFacts, tradeMarketsOnboarded, tradeNewsAlerts, tradeChartSymbol, tradeChartInterval, tradeChatRulesAccepted.
After a pull that applied remote rows: invalidateStorageCache() and remount current route (only when no modal open, or on resume).

## Keep vs delete in mobile/src
Keep: db/, sync/ (decouple SyncProvider from More/Roadmap/Account/Social providers), notifications/ (drop useMoreContext), lib/*-contract.ts, statusBar, haptics, useNetworkStatus, useHardwareBack (adapt), conflict.ts; data layers only of features/fitness (db.ts, lib/repo.ts, lib/*), features/trade (db.ts, lib/*), features/roadmaps (db.ts, repo.ts, api.ts, syncHooks.ts), features/trade-online (db.ts, client.ts, api.ts, lib/*), features/account (api.ts, browser.ts, PaymentDeepLinkListener, logic.ts).
Delete: screens/*, components/* (custom UI), features/*/screens|components|routes.tsx, features/more, features/social (unless db reused), lib/onboarding.ts, lib/theme.ts, lib/useTheme.ts, styles/theme.css, custom resets in styles/index.css. Phase 5: remove duplicate copies of web libs, import @/lib/* instead.

## Dependencies (align with root)
framer-motion ^12.42.2, lucide-react ^1.27.0, add animejs ^4.5.0, tailwind-merge ^3.6.0, zxcvbn ^4.4.2 (lazy chunk). tailwind: presets:[root config], content includes ../app ../components ../lib. vitest check that shared deps match root.

## Web refactors (Phase 0b, no visual change on web)
lib/weeklyReport/domains.ts (pure DOMAINS/labels; metrics.ts re-exports; fixes prisma leak via 4 importers); components/NavIcons.tsx; NavDrawer split; lib/tradeShapes.ts; pure calorie target compute; lib/platform/external.ts; fix /analysis/weekly 404 (NavDrawer links to it, next.config redirects /report/weekly→/analysis/weekly, no app/analysis exists).

## Phases
0a Server Bearer bridge + CORS (lib/requestAuth.ts, moduleAccess, requireSuperAdmin, ~20 routes, middleware, tests: Bearer works per helper, admin rejects Bearer, revoked session 401).
0b Web pure refactors + seams + setting keys (above).
1a Mobile foundation + shell + shims + route generator + tab bar; delete custom UI. Acceptance: build/typecheck pass; /, /auth/login, /about identical.
1b localApi core (install/router/respond/guards/forward/cache/barrier) + routine/settings/schedule/account/auth handlers; /weekly fully offline.
2 Fitness + calorie handlers; /exercise both tabs offline.
3 Trade handlers; all /trade/* pages.
4 Account/subscription/support/social/roadmaps/reports wiring.
5 Static pages, remount on remote change, keyboard/safe-area, remove duplicate libs, CI guards, Playwright visual diff web vs app per route (390×844, ≈0 px diff outside header/tab bar), docs.

## Risks
Bundle/parse time (lazy routes, small shell); low-end perf (PERF_INIT_SCRIPT data-perf="low"); fontsource vs next/font metric drift (pin, visual diff); shape drift LOCAL vs web (reuse web pure helpers + fixture equality tests); LWW vs server-side mutations (barriers); stale UI after background pull (remount); safe-area/keyboard on Android WebView versions; hardware back must close modals first; never register a service worker.

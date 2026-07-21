# RIDER — Idle MC Empire

A browser-based idle/incremental game. Build a motorcycle club from a rusty
garage scrap yard into a legendary MC empire — recruit members, run rackets,
and go legendary to build lasting reputation across runs.

Sons of Anarchy meets Adventure Capitalist.

## Stack

- React + TypeScript + Vite
- No backend — progress is saved to `localStorage`, with offline progress
  calculated on return
- [Capacitor](https://capacitorjs.com/) scaffolding for iOS/Android app store
  builds

## Development

```
npm install
npm run dev
```

## Build for the web

```
npm run build
npm run preview
```

## Deploying to GitHub Pages

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
site with `VITE_BASE_PATH=/rider/` (so asset URLs resolve correctly under a
project page) and publishes it via GitHub Pages. One-time setup after the
first push: in the repo's **Settings → Pages**, set **Source** to
**GitHub Actions** (only needed once).

To build the same way locally:

```
npm run build:pages
```

## Shipping to iOS / Android

The `ios/` and `android/` native project shells are already generated via
Capacitor (`npx cap add ios` / `npx cap add android`) and committed to the
repo. To build native apps:

1. Make your web changes and run `npm run cap:sync` to copy the latest build
   into both native projects.
2. **iOS**: `npm run cap:ios` opens the project in Xcode (requires Xcode
   installed). Set your signing team, then archive/upload via
   Xcode or App Store Connect the usual way.
3. **Android**: `npm run cap:android` opens the project in Android Studio
   (requires Android Studio + SDK installed). Build a signed APK/AAB from
   there for the Play Console.

Before submitting to either store, update `capacitor.config.ts`'s `appId`
if you want a different bundle identifier, and replace the placeholder app
icon/splash screen assets in `ios/App/App/Assets.xcassets` and
`android/app/src/main/res` (Capacitor's
[assets generator](https://capacitorjs.com/docs/guides/splash-screens-and-icons)
can automate this from a single source image).

## Game design notes

- `src/game/data.ts` — all tunable numbers: rackets, costs, member ranks,
  legacy/prestige upgrades
- `src/game/engine.ts` — pure calculation functions (cost curves, income,
  prestige math) — no side effects, easy to unit test
- `src/game/useGameState.ts` — the game loop (requestAnimationFrame tick),
  autosave, and offline-progress-on-load

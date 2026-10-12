# Kinetic — training, macros & progress

An iPhone-first training tracker built with Expo (React Native + TypeScript).

| Tab | What's in it |
| --- | --- |
| **Today** | Today's session with a muscle map, a one-tap **Start workout**, this week's strip, macros remaining, Apple Health activity, the next three sessions and your goals. |
| **Plan** | Week and month views of the plan, past and future. Done and missed sessions are marked, and events from your other calendars appear inline. Sync the next 6 weeks to your calendar from here. |
| **Macros** | Calorie ring plus protein, carbs and fat bars. Meals are grouped by breakfast, lunch, dinner and snacks, with a 7-day trend against your target. |
| **Progress** | **Trends** (estimated 1RM per lift, body weight, consistency, training volume, distance outside the gym, steps, nutrition), **Goals**, and **History**. |

### Workout diagrams

- **Muscle map**: front and back figures with primary and secondary muscles highlighted. It appears on every session, every exercise and every finished workout.
- **Session flow**: a numbered timeline from warm-up through each exercise (sets × reps, rest, last weights) to cool-down.
- **Effort profile**: for runs and cardio, each block's length shows its duration and its height and colour show its heart-rate zone. Tap a block for its details.

### Logging

- **In the gym**: a live logger with your previous sets pre-filled, editable weight and reps, a rest timer that starts automatically, form cues, and a "try +2.5 kg" progression hint. When you finish, you get a summary with personal bests.
- **Outside the gym**: runs, walks, rides, hikes, swims and more, with duration, distance and effort. You can also import them from Apple Health with one tap.
- **Food**: name, protein, carbs and fat. Calories are worked out automatically. Recent foods are one tap away, and you can set servings.
- **Body weight**: logged as a 7-day smoothed trend against your goal.

## Integrations

| | Reads | Writes |
| --- | --- | --- |
| **Apple Health** (`@kingstinct/react-native-healthkit`) | Steps, active energy, exercise minutes, resting HR, walking/running distance, workouts, body mass | Workouts (strength and outdoor), food (energy, protein, carbs, fat), body mass |
| **Calendar** (`expo-calendar`) | Events from your other calendars, shown next to your sessions | A dedicated **"Kinetic Training"** calendar holding the next 6 weeks, each event with a 1-hour reminder, the full workout in its notes, and a `kinetic://session/<date>` link |

All data is stored on the device (AsyncStorage). Nothing is sent anywhere else.

## Running it

```bash
cd app
npm install
```

### Quick look in a browser

```bash
npx expo start --web
```

Everything works in the browser except Apple Health and the calendar. Choose **Explore with sample data** for 8 weeks of example history.

### On your iPhone (with Apple Health)

HealthKit isn't available in Expo Go, so the app needs a **development build**. You also need an Apple Developer account, because of the HealthKit entitlement.

**Option A — cloud build, no Mac needed (EAS):**

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform ios
```

Install the build on your phone from the QR code EAS shows. Then run `npx expo start` and open the project from the development build.

**Option B — local build (Mac with Xcode):**

```bash
npx expo run:ios --device
```

For a standalone app you can keep, build with `--profile preview` (installed directly on your phone) or `--profile production` (TestFlight or the App Store).

## Project layout

```
src/
  app/                 Expo Router screens
    (tabs)/            Today · Plan · Macros · Progress (native tab bar; _layout.web.tsx for web)
    session/[date]     Planned session: muscle map, flow / effort diagram, change this day
    workout            Live gym logger (full-screen)
    log/[id]           Finished session summary
    exercise/[id]      Technique cues, muscle map, e1RM history
    plan-edit, template/[id], exercise-picker
    food-add, log-activity, goal-add, weight-add, settings, onboarding
  components/          UI kit, BodyMap, WorkoutDiagram, Charts, SessionCard, MacroSummary
  data/                Exercise library (37 movements) and the starter plan
  lib/
    store.ts           Zustand store persisted to AsyncStorage
    analytics.ts       Plan resolution, e1RM, PRs, weekly buckets, goal projection
    health.ios.ts      HealthKit bridge (health.ts is the no-op fallback for web/Android)
    calendar.ts        Calendar sync and events from other calendars
    sync.ts            Health import, calendar re-sync, focus-aware hooks
    demo.ts            Deterministic sample data
```

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm run format      # prettier
npm run export:web  # static web build in dist/
```

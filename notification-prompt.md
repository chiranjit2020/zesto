You are extending an existing production-quality PWA called Zesto.

DO NOT redesign the existing Zesto application.
DO NOT replace the current UI architecture.
DO NOT introduce a new database.
DO NOT use Supabase.
DO NOT use OneSignal.

Your task is to implement an intelligent, personalized web push notification system for Zesto using:

- MongoDB Atlas — application data
- Firebase Cloud Messaging (FCM) — web push delivery
- Firebase Cloud Functions 2nd gen — backend notification processing
- Cloud Scheduler — scheduled notification triggers
- Firebase Analytics — notification/user behavior analytics
- Vercel — existing PWA hosting
- GitHub — source control/deployment
- Existing Zesto Node.js/TypeScript architecture
- Existing Zesto recommendation engine
- Existing service worker/PWA infrastructure where possible

The system must integrate into the existing application rather than creating a parallel architecture.

==================================================
1. UNDERSTAND THE EXISTING PRODUCT FIRST
==================================================

Before writing code:

1. Inspect the entire existing Zesto codebase.
2. Understand the current routing.
3. Understand the current PWA/service-worker implementation.
4. Understand the existing MongoDB/data layer.
5. Understand the existing recipe schema.
6. Understand the existing recommendation/filter logic.
7. Understand the existing "You" / profile area.
8. Understand the existing Pantry system.
9. Understand the existing meal/planner functionality.
10. Identify where user preferences can naturally be extended.
11. Identify whether an API/backend already exists.
12. Reuse existing abstractions instead of creating duplicates.

The current Zesto home experience revolves around:

"What can you make right now?"

Existing situational actions include:

- What can I make?
- I'm broke
- I'm too tired
- Midnight hunger
- Use my leftovers
- Make a ₹99 meal
- Plan my week
- Surprise me

The notification system must feel like a natural extension of these concepts.

Do not turn Zesto into a generic "food reminder app."

==================================================
2. CORE PRODUCT IDEA
==================================================

The notification system is NOT simply:

08:00 → Breakfast reminder
13:00 → Lunch reminder
20:00 → Dinner reminder

That would be too primitive.

Instead:

Zesto should determine whether a notification is useful for the user.

The core question is:

"Is there something genuinely useful Zesto can tell this user right now?"

For example:

User has:

- eggs
- bread
- onion

User prefers low-cost meals.

User has not cooked breakfast yet.

Zesto could send:

"🍳 Breakfast idea
You've already got everything for Masala Egg Toast.
₹18 · 8 min · 1 pan"

Another example:

"🌙 Midnight Zesto
Still hungry?
You have rice + egg in your pantry.
Quick Egg Fried Rice — ₹22 · 10 min"

Another:

"♻️ Use what you have
Your tomatoes and bread are perfect for Bread Omelette Roll-Up.
₹20 · 6 min"

Another:

"💰 Don't order yet
You can make Loaded Masala Maggi with what you already have.
₹24 · 7 min"

The notification should provide value, not merely interrupt the user.

==================================================
3. NOTIFICATION CATEGORIES
==================================================

Support these meal/situation categories:

- Breakfast
- Brunch
- Lunch
- Dinner
- Supper
- Midnight hunger
- Pantry opportunity
- Leftover rescue
- Budget opportunity
- Weekly planning
- Re-engagement
- Weekly Zesto summary

However, do NOT notify users for every category every day.

The system must intelligently decide which notification, if any, should be sent.

==================================================
4. USER NOTIFICATION PREFERENCES
==================================================

Add a notification preferences section inside the existing Zesto settings/profile area.

Do NOT create an unrelated settings page.

Users should be able to configure:

Notification master switch:

[ ON / OFF ]

Meal notifications:

Breakfast        [ ON/OFF ]
Brunch           [ ON/OFF ]
Lunch            [ ON/OFF ]
Dinner           [ ON/OFF ]
Supper           [ ON/OFF ]

Smart notifications:

Pantry opportunities   [ ON/OFF ]
Leftover rescue        [ ON/OFF ]
Budget suggestions     [ ON/OFF ]
Weekly summary         [ ON/OFF ]

Notification limits:

Maximum notifications per day:
[ 1 / 2 / 3 ]

Quiet hours:

From:
To:

Example:

Quiet hours
11:00 PM → 7:00 AM

Respect the user's local timezone.

Store these preferences in MongoDB Atlas.

Suggested structure:

notificationPreferences

{
  userId,
  enabled,
  meals: {
    breakfast,
    brunch,
    lunch,
    dinner,
    supper
  },
  smart: {
    pantry,
    leftovers,
    budget,
    weeklySummary
  },
  maxPerDay,
  quietHours: {
    enabled,
    start,
    end
  },
  timezone,
  updatedAt
}

Adapt the schema to the existing project's conventions.

==================================================
5. WEB PUSH PERMISSION UX
==================================================

Do NOT immediately call Notification.requestPermission()
when the user opens Zesto.

That creates a poor UX.

Instead introduce a contextual UI.

For example:

"Want Zesto to remind you when there's actually something worth cooking?"

[ Enable smart notifications ]

Explain briefly:

"Personalized meal ideas based on your pantry, budget and routine."

Only request browser permission after the user explicitly chooses to enable notifications.

Handle:

- granted
- denied
- default
- unsupported browser
- permission previously denied
- notification permission revoked
- service worker unavailable

Gracefully.

Never trap the user.

==================================================
6. FIREBASE CLOUD MESSAGING
==================================================

Integrate Firebase Cloud Messaging for Web.

Use the current Firebase modular Web SDK.

Do NOT use deprecated notification-token APIs if the current Firebase implementation provides a newer recommended registration mechanism.

Configure:

- Firebase application
- Firebase Messaging
- Web Push/VAPID configuration
- Firebase Messaging service worker
- foreground message handling
- background message handling
- notification click handling

The existing PWA service-worker architecture must be inspected first.

IMPORTANT:

Do not blindly create a second competing service worker.

If the current PWA uses a service worker, determine how Firebase Messaging can coexist with it.

The final architecture must have ONE coherent service-worker strategy.

Notifications must work with the existing Vercel-hosted HTTPS application.

==================================================
7. DEVICE / INSTALLATION REGISTRATION
==================================================

When the user enables notifications:

1. Register the browser/device with Firebase.
2. Obtain the appropriate Firebase installation identifier / push registration information according to the current Firebase Web API.
3. Send the identifier to the Zesto backend.
4. Associate it with the authenticated/anonymous Zesto user.
5. Store it in MongoDB Atlas.

Suggested collection:

notificationDevices

{
  userId,
  installationId,
  platform: "web",
  browser,
  userAgent,
  timezone,
  enabled,
  createdAt,
  lastSeenAt,
  lastNotificationAt
}

Do not store sensitive unnecessary browser information.

Handle multiple devices per user.

Example:

User uses:

- Chrome desktop
- Chrome Android

Both should be independently registered.

==================================================
8. MONGODB DATA MODEL
==================================================

Use MongoDB Atlas as the source of truth for Zesto application data.

Do not introduce Firestore.

Potential collections:

users
recipes
ingredients
pantryItems
mealHistory
favorites
mealPlans
notificationPreferences
notificationDevices
notificationHistory

Reuse existing collections if they already exist.

Do not duplicate data unnecessarily.

notificationHistory should allow Zesto to understand:

- what notification was sent
- when it was sent
- category
- recipe recommended
- why it was selected
- whether it was opened
- device/installation
- notification campaign/type

Suggested structure:

{
  userId,
  deviceId,
  type,
  mealType,
  recipeId,
  title,
  body,
  reason,
  sentAt,
  openedAt,
  status
}

Adapt this to existing conventions.

==================================================
9. NOTIFICATION ENGINE
==================================================

Create a backend notification decision engine.

Conceptually:

evaluateNotification(user, context)

→ candidate recipes
→ eligibility rules
→ recommendation score
→ notification priority
→ send / don't send

The system must NOT automatically send a notification just because a scheduled function executed.

Example:

Cloud Scheduler:
7:30 AM

↓

Cloud Function

↓

Load eligible users

↓

Check notification preferences

↓

Check quiet hours

↓

Check daily notification limit

↓

Check recent notifications

↓

Load pantry

↓

Load recent meal history

↓

Determine breakfast candidates

↓

Run Zesto recommendation engine

↓

Determine whether candidate is actually useful

↓

SEND or SKIP

==================================================
10. RECOMMENDATION SCORING
==================================================

Reuse the existing Zesto recommendation engine whenever possible.

Do not create a second independent recipe-ranking algorithm.

Potential scoring dimensions:

ingredient availability
time
cost
effort
equipment
diet
meal type
nutrition
recently cooked
favorite recipes
leftover compatibility
user preferences
recipe repetition
situational context

Example:

score =
  ingredientMatch * weight
  + timeFit * weight
  + budgetFit * weight
  + effortFit * weight
  + mealTypeFit * weight
  + preferenceFit * weight
  - repetitionPenalty
  - notificationFatiguePenalty

The exact formula should be adapted to the existing Zesto engine.

Keep scoring deterministic and explainable.

==================================================
11. "WHY THIS NOTIFICATION?"
==================================================

Every intelligent notification should have an internal reason.

Examples:

"All ingredients available"

"Uses ingredients expiring soon"

"Fits your ₹30 budget"

"Matches your breakfast preference"

"Low effort"

"Uses leftovers"

"Not cooked recently"

"Quick enough for your usual lunch window"

This reason can also optionally appear in the notification copy.

Example:

"♻️ Your tomatoes won't wait forever.
Try Tomato Bread Toast — ₹20 · 7 min"

==================================================
12. SCHEDULED FUNCTIONS
==================================================

Use Firebase Cloud Functions 2nd generation scheduled functions.

Use Cloud Scheduler through Firebase's scheduled-function mechanism.

Do NOT create five independent scheduler jobs if one intelligently designed scheduled process can evaluate multiple meal windows.

Prefer an architecture such as:

scheduledNotificationDispatcher

runs periodically.

It determines which users are currently eligible based on:

- timezone
- current local time
- meal windows
- preferences
- quiet hours
- notification limits
- recent activity

Example conceptual windows:

Breakfast:
07:00–10:00

Brunch:
10:00–12:00

Lunch:
12:00–15:00

Dinner:
18:00–21:00

Supper:
21:00–23:00

These are defaults, not rigid global rules.

Allow future personalization.

==================================================
13. TIMEZONE HANDLING
==================================================

Never assume every user is in India.

Store the user's IANA timezone.

Examples:

Asia/Kolkata
Asia/Dhaka
Europe/London
America/New_York

The notification engine should evaluate meal windows in the user's local timezone.

Do not use server timezone as the user's timezone.

==================================================
14. NOTIFICATION FATIGUE
==================================================

This is extremely important.

Zesto should prefer:

"no notification"

over:

"irrelevant notification."

Implement:

- maximum notifications per day
- cooldown period
- quiet hours
- duplicate recipe prevention
- duplicate notification prevention
- recent app activity suppression
- notification relevance threshold

Example:

If user opened Zesto 2 minutes ago and already browsed recipes:

DO NOT send:

"Come check out today's recipes!"

Instead, let the user continue naturally.

If a user repeatedly ignores notifications:

gradually reduce notification frequency.

Do not punish the user.

==================================================
15. SMART NOTIFICATION PRIORITY
==================================================

Give notifications a priority score.

Example:

PANTRY EXPIRY OPPORTUNITY
priority: 95

PERFECT PANTRY MATCH
priority: 90

LEFTOVER RESCUE
priority: 85

BUDGET OPPORTUNITY
priority: 80

NORMAL MEAL SUGGESTION
priority: 60

GENERIC RE-ENGAGEMENT
priority: 20

Only send if:

priority >= configured threshold

and

user is eligible.

Do not hard-code arbitrary values if the existing architecture already has a scoring/configuration system.

==================================================
16. EXAMPLE NOTIFICATION TYPES
==================================================

Implement notification templates for:

----------------------------------------
BREAKFAST
----------------------------------------

"☀️ Good morning
You already have everything for Masala Egg Toast.
₹18 · 8 min · 1 pan"

----------------------------------------
LUNCH
----------------------------------------

"🍚 Lunch idea
Your pantry has almost everything for Quick Veg Rice.
₹28 · 12 min"

----------------------------------------
DINNER
----------------------------------------

"🌙 Dinner sorted
Try Loaded Masala Maggi tonight.
₹24 · 7 min · Low effort"

----------------------------------------
BUDGET
----------------------------------------

"💰 Still got ₹30?
You can make Egg Fried Rice for about ₹22."

----------------------------------------
LEFTOVERS
----------------------------------------

"♻️ Don't waste that rice.
Turn it into Quick Egg Fried Rice."

----------------------------------------
PANTRY
----------------------------------------

"🧺 You've got a meal hiding in your pantry.
Try Bread Omelette Roll-Up — ₹20 · 6 min."

----------------------------------------
MIDNIGHT
----------------------------------------

"🌙 Hungry?
Quiet kitchen, minimal cleanup.
Try Peanut Butter Banana Toast — ₹18 · 4 min."

----------------------------------------
RE-ENGAGEMENT
----------------------------------------

"Zesto found something you can make in 10 minutes."

Keep messages short.

Do not generate essay-like push notifications.

==================================================
17. NOTIFICATION CLICK BEHAVIOR
==================================================

Every notification should deep-link to the relevant Zesto destination.

Examples:

Recipe notification
→ /recipe/:recipeId

Pantry opportunity
→ /pantry or relevant recipe

Weekly planner
→ /planner

Weekly summary
→ /you or dashboard

Never make the user land on the generic homepage when the notification already knows the intended destination.

If the app is closed:

notification click
→ launch Zesto
→ navigate to correct route.

==================================================
18. FOREGROUND VS BACKGROUND
==================================================

When Zesto is open:

Do not blindly create browser notifications for every incoming message.

Instead decide whether to:

- show an in-app notification/toast
- update notification center
- suppress browser push
- handle according to current UX

When Zesto is backgrounded or closed:

use the service worker / FCM background notification mechanism.

Keep behavior consistent.

==================================================
19. FIREBASE ANALYTICS
==================================================

Integrate Firebase Analytics for notification behavior.

Track meaningful events such as:

notification_permission_requested
notification_permission_granted
notification_permission_denied

notification_enabled
notification_disabled

notification_received
notification_opened

notification_dismissed

notification_recipe_viewed
notification_recipe_started
notification_recipe_completed

smart_notification_generated
smart_notification_skipped

pantry_notification_generated
budget_notification_generated
leftover_notification_generated

Use useful parameters.

Example:

notification_opened

{
  notification_type,
  meal_type,
  recipe_id,
  recommendation_reason
}

Do not collect unnecessary sensitive information.

Use Firebase Analytics to understand whether notifications actually improve engagement.

==================================================
20. ANALYTICS FUNNEL
==================================================

Track this funnel:

Notification generated
        ↓
Notification sent
        ↓
Notification received
        ↓
Notification opened
        ↓
Recipe viewed
        ↓
Cooking started
        ↓
Cooking completed

This should eventually allow Zesto to answer:

"Which notifications actually help users cook?"

==================================================
21. WEEKLY ZESTO SUMMARY
==================================================

Prepare the architecture for a weekly personalized summary.

Example:

"Your week with Zesto 🍳

5 meals cooked
₹184 estimated spend
1,920 estimated kcal
3 pantry ingredients rescued
₹126 estimated savings"

The exact metrics should come from existing Zesto data.

Do not fabricate values.

This should be a future-ready feature even if the first implementation only prepares the data model.

==================================================
22. OPTIONAL AI LAYER
==================================================

DO NOT make generative AI responsible for the core recommendation decision.

The deterministic Zesto recommendation engine remains authoritative.

AI may later be used for:

- notification wording
- conversational meal suggestions
- explaining why a recipe fits
- personalized summaries
- "Talk to Zesto"

Example:

Deterministic engine:

Recipe:
Masala Egg Toast

Reasons:
egg available
bread available
₹18
8 minutes
breakfast
low effort

AI:

"Morning! You've already got everything you need for Masala Egg Toast. It's only about ₹18 and takes 8 minutes."

AI must NEVER invent:

- ingredients
- prices
- calories
- cooking time
- nutrition
- recipe instructions

unless explicitly supplied by the application data.

==================================================
23. SECURITY
==================================================

Never expose Firebase Admin credentials in the browser.

Never expose MongoDB credentials in client-side code.

Never send privileged notification requests directly from the browser.

Architecture:

PWA
 ↓
Zesto API
 ↓
MongoDB

Firebase Cloud Function
 ↓
secure server-side logic
 ↓
FCM

All secrets must use appropriate server-side environment/configuration mechanisms.

Validate all notification-related API input.

Prevent users from registering arbitrary device identifiers to another account.

==================================================
24. AUTHENTICATION
==================================================

Inspect the existing Zesto authentication system.

If authentication already exists:

use the existing identity.

Do NOT introduce Firebase Authentication unless there is a compelling architectural reason.

MongoDB remains the application data store.

If Zesto currently supports anonymous users:

design notification registration so it can later migrate from anonymous identity to authenticated identity without losing the device association.

==================================================
25. SERVICE WORKER
==================================================

This is a critical implementation area.

Inspect the current PWA service worker first.

Determine whether Zesto uses:

- Vite PWA plugin
- Workbox
- custom service worker
- generated service worker
- another mechanism

Integrate Firebase Messaging into the existing architecture.

Do NOT blindly create:

firebase-messaging-sw.js

if that would conflict with the existing service worker.

If Firebase requires a root-level messaging worker, architect the service-worker setup properly.

Document the final service-worker strategy.

==================================================
26. UI REQUIREMENTS
==================================================

The existing Zesto visual language must remain unchanged.

Current visual direction:

- dark interface
- Quicksand typography
- Zesto purple
- cyan/blue
- yellow/orange accents
- rounded cards
- subtle borders
- compact mobile-first layout
- friendly but technical personality

Do not redesign the home screen.

Add notification controls naturally inside the existing "You" / settings experience.

Potential UI:

----------------------------------------

Notifications

Get useful meal ideas when they actually matter.

[ Smart notifications        ON ]

Meal ideas

Breakfast                    ON
Brunch                       OFF
Lunch                        ON
Dinner                       ON
Supper                       OFF

Smart suggestions

Pantry opportunities         ON
Leftover rescue              ON
Budget ideas                 ON

Maximum per day              2

Quiet hours

11:00 PM — 7:00 AM

----------------------------------------

Also include:

"Test notification"

for development/testing where appropriate.

==================================================
27. NOTIFICATION CENTER
==================================================

Prepare a lightweight in-app notification history.

Example:

Notifications

Today

🍳 Breakfast idea
Masala Egg Toast
8 min · ₹18

♻️ Pantry rescue
Use your tomatoes
7 min · ₹20

Yesterday

🌙 Midnight Zesto
Peanut Butter Banana Toast

Allow:

- mark as read
- open recommendation
- optionally dismiss

This can be backed by MongoDB notificationHistory.

Do not make this overly complex in the first implementation.

==================================================
28. TESTING MODE
==================================================

Create a development/test mechanism.

I must be able to test:

1. Firebase connection
2. notification permission
3. browser registration
4. device registration
5. notification sending
6. background notification
7. notification click
8. deep linking
9. scheduled function
10. MongoDB lookup
11. recommendation selection
12. notification suppression

Create a safe development endpoint/function such as:

POST /api/notifications/test

or equivalent existing architecture.

It must only be available to authorized development/admin users.

Never leave an unrestricted notification-sending endpoint in production.

==================================================
29. FAILURE HANDLING
==================================================

The application must remain functional if Firebase is unavailable.

For example:

Firebase unavailable
→ Zesto still works normally.

MongoDB unavailable
→ show appropriate application error.

Notification permission denied
→ Zesto still works normally.

FCM registration fails
→ retry gracefully.

Service worker unavailable
→ disable push functionality without breaking the PWA.

Scheduled function fails
→ log structured error
→ do not repeatedly spam users.

Invalid device/installation
→ mark inactive/remove according to safe lifecycle rules.

==================================================
30. LOGGING
==================================================

Cloud Functions should produce structured logs.

For each notification decision:

userId
notificationType
mealType
candidateRecipeId
score
decision
reason
timestamp

Example:

{
  "userId": "...",
  "type": "breakfast",
  "recipeId": "...",
  "score": 91,
  "decision": "sent",
  "reason": "full_pantry_match"
}

For skipped notifications:

{
  "decision": "skipped",
  "reason": "daily_limit_reached"
}

This will make debugging the intelligence layer much easier.

==================================================
31. COST CONSCIOUSNESS
==================================================

This is a portfolio/learning project.

Do not build an architecture that unnecessarily runs expensive AI or database queries every few minutes.

Prefer:

scheduled batch evaluation
efficient MongoDB queries
indexes
reasonable notification frequency
deterministic scoring

Do not invoke Gemini for every notification.

Do not invoke AI simply because AI is available.

==================================================
32. DATABASE INDEXES
==================================================

Inspect the existing MongoDB schema and create appropriate indexes for:

userId
notification preferences
notification device identifiers
notification history timestamps
recipe identifiers
meal history
pantry items

Avoid indiscriminately indexing every field.

Document why each new index exists.

==================================================
33. ENVIRONMENT VARIABLES
==================================================

Do not hard-code secrets.

Clearly separate:

Client-side Firebase configuration
Server-side Firebase credentials
MongoDB URI
FCM configuration
application URL
environment

Create/update:

.env.example

with placeholder values only.

Never commit secrets.

==================================================
34. DEVELOPMENT PHASES
==================================================

Implement incrementally.

PHASE 1
Firebase project integration

- Firebase SDK
- FCM
- service worker
- browser permission
- installation registration

PHASE 2
MongoDB notification infrastructure

- notificationPreferences
- notificationDevices
- notificationHistory

PHASE 3
Manual test notification

- send test
- receive
- click
- deep link

PHASE 4
Notification preferences UI

PHASE 5
Scheduled Cloud Function

PHASE 6
Zesto recommendation integration

PHASE 7
Smart notification suppression

PHASE 8
Firebase Analytics

PHASE 9
Notification history

PHASE 10
Weekly summary architecture

PHASE 11
Optional AI-generated notification copy

Do not attempt all phases blindly in one huge implementation.

After each phase:

- run the app
- test
- inspect logs
- fix issues
- then continue.

==================================================
35. ACCEPTANCE CRITERIA
==================================================

The implementation is successful only when:

[ ] Zesto still works without notifications enabled.

[ ] User can explicitly enable notifications.

[ ] Browser permission is handled correctly.

[ ] Firebase Cloud Messaging works on supported web browsers.

[ ] Service worker works correctly with the existing PWA.

[ ] Device/installation information is stored securely.

[ ] MongoDB stores notification preferences.

[ ] MongoDB stores notification history.

[ ] User can control breakfast notifications.

[ ] User can control brunch notifications.

[ ] User can control lunch notifications.

[ ] User can control dinner notifications.

[ ] User can control supper notifications.

[ ] User can configure notification limits.

[ ] User can configure quiet hours.

[ ] User timezone is respected.

[ ] Scheduled Cloud Function runs correctly.

[ ] Recommendation engine chooses candidates.

[ ] Notification is sent only when relevant.

[ ] Duplicate notifications are prevented.

[ ] Notification fatigue is controlled.

[ ] Notification click opens the correct Zesto route.

[ ] Analytics events are recorded.

[ ] Notification failure does not break Zesto.

[ ] Firebase credentials are never exposed.

[ ] MongoDB credentials are never exposed.

[ ] No Supabase is introduced.

[ ] No Firestore is introduced.

[ ] No OneSignal is introduced.

[ ] No unnecessary AI dependency is introduced.

==================================================
36. FINAL ARCHITECTURE
==================================================

The final architecture should conceptually look like:

                    ZESTO PWA
                        │
                ┌───────┴────────┐
                │                │
             Vercel          Firebase
                │                │
                │       ┌────────┼────────┐
                │       │        │        │
                │      FCM   Functions Analytics
                │                │
                │           Scheduler
                │                │
                └──────┬─────────┘
                       │
                  Zesto API
                       │
                       ▼
                 MongoDB Atlas
                       │
              ┌────────┼────────┐
              │        │        │
            Pantry   History Preferences
              │        │        │
              └────────┼────────┘
                       ▼
              Zesto Recommendation
                     Engine
                       │
                       ▼
                Best candidate
                       │
                       ▼
                 FCM notification

Optional future layer:

                Firebase AI Logic
                       │
                       ▼
              Natural-language copy
                       │
                       ▼
                FCM notification

The recommendation engine remains the authority.
AI remains an enhancement.

==================================================
37. IMPORTANT ENGINEERING PRINCIPLE
==================================================

Do not build this feature merely to say:

"I integrated Firebase."

Build it so that Zesto demonstrates:

- event-driven architecture
- scheduled backend processing
- MongoDB data modeling
- push notification infrastructure
- service workers
- browser permissions
- personalization
- recommendation systems
- notification fatigue management
- analytics
- deep linking
- server-side security
- fault tolerance

The goal is not "Firebase notifications."

The goal is:

ZESTO INTELLIGENCE

The user should feel:

"I didn't ask Zesto anything.

It understood that this was a good moment to help me."

Before writing code, inspect the existing repository and produce:

1. Current architecture summary
2. Files that need modification
3. New files required
4. MongoDB schema changes
5. Firebase services required
6. Environment variables required
7. Service-worker strategy
8. Implementation phases
9. Risks/conflicts with the existing PWA

Then begin implementation phase-by-phase.
Do not rewrite unrelated working features.
Do not replace the existing design system.
Do not create duplicate backend logic.
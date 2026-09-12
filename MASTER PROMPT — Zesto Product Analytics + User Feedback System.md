You are working on my existing production application: Zesto.

Zesto is a mobile-first PWA that helps users answer:

“I’m hungry. I have these ingredients. I have this much money. I have this much time and energy. What can I make?”

IMPORTANT:
This is an EXISTING production application.

DO NOT rebuild the application.
DO NOT redesign the existing UI.
DO NOT replace the current architecture.
DO NOT introduce Supabase.
DO NOT introduce Firestore.
DO NOT introduce OneSignal.
DO NOT migrate existing working functionality unless absolutely necessary.

Your first task is to inspect the existing codebase thoroughly and understand how the current application works before modifying anything.

==================================================
1. CURRENT TECHNOLOGY STACK
==================================================

Frontend:
- Existing Vite-based PWA
- Existing mobile-first UI
- Existing Zesto design system
- Existing service worker
- Existing local-first behavior

Backend:
- Node.js / TypeScript API
- Hosted on Vercel
- Existing API base URL

Database:
- MongoDB Atlas
- Existing application data lives here

Firebase:
- Firebase Cloud Messaging (FCM)
- Firebase Analytics
- Firebase Cloud Functions where already applicable
- Existing push notification infrastructure

Deployment:
- GitHub
- Vercel
- Existing GitHub Actions

Production frontend:
https://www.chiranjitkarmakar.com/zesto/

Production API:
https://zesto-codeworm.vercel.app

==================================================
2. CURRENT PRODUCTION NOTIFICATION SYSTEM
==================================================

The notification system is ALREADY IMPLEMENTED and WORKING.

It includes:

- Firebase Cloud Messaging
- Web Push
- Firebase client configuration
- FCM service worker
- Device/installation registration
- Notification preferences
- MongoDB notification data
- Notification history
- Manual test notifications
- Scheduled notification dispatcher
- Recommendation-engine based notification selection
- Quiet hours
- Daily notification limits
- Diet/equipment/budget/time constraints
- Notification deep links
- Open tracking
- Firebase Analytics integration

The existing service worker must NOT be duplicated.

There must remain ONE coherent service-worker architecture.

The notification system should continue working exactly as it currently does after your changes.

==================================================
3. NEW OBJECTIVE
==================================================

Build a lightweight but production-quality:

ZESTO PRODUCT ANALYTICS + FEEDBACK SYSTEM

The purpose is to answer two different questions:

A. QUANTITATIVE:
“How many people are actually using Zesto?”

B. QUALITATIVE:
“Why are they using it, what do they like, and what problems are they facing?”

These must NOT be confused.

Firebase Analytics should measure usage.

WhatsApp should provide a direct human feedback channel.

MongoDB should store application/business data where appropriate.

Do NOT use WhatsApp as the primary user-tracking mechanism.

==================================================
4. ANALYTICS ARCHITECTURE
==================================================

Use Firebase Analytics as the primary behavioral analytics system.

Do NOT create a MongoDB record for every page open or every user interaction merely to duplicate Firebase Analytics.

Firebase Analytics should handle:

- Active users
- New users
- Returning users
- Daily active users (DAU)
- Weekly active users (WAU)
- Monthly active users (MAU)
- Engagement
- Feature usage
- Recommendation behavior
- Recipe interaction
- Pantry usage
- Planner usage
- Notification behavior
- Feedback interaction

MongoDB remains responsible for application data.

The architecture should be:

USER
 ↓
ZESTO PWA
 ├── Firebase Analytics → behavioral/product analytics
 │
 ├── MongoDB → application data
 │
 └── WhatsApp → qualitative human feedback

Do not duplicate the same data unnecessarily.

==================================================
5. ANALYTICS EVENTS
==================================================

Implement a carefully designed analytics event taxonomy.

Do NOT track everything blindly.

Start with the following events where the corresponding functionality already exists.

Core engagement:

- app_open
- session_started
- page_viewed

Discovery:

- recommendation_generated
- recommendation_clicked
- recipe_viewed
- recipe_started
- recipe_completed

Kitchen:

- pantry_viewed
- pantry_updated
- ingredient_added
- ingredient_removed

Meal:

- meal_logged
- meal_completed

Planner:

- planner_viewed
- planner_created
- meal_plan_updated

Notifications:

- notification_received
- notification_opened
- notification_dismissed

Feedback:

- feedback_opened
- feedback_submitted
- recipe_feedback_submitted

Do not implement an event merely because it is listed above.

First inspect the existing application and only add events that correspond to real user actions/features.

==================================================
6. EVENT PARAMETERS
==================================================

Where useful, attach meaningful parameters.

Examples:

recipe_viewed:
- recipe_id
- recipe_category
- meal_type

recommendation_generated:
- recommendation_type
- number_of_results
- budget_range
- meal_type

recommendation_clicked:
- recipe_id
- recommendation_type

recipe_completed:
- recipe_id
- cooking_time_estimate
- difficulty

pantry_updated:
- action
- ingredient_count

planner_created:
- number_of_meals
- planning_period

notification_opened:
- notification_type
- meal_type
- recipe_id

feedback_submitted:
- feedback_type
- source

recipe_feedback_submitted:
- recipe_id
- rating
- reason

IMPORTANT:

Do NOT send personally identifiable information to Firebase Analytics.

Do NOT send:
- name
- phone number
- email address
- WhatsApp number
- passwords
- authentication credentials
- raw personal messages
- sensitive personal information

Use anonymous/internal IDs only where genuinely necessary and permitted.

Follow Firebase Analytics naming and parameter constraints.

==================================================
7. ACTIVE USER TRACKING
==================================================

The primary goal is to understand whether Zesto has real users.

Configure Analytics correctly so that Firebase/Google Analytics can provide:

- Daily active users
- Weekly active users
- Monthly active users
- New users
- Returning users
- User engagement
- Retention trends
- Feature adoption

Do NOT attempt to manually calculate DAU by counting MongoDB documents.

Do NOT count notification recipients as active users.

A notification recipient is NOT necessarily an active user.

A user should be considered active based on actual engagement/activity as measured through Analytics.

==================================================
8. IMPORTANT PRODUCT METRICS
==================================================

Create a sensible measurement framework.

Track these categories:

ACQUISITION / ENTRY
- app opened
- first visit
- returning visit

ENGAGEMENT
- recommendation generated
- recipe viewed
- recipe started
- recipe completed

VALUE
- pantry used
- meal logged
- planner used
- recipe completed

RETENTION
- returning users
- 7-day activity
- 30-day activity

NOTIFICATIONS
- notification received
- notification opened
- notification dismissed
- notification → recipe interaction

FEEDBACK
- feedback opened
- feedback submitted
- recipe feedback submitted

The goal is NOT to collect thousands of meaningless events.

The goal is to understand:

Discover
 ↓
Recommend
 ↓
Cook
 ↓
Measure
 ↓
Return
 ↓
Give feedback
 ↓
Improve Zesto

==================================================
9. FEEDBACK SYSTEM
==================================================

Add a simple feedback/help area to the existing Profile / You section.

Do NOT create a complicated support ticket system.

The UI should contain approximately:

HELP & FEEDBACK

🐛 Report a problem
💡 Suggest an idea
❤️ General feedback

Optionally:

🍳 Report a recipe problem

The existing Zesto visual language must be preserved.

Do not introduce a completely new design.

==================================================
10. WHATSAPP FEEDBACK
==================================================

Use WhatsApp as the direct human feedback channel.

The user should be able to tap:

“Report a problem”

and open a WhatsApp conversation with the Zesto owner/support number.

Use a WhatsApp deep link with a prefilled message.

Example conceptual message:

Hi Zesto 👋

Feedback type: Bug report
Page: [current page]

Problem:
[User can continue typing here]

Device/Browser:
[optional]

Zesto version:
[version]

IMPORTANT:

Do NOT automatically send anything to WhatsApp.

The user must explicitly send the message.

Do NOT imply that clicking the WhatsApp button means the feedback was successfully submitted.

==================================================
11. PRIVACY
==================================================

Do NOT send unnecessary personal information through the WhatsApp prefilled message.

Do not automatically include:

- full user identity
- private pantry contents
- private meal history
- email
- authentication tokens
- passwords
- sensitive information

Only include useful technical context where appropriate.

For example:

- current page
- app version
- browser name
- operating system category
- error context if explicitly generated

Keep the feedback experience transparent.

==================================================
12. FEEDBACK ANALYTICS
==================================================

When the user opens the feedback system:

Log:

feedback_opened

When they select a category:

Optionally log:

feedback_category_selected

When they click the WhatsApp button:

Log:

feedback_submitted

BUT IMPORTANT:

This event means:

“The user clicked the feedback/WhatsApp action.”

It does NOT mean:

“The user definitely sent a WhatsApp message.”

Do not falsely represent it as confirmed submission.

Use naming/copy that accurately reflects this limitation.

==================================================
13. RECIPE FEEDBACK
==================================================

Add a lightweight feedback mechanism to recipes where appropriate.

Example:

“Was this recipe useful?”

👍 Yes
👎 No

If the user selects No, show optional reasons:

- Ingredients unavailable
- Cost seems wrong
- Cooking time seems wrong
- Instructions unclear
- Recipe didn't work
- Portion/serving issue
- Other

Do not force the user to provide feedback.

Do not interrupt the cooking experience.

Track:

recipe_feedback_submitted

Parameters:

- recipe_id
- rating
- reason

Do not collect unnecessary personal information.

==================================================
14. ERROR REPORTING
==================================================

If the application already has an error boundary or error handling system, integrate with it carefully.

Do NOT flood analytics with technical errors.

Only track meaningful product failures.

Potential event:

app_error

Useful parameters might include:

- error_type
- page
- feature

Never send:

- passwords
- tokens
- full request bodies
- private user data
- credentials

If an error contains sensitive information, sanitize it before analytics.

==================================================
15. ANALYTICS CONSENT / PRIVACY
==================================================

Inspect the existing application and determine whether analytics consent/privacy handling already exists.

Do not blindly add a second consent system.

If consent is required for the target deployment/jurisdiction and the current application does not handle it properly, implement a minimal, understandable approach consistent with the application's existing privacy model.

Do not create a giant cookie-management system unless necessary.

==================================================
16. VERSION TRACKING
==================================================

Add a reliable application version/build identifier where useful.

This will help correlate feedback with releases.

For example:

Zesto v1.x.x

The version may be included in:

- feedback context
- error reports
- internal diagnostics

Do not expose unnecessary technical information to normal users.

==================================================
17. OPTIONAL ADMIN DASHBOARD — DO NOT OVERBUILD
==================================================

Do NOT build a giant admin dashboard in this phase.

Instead, design the analytics architecture so that a future admin dashboard can display:

OVERVIEW

- DAU
- WAU
- MAU
- New users
- Returning users
- Retention

PRODUCT USAGE

- Recommendations generated
- Recipes viewed
- Recipes started
- Recipes completed
- Pantry users
- Planner users

NOTIFICATIONS

- Notifications sent
- Notifications opened
- Notification → recipe interaction

FEEDBACK

- Feedback clicks
- Recipe feedback
- Bug reports
- Feature requests

This dashboard can be implemented later.

Firebase Analytics should remain the primary source for behavioral analytics.

==================================================
18. SECURITY
==================================================

Review the implementation for:

- exposed Firebase secrets
- exposed MongoDB credentials
- exposed admin tokens
- WhatsApp number handling
- API security
- CORS
- analytics misuse
- client-side secrets

Remember:

Firebase web configuration values are not equivalent to private server secrets.

Never expose:

- MongoDB URI
- Firebase Admin service-account private key
- admin tokens
- server secrets

Do not move server secrets into frontend code.

==================================================
19. PERFORMANCE
==================================================

Analytics must not noticeably slow down Zesto.

Do not block page rendering while sending analytics.

Do not create unnecessary API calls for analytics events.

Prefer Firebase Analytics client-side event collection for behavioral events.

Do not send an API request to Vercel every time:

- a page opens
- a recipe is viewed
- a button is clicked

unless there is a genuine application-data requirement.

==================================================
20. OFFLINE PWA BEHAVIOR
==================================================

Zesto is a PWA.

Do not break:

- offline functionality
- service worker
- caching
- installation
- existing FCM push functionality

Analytics should fail gracefully when offline.

The application itself must continue functioning if Firebase Analytics is temporarily unavailable.

Analytics is supplementary.

Zesto's core functionality must never depend on analytics being available.

==================================================
21. EXISTING DESIGN SYSTEM
==================================================

Preserve the current Zesto design.

Current brand language:

Font:
Quicksand

Primary visual palette includes:

Purple:
#9035C0

Black:
#000000

White:
#FFFFFF

Yellow:
#FDCF00

Orange:
#F7B200

Blue:
#4CBDF7

Do not redesign the application.

Do not introduce Bootstrap.

Do not introduce another component framework.

Do not replace the existing styling system.

Make the new feedback UI feel native to the existing Zesto application.

==================================================
22. USER EXPERIENCE
==================================================

The feedback experience should be extremely simple.

A user should be able to:

Profile
 ↓
Help & Feedback
 ↓
Choose:
  Report a problem
  Suggest an idea
  General feedback
 ↓
WhatsApp opens with useful context
 ↓
User edits message
 ↓
User sends it manually

For recipe feedback:

Recipe
 ↓
Was this recipe useful?
 ↓
👍 / 👎
 ↓
Optional reason

No account creation should be required merely to provide feedback.

==================================================
23. ANALYTICS NAMING
==================================================

Use consistent snake_case event names.

Avoid random names such as:

clicked_button
button_click
click_recipe
recipeClick
userClickedRecipe

Instead use semantic product events:

recipe_viewed
recipe_started
recipe_completed
recommendation_generated
recommendation_clicked

The event should describe WHAT HAPPENED, not HOW THE UI IMPLEMENTED IT.

==================================================
24. DO NOT TRACK EVERYTHING
==================================================

This is extremely important.

Do NOT create analytics events for every:

- div
- button
- screen redraw
- component render
- API request
- React/Vite lifecycle
- mouse movement
- scroll position

Track meaningful user/product behavior.

Analytics should answer product questions.

==================================================
25. IMPLEMENTATION PROCESS
==================================================

Follow this exact workflow.

PHASE 1 — INSPECT

Before writing code:

1. Inspect the entire repository structure.
2. Identify frontend entry points.
3. Identify routing.
4. Identify existing Firebase initialization.
5. Identify existing Firebase Analytics code.
6. Identify service worker.
7. Identify Profile/You page.
8. Identify recipe components.
9. Identify recommendation flow.
10. Identify pantry functionality.
11. Identify planner functionality.
12. Identify notification functionality.
13. Identify existing environment variables.
14. Identify existing version/build configuration.
15. Identify existing privacy/consent mechanisms.

Do not modify anything yet.

Then produce a short architecture report.

==================================================
PHASE 2 — GAP ANALYSIS
==================================================

Compare the existing implementation with this specification.

Create:

CURRENT
MISSING
ALREADY IMPLEMENTED
NEEDS MODIFICATION

Do not duplicate functionality that already exists.

==================================================
PHASE 3 — IMPLEMENT ANALYTICS
==================================================

Implement the smallest clean analytics layer possible.

Prefer a centralized helper/service such as:

analytics.ts

or the equivalent architecture already present in the project.

Example conceptual API:

trackEvent("recipe_viewed", {
  recipe_id,
  meal_type
})

The actual implementation must follow the existing project's architecture.

Avoid scattering Firebase Analytics implementation details throughout the entire codebase.

==================================================
PHASE 4 — IMPLEMENT FEEDBACK
==================================================

Add:

- Help & Feedback section
- Bug report
- Suggest idea
- General feedback
- Optional recipe feedback
- WhatsApp deep links
- feedback analytics

Preserve the current UI.

==================================================
PHASE 5 — TEST
==================================================

Test:

1. App opens.
2. Analytics initializes.
3. Core events fire.
4. Recipe events fire correctly.
5. Recommendation events fire correctly.
6. Pantry events fire correctly.
7. Planner events fire correctly.
8. Notification events continue working.
9. Feedback page opens.
10. WhatsApp link is correctly formed.
11. Prefilled WhatsApp message contains useful context.
12. User can edit message.
13. User can manually send message.
14. Recipe feedback works.
15. Offline application still works.
16. Existing push notifications still work.
17. Service worker remains functional.
18. Production build succeeds.

==================================================
26. VERIFY ANALYTICS
==================================================

Do not assume Firebase Analytics works merely because the code compiles.

Explain how I can verify events using:

Firebase Console
→ Analytics
→ DebugView / relevant analytics reporting tools

Tell me exactly which events I should trigger manually and what I should expect to see.

Also explain how to verify:

- active users
- new users
- returning users
- engagement
- retention

==================================================
27. VERIFY WHATSAPP
==================================================

Test the generated WhatsApp URL.

Verify:

- correct destination number
- URL encoding
- prefilled message
- current page context
- feedback category
- app version

Do not send the message automatically.

==================================================
28. PRODUCTION SAFETY
==================================================

Before making changes:

Create a clean implementation plan.

After implementation:

Run:

- lint
- type checking
- tests if available
- production build

Do not deploy automatically unless explicitly instructed.

If the repository uses Git:

Show:

- files changed
- why each file changed
- important architectural decisions

==================================================
29. FINAL REPORT
==================================================

After implementation, give me a concise report containing:

1. What was already present
2. What you added
3. Files changed
4. Analytics events implemented
5. Feedback functionality implemented
6. WhatsApp integration
7. Privacy considerations
8. Security considerations
9. How to test Firebase Analytics
10. How to test WhatsApp feedback
11. Environment variables added/changed
12. Any Firebase Console configuration required
13. Any MongoDB changes
14. Any remaining work

Also provide:

ANALYTICS CHECKLIST

[ ] Firebase Analytics initialized
[ ] Active-user measurement working
[ ] Core events implemented
[ ] Recipe events implemented
[ ] Recommendation events implemented
[ ] Pantry events implemented
[ ] Planner events implemented
[ ] Notification events implemented
[ ] Feedback events implemented
[ ] No PII sent to Analytics
[ ] Offline behavior preserved

FEEDBACK CHECKLIST

[ ] Report a problem
[ ] Suggest an idea
[ ] General feedback
[ ] WhatsApp deep link
[ ] Prefilled context
[ ] Manual user submission
[ ] Recipe feedback
[ ] Feedback analytics
[ ] No false claim that WhatsApp message was sent

PRODUCTION CHECKLIST

[ ] Existing notifications still work
[ ] Existing service worker still works
[ ] PWA still works
[ ] Production build succeeds
[ ] No secrets exposed
[ ] No unnecessary API calls
[ ] No duplicate analytics system
[ ] No Supabase
[ ] No Firestore
[ ] No OneSignal

==================================================
30. MOST IMPORTANT PRODUCT PRINCIPLE
==================================================

Remember:

Firebase Analytics tells me:

“WHAT are users doing?”

WhatsApp feedback tells me:

“WHY are users doing it / WHY are they frustrated?”

MongoDB tells Zesto:

“WHAT application data is needed to make the product work?”

These systems have different jobs.

Do not merge them into one giant tracking system.

The ultimate product loop is:

DISCOVER
   ↓
RECOMMEND
   ↓
COOK
   ↓
MEASURE
   ↓
RETURN
   ↓
FEEDBACK
   ↓
IMPROVE
   ↓
DISCOVER AGAIN

Build the analytics system to help me understand this loop.

Do not optimize for collecting data.

Optimize for learning what makes Zesto useful.

Start by inspecting the existing codebase.
Do not start coding immediately.
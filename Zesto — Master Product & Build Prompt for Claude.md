# ZESTO — MASTER PRODUCT & BUILD PROMPT

You are acting as a **senior product architect, UX engineer, UI designer, frontend engineer, backend engineer, database architect, PWA engineer and product strategist**.

Your task is to design and build **Zesto**, a production-quality, mobile-first Progressive Web App that transforms a recipe collection into an intelligent food decision-making tool.

I will provide a PDF containing the original recipe/content material.

## IMPORTANT: READ THE PDF FIRST

Before designing or implementing anything:

1. Read and understand the entire PDF.
2. Extract its actual structure, terminology, recipe metadata, constraints and concepts.
3. Treat the PDF as the authoritative source for the initial recipe/content database.
4. Do NOT invent recipes and present them as coming from the PDF.
5. Do NOT silently change the meaning of the original content.
6. Identify reusable structured information such as:
   - recipe name
   - description
   - cost
   - preparation/cooking time
   - servings
   - difficulty
   - equipment
   - ingredients
   - quantities
   - optional ingredients
   - cooking steps
   - substitutions
   - money hacks
   - cost breakdown
   - categories
   - tags
   - leftovers
   - meal type
   - vegetarian/egg information
   - effort
   - equipment constraints
   - nutritional information where available
7. Where the PDF does not provide reliable information, design the system so the value can be added later rather than fabricating precision.

The PDF is the CONTENT FOUNDATION.

The application you build is the PRODUCT.

---

# 1. THE CORE PRODUCT IDEA

Do NOT build a digital recipe book.

Do NOT simply create:

Home → Categories → Recipe → Ingredients → Method.

That would only digitize the PDF.

Zesto should solve a much more human problem:

> “I'm hungry. I have these ingredients. I have this much money. I have this much time. I have this much energy. What can I make?”

The recipe collection is the knowledge base.

The **decision engine is the product.**

Zesto should help users decide what to eat based on:

- 💰 Money
- ⏱️ Time
- 🔥 Estimated calories
- 😴 Energy/effort
- 🧺 Available ingredients
- 🍳 Available equipment
- 👤 Servings
- 🥗 Dietary preferences
- ♻️ Leftovers

---

# 2. BRAND

Product name:

# Zesto

Brand personality:

**Fresh + energetic + clever + approachable**

Zesto should feel like a smart friend who understands:

“I am hungry, broke, tired, and I don't want to think.”

It should NOT feel like:

- a generic recipe website
- a clinical calorie tracker
- a boring meal planner
- a food-delivery clone
- a generic SaaS dashboard
- an AI chatbot wrapper

The product should have personality without becoming childish.

---

# 3. LOGO / VISUAL IDENTITY

Primary visual concept:

A bold, fluid **Z** formed from a single ribbon/citrus-peel-like stroke.

The Z should remain recognizable even at very small sizes.

Optional subtle detail:

One end of the ribbon may terminate in a tiny abstract leaf/teardrop form.

Do NOT use:

- chef hats
- forks
- knives
- plates
- literal lemons
- generic food-app icons
- excessive gradients
- thin startup-style line art

The logo should work at:

- 32px
- 64px
- splash-screen size
- social sharing card size

The Z visual language can recur throughout the product in subtle ways:

- loading states
- cooking progress
- empty states
- transitions
- recipe cards
- achievement states
- share cards
- splash screen

---

# 4. COLOR SYSTEM

Follow the visual spirit and **colour palette of the Vite logo**.

Use the Vite-inspired:

- electric blue
- vivid purple
- deep/dark supporting tones
- appropriate neutral surfaces

Do NOT simply copy the Vite website.

Use the palette as inspiration for Zesto's own visual identity.

The interface should feel:

**modern + energetic + clean + slightly experimental**

Avoid making every component a giant purple/blue gradient.

Use colour strategically for:

- primary actions
- active states
- progress
- recommendation confidence
- categories
- important metrics
- brand moments

Maintain excellent contrast and accessibility.

---

# 5. TYPOGRAPHY

Use the Google Font:

# Quicksand

Use Quicksand consistently throughout the product.

Typography should feel:

- friendly
- geometric
- modern
- approachable
- highly readable

Establish a proper typography scale rather than randomly changing font sizes.

Use appropriate font weights for:

- display headings
- section headings
- body
- metadata
- buttons
- numbers/statistics

---

# 6. RESPONSIVE PHILOSOPHY

Zesto must be genuinely responsive.

Minimum target:

# 320px width

It must work naturally on:

- 320px phones
- 360px phones
- 390px phones
- tablets
- laptops
- desktop monitors
- large screens

Do NOT design a desktop website and squeeze it into mobile.

Design mobile-first.

But also do NOT create a rigid breakpoint-heavy layout.

Use modern CSS:

- fluid sizing
- CSS Grid
- Flexbox
- min/max/clamp
- intrinsic sizing
- container queries where useful
- dynamic layouts

The interface should respond to **available space**, not merely device names.

---

# 7. PWA FIRST

Zesto is a PWA.

Treat offline capability as a core product requirement.

Users should be able to access core functionality even with poor or no connectivity.

Offline-capable functionality should include, where technically practical:

- recipe browsing
- recipe search
- recipe data
- pantry
- saved recipes
- cooking mode
- recently viewed recipes
- basic recommendation logic
- basic meal history

The application should provide:

- installable PWA
- app manifest
- icons
- splash behavior
- service worker
- intelligent caching
- offline fallback
- graceful online/offline state
- synchronization when connection returns

Do not create a fake PWA that only has an install prompt.

---

# 8. PRIMARY USER EXPERIENCE

The homepage should immediately answer:

# “What do you want to do right now?”

Primary actions:

### 🍳 What can I make?
Find meals based on ingredients, budget, time, effort and equipment.

### 🪙 I'm broke
Find meals within a very small budget.

### 😵 I'm too tired
Prioritize low-effort, low-cleanup meals.

### 🌙 Midnight hunger
Quick, quiet, low-cleanup food.

### ♻️ Use my leftovers
Turn existing leftovers into another meal.

### 🧺 My pantry
See what can be made from ingredients already available.

### 📅 Plan my week
Generate a practical weekly food plan.

### 🎲 Surprise me
Let Zesto decide.

These are **situational modes**, not merely recipe categories.

---

# 9. THE ZESTO DECISION ENGINE

This is the heart of the application.

The recommendation system should accept constraints such as:

Budget:
₹10 / ₹20 / ₹30 / ₹50 / ₹99 / Custom

Time:
5 min / 10 min / 15 min / 20 min / Custom

Calories:
Under 300
300–500
500–700
700–1000
Custom

Effort:
Very Low
Low
Medium
High

Equipment:

- No cooking
- Kettle
- Microwave
- One pan
- One pot
- Rice cooker
- Any equipment

Ingredients:

User-selected pantry ingredients.

Diet:

- Vegetarian
- Egg
- Custom preferences

Servings:

1 / 2 / Custom

The engine should rank recipes rather than merely filter them.

For example:

User:

Budget: ₹30
Time: 15 minutes
Calories: 400–600
Effort: Low
Ingredients: Rice + Egg + Onion
Equipment: One pan

Zesto:

# Egg Fried Rice

₹20
~450 kcal
12 min
1 pan
Low effort

You already have:

✓ Rice
✓ Egg
✓ Onion

Optional/missing:

○ Capsicum

[ START COOKING ]

---

# 10. RECOMMENDATION SCORING

Design a transparent scoring model.

Potential dimensions:

- ingredient match
- budget match
- time match
- calorie match
- effort match
- equipment match
- dietary match
- leftover match
- user history
- previously liked recipes
- ingredient expiry/usefulness

Do NOT create an opaque AI system for MVP.

Start with deterministic scoring.

For example:

Recipe Score =
Ingredient Match
+ Budget Fit
+ Time Fit
+ Effort Fit
+ Equipment Fit
+ Nutrition Fit
+ Preference Fit

Make the scoring engine modular so it can evolve later.

The user should understand WHY a recipe was recommended.

For example:

“Recommended because you already have 4/5 ingredients.”

or:

“Best match for your ₹25 budget and 10-minute limit.”

---

# 11. PANTRY SYSTEM

Users should be able to maintain:

My Pantry

Example:

Rice — 1 kg
Eggs — 6
Potatoes — 4
Onions — 500g
Bread — 8 slices
Curd — 400g
Maggi — 2 packs

Ingredients should support:

- quantity
- unit
- optional expiry date
- estimated value
- category

The system should calculate:

“What can I make with my pantry?”

It should also identify ingredients that could be reused.

Example:

“You have potatoes that can be used in 7 recipes.”

---

# 12. COST ENGINE

The original PDF uses approximate food costs.

Do NOT present prices as scientifically exact.

The system should distinguish between:

- estimated ingredient cost
- amount actually consumed
- package purchase price
- serving cost

For example:

₹40 packet
10 usable portions
Recipe consumes 1 portion

Estimated recipe cost:

₹4

Allow the cost model to evolve by region/store/brand later.

The product should communicate:

# Estimated cost

not:

# Guaranteed cost

---

# 13. NUTRITION

Support estimated nutritional information.

At minimum architect the data model for:

- calories
- protein
- carbohydrates
- fat
- fibre

Potential future fields:

- sodium
- sugar
- micronutrients

But do NOT pretend the numbers are medical-grade.

Use:

**Estimated calories**

and similar wording.

Users can filter:

Under 300 kcal
300–500 kcal
500–700 kcal
700–1000 kcal

---

# 14. WEEKLY FOOD DASHBOARD

Create a personal dashboard.

Example:

# This Week

Meals cooked
14

Estimated calories
8,420 kcal

Money spent
₹386

Ingredients used
23

Leftovers reused
4

Delivery orders avoided
5

Then:

Average meal cost
₹27.57

Estimated money saved
₹680

The dashboard should feel motivating, not like accounting software.

Use visual hierarchy and meaningful insights.

Example:

> “You cooked 5 meals for under ₹30 this week.”

> “You used 83% of the ingredients you bought.”

> “You rescued 4 leftover ingredients.”

---

# 15. MONEY TRACKING

Money should be a first-class Zesto metric.

Track:

- meal cost
- daily spending
- weekly spending
- monthly spending
- average meal cost
- estimated money saved
- estimated delivery spending avoided

Potential insight:

> “You spent ₹386 on home-cooked meals this week.”

> “Estimated savings compared with ordering: ₹520.”

Clearly label estimates.

---

# 16. ENERGY / EFFORT

Cooking time alone is insufficient.

A 10-minute recipe may require:

- chopping
- multiple utensils
- multiple pans
- constant attention

A 15-minute one-pan recipe may be easier.

Therefore create an:

# Effort Score

Possible dimensions:

- preparation complexity
- cooking complexity
- number of utensils
- number of vessels
- cleanup effort
- active cooking time

Use this in recommendations.

---

# 17. “I'M TOO TIRED” MODE

This is a major product feature.

Modes:

### No cooking
### One bowl
### One pan
### Barely any cleanup
### Under 5 minutes
### Under 10 minutes

Prioritize effort rather than simply time.

---

# 18. MIDNIGHT MODE

Create a distinctive:

# 🌙 Midnight Hunger

experience.

Consider:

- quiet cooking
- minimal equipment
- minimal cleanup
- quick preparation
- low complexity

Example:

1:17 AM

“How much effort are you willing to make?”

[ Literally none ]

[ One bowl ]

[ One pan ]

Then recommend an appropriate recipe.

This should have a distinctive visual treatment while remaining part of the main design system.

---

# 19. “I'M BROKE” MODE

Make this emotionally understandable without being insulting.

Example:

# ₹20 left?

Zesto finds what you can make.

Budget:

₹10
₹20
₹30
₹50

Show:

- estimated cost
- ingredients already owned
- missing ingredients
- calories
- effort
- time

---

# 20. LEFTOVER ENGINE

User selects:

Cooked rice
Leftover dal
Leftover sabzi
Cooked chana
Bread
etc.

Zesto responds:

“You can rescue this.”

Then show suitable recipes.

This should prioritize:

- ingredient reuse
- low additional cost
- minimal waste
- simple preparation

---

# 21. ₹99 IMPROVISATION MODE

The original content includes a formula:

BASE
+
PROTEIN
+
VEGETABLE
+
FLAVOUR

Turn this into an interactive system.

Example:

Base:
Rice

Protein:
Egg

Vegetable:
Onion

Flavour:
Chilli + Salt

Then:

# Make your own ₹99 meal

Suggest suitable known recipes where possible.

This should be a rule-based system initially.

---

# 22. “SURPRISE ME”

Create a delightful feature:

# 🎲 Surprise me

User provides constraints:

₹50 max
15 minutes
One pan

Then Zesto chooses.

Example:

# Tonight you're making...

Masala Egg Toast

₹22
7 min
1 pan
~350 kcal

[ LET'S COOK ]

The experience should feel playful.

---

# 23. RECIPE DETAIL PAGE

Do NOT create a boring recipe article.

At the top:

Recipe name

₹20
12 min
1 pan
Low effort
~450 kcal

Then:

### You already have

✓ Rice
✓ Egg
✓ Onion

### You need

○ Capsicum

Then:

# START COOKING

---

# 24. GUIDED COOKING MODE

Transform the recipe instructions into an interactive cooking experience.

Instead of dumping the entire method on the screen:

# Step 1 of 10

Break up the cold rice with your fingers or a fork.

[ DONE → ]

Then:

# Step 2 of 10

...

Allow:

- next
- previous
- progress
- completion
- timer where appropriate

Keep the interface extremely easy to use while cooking.

Large touch targets.

Minimal distractions.

Prevent accidental navigation.

---

# 25. WEEKLY PLANNER

Allow:

Budget:
₹500

People:
1

Diet:
Vegetarian

Effort:
Low

Then generate:

Monday
Breakfast
Lunch
Dinner

Tuesday
...

Aggregate the ingredients.

Generate:

# Shopping List

Rice — 1 kg
Eggs — 6
Potatoes — 1 kg
Onions — 500g
Curd — 500g

Avoid purchasing duplicate ingredients unnecessarily.

Optimize ingredient reuse.

---

# 26. RECIPE DATA MODEL

Design a normalized database.

Potential entities:

User
Profile
Recipe
Ingredient
RecipeIngredient
RecipeStep
RecipeSubstitution
Equipment
RecipeEquipment
Category
Tag
RecipeTag
PantryItem
MealHistory
Favorite
MealPlan
MealPlanItem
ShoppingList
ShoppingListItem
FoodCost
Nutrition
UserPreference

Do not blindly implement this exact schema if a better normalized design exists.

Explain your database decisions.

---

# 27. SUPABASE

Use Supabase as the backend foundation.

Use:

- PostgreSQL
- Supabase Auth
- Row Level Security
- Storage where appropriate
- Edge Functions where server-side processing is needed

Design proper:

- primary keys
- foreign keys
- indexes
- constraints
- timestamps
- user ownership
- RLS policies

Never expose service-role credentials to the client.

---

# 28. AUTHENTICATION

Design authentication so that the application can initially be explored easily.

However, user-specific features should eventually use proper Supabase authentication.

Separate:

Public content:

- recipe browsing
- public recipe information
- general discovery

Authenticated content:

- pantry
- history
- favorites
- dashboard
- meal plans
- preferences
- personal statistics

Do not unnecessarily force authentication before users understand the product.

---

# 29. FRONTEND ARCHITECTURE

Use:

- TypeScript
- modern component architecture
- semantic HTML
- accessible controls
- reusable design primitives
- clean state management
- clean data-access layer

Avoid:

- giant monolithic components
- duplicated UI
- hard-coded recipe logic throughout components
- business logic mixed into presentation
- unnecessary dependencies

Keep:

UI
↓
Application Logic
↓
Domain/Recommendation Logic
↓
Data Access
↓
Supabase

clearly separated.

---

# 30. DESIGN SYSTEM

Create a small Zesto design system.

Define:

- colors
- typography
- spacing
- radius
- shadows
- borders
- buttons
- cards
- inputs
- chips
- filters
- dialogs
- bottom navigation
- navigation
- progress indicators
- metrics
- empty states
- loading states
- error states

Do NOT make every section a card.

Do NOT create “card soup.”

Use whitespace and hierarchy.

---

# 31. MOBILE NAVIGATION

Prioritize mobile.

Potential primary navigation:

Home
Discover
Pantry
Planner
Profile

But do not blindly implement this if UX research/design suggests something better.

The homepage should remain action-oriented.

---

# 32. HOME EXPERIENCE

The home screen should NOT begin with a giant recipe grid.

The first question should be:

# What are you hungry for?

or a similarly strong Zesto-native question.

Then present situational actions.

Example:

🍳 What can I make?
🪙 I'm broke
😵 I'm too tired
🌙 Midnight hunger
♻️ Use leftovers
🎲 Surprise me

Then perhaps:

# Quick filters

Under ₹30
Under ₹50
15 min
One pan
No cooking
High protein
Vegetarian

Then:

# Because you have...

Personalized suggestions.

---

# 33. SHAREABLE RESULTS

Create beautiful shareable result cards.

Example:

# I made Egg Fried Rice

₹20
12 min
1 pan
~450 kcal

Ingredients:
Rice + Egg + Onion

#Zesto

The share card should look good when shared to:

- WhatsApp
- Instagram
- Facebook
- messaging apps
- social platforms

The goal is:

Shared result
↓
Receiver opens Zesto
↓
Recipe
↓
Product discovery

Do not build a full social network in MVP.

---

# 34. GAMIFICATION

Architect for:

### Money saved

### Meals cooked

### Cooking streak

### Leftovers rescued

### Pantry efficiency

### Challenges

Examples:

₹30 Dinner Challenge

3-Ingredient Challenge

₹100 Weekend Challenge

5-Day No-Delivery Challenge

Keep gamification subtle and useful.

Do not turn the product into a children's game.

---

# 35. PRODUCT LOOP

The primary product loop should be:

Hungry
↓
Tell Zesto your situation
↓
Zesto recommends
↓
Cook
↓
Complete meal
↓
Record cost/calories/history
↓
Dashboard improves
↓
User returns
↓
Pantry becomes smarter
↓
Recommendations improve

This loop matters more than adding dozens of features.

---

# 36. VIRAL LOOP

Do not rely on:

“Invite 5 friends.”

Instead:

User cooks something
↓
Zesto generates beautiful share card
↓
User shares:
“I made this for ₹20.”
↓
Friend opens result
↓
Friend discovers Zesto
↓
Friend tries their own situation

The product itself should generate shareable moments.

---

# 37. MVP PRIORITY

Do NOT build everything at once.

Build in phases.

## PHASE 1 — CORE PRODUCT

Implement:

1. Recipe database
2. Recipe browsing
3. Search/filter
4. Pantry
5. “What can I make?”
6. Recommendation engine
7. Recipe detail
8. Guided cooking mode
9. PWA
10. Offline core recipe access

## PHASE 2

Add:

- budget engine
- leftover mode
- effort scoring
- favorites
- recently cooked
- nutrition estimates

## PHASE 3

Add:

- weekly planner
- shopping list
- meal history
- spending dashboard
- calorie dashboard

## PHASE 4

Add:

- challenges
- streaks
- shareable cards
- savings insights
- advanced personalization

## PHASE 5

Potential future:

- AI-assisted improvisation
- community recipes
- regional pricing
- regional cuisine
- smarter personalization

---

# 38. WHAT NOT TO BUILD

Do NOT initially build:

- social network
- messaging
- restaurant delivery
- payments
- excessive AI
- complicated nutrition science
- marketplace
- ads
- unnecessary microservices
- Kubernetes
- complex backend infrastructure
- dozens of authentication screens
- overengineered state management

Keep the architecture professional but proportional.

---

# 39. SECURITY

Implement proper security from the beginning.

Consider:

- Supabase RLS
- authorization boundaries
- input validation
- secure authentication
- protected user data
- no service-role keys in frontend
- safe database queries
- XSS prevention
- CSRF considerations where applicable
- secure storage
- rate limiting where server-side APIs require it

Document important security decisions.

---

# 40. ACCESSIBILITY

Target strong accessibility.

Include:

- keyboard navigation
- visible focus states
- semantic HTML
- accessible labels
- sufficient contrast
- large touch targets
- reduced-motion consideration
- screen-reader-friendly controls

Do not sacrifice accessibility for visual effects.

---

# 41. PERFORMANCE

Zesto should feel fast.

Prioritize:

- small initial bundle
- lazy loading
- optimized images
- caching
- efficient queries
- indexed database fields
- offline data
- minimal blocking JavaScript
- responsive interactions

Avoid unnecessary animation.

Animation should communicate:

- progress
- state change
- hierarchy
- delight

not merely decorate.

---

# 42. ERROR / EMPTY / OFFLINE STATES

Design these deliberately.

Examples:

Offline:

“You're offline. Your saved recipes and pantry are still available.”

Empty pantry:

“Nothing here yet. Add a few ingredients and let's see what you can make.”

No recommendation:

“Nothing matches all your constraints. Relax one of these?”

Then suggest:

Increase budget
Add 5 minutes
Allow another ingredient
Allow another cooking method

This is much better than:

“No results found.”

---

# 43. CONTENT INTEGRITY

The supplied PDF is the initial source of truth.

Create a structured content-import strategy.

Do not manually scatter recipe information throughout frontend components.

Recipe content should exist as structured data.

The application should be able to grow from:

99 recipes

to:

500

to:

5,000+

without architectural redesign.

---

# 44. PRODUCT LANGUAGE

Keep copy:

short
human
friendly
confident
occasionally playful

Avoid corporate language.

Avoid:

“Optimize your nutritional consumption workflow.”

Prefer:

“What can you make right now?”

Avoid:

“Budget-constrained culinary recommendation.”

Prefer:

“Only got ₹20?”

The product should feel human.

---

# 45. IMPORTANT PRODUCT PRINCIPLE

Zesto should reduce **decision fatigue**.

The user should not have to answer 25 questions every time.

Progressively reveal complexity.

First:

“What do you have?”

Then optionally:

“How much do you want to spend?”

Then:

“How much time?”

Then:

“How much effort?”

The default experience should remain extremely fast.

---

# 46. DELIGHT

The product should occasionally make the user think:

> “Damn, that's actually useful.”

Examples:

“You already have everything for this.”

“You can use that leftover rice tonight.”

“You're ₹8 under budget.”

“This meal uses 4 ingredients already in your pantry.”

“You haven't ordered dinner in 5 days.”

These moments are more important than flashy animations.

---

# 47. TECHNICAL DELIVERABLES

Produce a complete working application rather than a static mockup.

Include:

- frontend
- database schema
- authentication architecture
- recommendation engine
- recipe data model
- PWA configuration
- offline strategy
- responsive UI
- seed/import strategy
- environment variable strategy
- README
- setup instructions
- deployment instructions

Target:

GitHub
↓
Vercel
↓
Supabase

---

# 48. DEVELOPMENT PROCESS

Do not immediately start generating random components.

First produce:

## STEP 1
Analyze the PDF.

## STEP 2
Extract the product requirements.

## STEP 3
Identify the entities and data relationships.

## STEP 4
Define the information architecture.

## STEP 5
Define the recommendation model.

## STEP 6
Define the design system.

## STEP 7
Define the database schema.

## STEP 8
Define the application architecture.

## STEP 9
Define MVP scope.

## STEP 10
Then begin implementation.

Before implementing major architectural decisions, explain the reasoning briefly.

---

# 49. QUALITY BAR

This should NOT look like:

“Claude generated a recipe website in 20 minutes.”

It should look like:

“A serious product designer and senior engineer built this.”

Pay particular attention to:

- visual hierarchy
- typography
- responsive behavior
- microcopy
- interaction design
- empty states
- loading states
- error states
- offline states
- database quality
- recommendation quality
- accessibility
- performance
- code organization

---

# 50. FINAL PRODUCT TEST

Before considering Zesto complete, test these scenarios:

### Scenario 1

User has:

Rice
Egg
Onion

Budget:
₹30

Time:
15 minutes

Effort:
Low

Can Zesto immediately recommend something useful?

### Scenario 2

User has:

₹20

Can Zesto find realistic options?

### Scenario 3

User is exhausted.

Can Zesto prioritize low-effort food?

### Scenario 4

It is midnight.

Can Zesto provide quick, low-cleanup options?

### Scenario 5

User has leftover rice.

Can Zesto suggest useful transformations?

### Scenario 6

User wants:

500–700 kcal

Can Zesto filter/rank appropriately?

### Scenario 7

User wants to plan a week under a budget.

Can Zesto generate a reasonable plan and shopping list?

### Scenario 8

The user loses internet access.

Does the core PWA remain useful?

### Scenario 9

The viewport is only 320px wide.

Does the UI remain usable?

### Scenario 10

The user shares a meal.

Does the generated result look like something they would actually want to share?

---

# 51. THE NORTH STAR

Never lose sight of this:

## Zesto is not a recipe book.

## Zesto is not a calorie tracker.

## Zesto is not a budget tracker.

## Zesto is not a meal planner.

Those are supporting capabilities.

The core product is:

# “Tell Zesto your situation. Zesto tells you what you can eat.”

The user might say:

> “I'm broke.”

> “I'm tired.”

> “It's midnight.”

> “I have leftover rice.”

> “I have ₹30.”

> “I have 10 minutes.”

> “I don't know what to cook.”

Zesto should turn that uncertainty into a concrete action.

---

# 52. THE EXPERIENCE WE ARE AIMING FOR

The ideal experience is:

Open Zesto.

No overwhelming dashboard.

No giant recipe catalogue.

No signup wall.

No unnecessary questions.

Just:

# What can you make right now?

A few taps.

Then:

# Here's your best match.

₹24
11 min
One pan
~420 kcal
Low effort

✓ You already have 4/5 ingredients.

Then:

# START COOKING

That is Zesto.

Build the product around that experience.
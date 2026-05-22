# RetailLens Tab Product Vision

## Purpose

This document encodes my current read of the product vision based on the live app in `src/app/page.tsx`, the tab entry components, and the supporting data models.

The short version:

- RetailLens is a private-label retail decision system.
- It is not just a price tracker.
- The core promise is: "show me where my SKU sits in the market right now, what I should do about pricing, and what product move I should make next."

## Current Product Shape

The current app exposes **2 top-level tabs**:

1. `Price Intelligence`
2. `Predictive Analytics`

The live app currently expresses the product as a tighter two-step workflow:

1. Understand the market now.
2. Decide what to do next.

That simplification feels intentional and strong.

## Cross-Tab Product Thesis

Across both tabs, the user is not a casual shopper or marketplace seller. The product appears designed for a team managing a **private-label catalog** across major retailers like Amazon, Walmart, and Target.

The user’s repeated jobs are:

- identify the true competitive set for a SKU
- understand whether the SKU is overpriced, under pressure, or strategically well positioned
- interpret competitor pricing behavior instead of reacting blindly
- simulate a price move before taking it
- distinguish a pricing problem from a portfolio problem
- spot the next SKU or adjacent trend before the current SKU slows down

In other words, the product is trying to move the user from **reactive repricing** to **strategic category management**.

## Tab 1: Price Intelligence

### What this tab is for

`Price Intelligence` is the **present-tense operating console**. Its job is to help a merchant answer:

- What are the closest market matches to my SKU?
- How active is competitor repricing?
- Where does my current price sit versus the market?
- What price band am I actually competing in?

This tab is about **market truth discovery** before action.

### The decision flow inside the tab

The tab seems designed as a sequence:

1. Pick a private-label SKU.
2. Choose which competitors matter.
3. Run AI matching to identify the real comparable listings.
4. Review the top matched products above a confidence threshold.
5. Inspect competitor price activity and pricing style.
6. See the SKU’s position on price-volume maps.
7. Build intuition about where pricing opportunity or risk exists.

This is not a generic dashboard. It is a guided workflow for forming confidence in the competitive set.

### What each major section is doing

#### Hero SKU selector

Frames the entire tab around one private-label SKU at a time. This suggests the product is built for **deep SKU-level decision-making**, not just broad account reporting.

#### Competitor toggles + "Run AI Match"

This is one of the most important product signals in the app.

The product does **not** assume retailer listings are already correctly matched. Instead, it treats matching as a core intelligence layer. That means the product vision likely believes:

- bad comparables lead to bad pricing decisions
- attribute similarity alone is not enough
- semantic and vision-based matching are part of the moat

So this tab’s first job is not "show prices." It is "establish trustworthy comparables."

#### Top 5 Market Matches

This section converts matching into an opinionated shortlist. The confidence thresholding implies the product would rather show fewer, better matches than overload the user with noisy alternatives.

This reinforces a product stance of **decision support over exhaustive search**.

#### Competitor Price Activity

This section translates price history into a behavioral read:

- who reprices often
- who is likely algorithmic
- where volatility is concentrated

The point is not just "count changes." The point is to help the user infer whether a competitor move is structural, temporary, automated, or ignorable.

#### Pricing strategy panel

This appears to summarize the behavioral profile of platforms and turn raw market data into practical guidance. It pushes the product toward explanation, not mere monitoring.

#### Market Map: Price × Volume

This is a positioning tool. It helps the user see whether they are cheap, premium, crowded, or misaligned relative to review volume and price bands.

The deeper product job here is:

- show not just the cheapest price
- show where the market clears
- help the user reason about price relative to demand proxy

#### Volume distribution by price point

This section tries to answer:

- where does market demand cluster?
- is my price sitting inside or outside the densest buying zone?

This is important because it turns pricing from a one-to-one competitor comparison into a market-shape problem.

### My read of the tab’s product intent

This tab is doing **competitive price intelligence with an analytical, merchandiser-friendly framing**.

It wants the user to leave with:

- confidence in who the real competitors are
- clarity on whether current pricing is exposed
- context on how competitors behave
- a stronger basis for repricing decisions

It is about **today’s truth**, but with more reasoning than a repricer bot.

## Tab 2: Predictive Analytics

### What this tab is for

`Predictive Analytics` is the **forward-looking strategy console**. Its job is to help answer:

- Where is this SKU’s price likely headed?
- Which trend signals are strengthening in this category?
- What adjacent SKU should I launch next?
- What are customers implicitly asking for?

If Tab 1 is "what is happening now?", Tab 2 is "what should we do next quarter?"

### The decision flow inside the tab

The tab appears to guide the user through this logic:

1. Pick a SKU.
2. Review historical price context plus forecasted direction.
3. See concrete 3M / 6M / 12M price targets.
4. Test pricing scenarios interactively.
5. Understand category trend signals.
6. Review AI-generated next-SKU opportunities.
7. Mine customer-review insight for product and messaging decisions.

This is broader than forecasting. It blends **pricing outlook, assortment planning, and product innovation**.

### What each major section is doing

#### Price forecast chart

This gives a narrative-friendly view of momentum:

- historical baseline
- projected path
- confidence band
- explicit near-, mid-, and long-term price targets

The role of this section is less "predict exact prices" and more "show directional pressure and expected range."

#### Price target cards + rationale

These cards make the forecast operational. Instead of leaving the user with a chart, the product extracts simple planning anchors for upcoming pricing windows.

The rationale text matters a lot: it suggests the product wants to explain market forces, not produce unexplained numbers.

#### Price scenario panel

This is where the product becomes prescriptive. The user can test a candidate price and immediately see:

- win probability
- estimated revenue impact
- market rank

This is a bridge between intelligence and action. It implies the product vision is not just insight generation, but **decision rehearsal**.

#### Category trend signals

This section broadens the frame from one SKU to the surrounding category. The signals span design, feature, material, and consumer behavior, which tells me the product wants to blend:

- competitive market intel
- merchandising trend spotting
- lightweight product strategy

These cards answer: "what is changing in the category that should affect what we sell?"

#### Next product opportunities

This is one of the clearest expressions of the product’s ambition.

RetailLens does not want to stop at "optimize price for current SKU." It wants to say:

- here is the adjacent product to launch
- here is the likely price range
- here is the confidence level
- here is the time-to-market logic

That means the product is aspiring to be part pricing tool, part category strategist, part assortment planner.

#### Customer signals

This section translates review language into product and listing implications. It helps the user decide:

- what to improve in the product
- what to emphasize in merchandising copy
- what unmet needs could inform the next SKU

This is a subtle but important expansion beyond pricing alone.

### My read of the tab’s product intent

This tab is really about **commercial foresight**.

It aims to help users:

- defend or expand margin
- avoid over-investing in declining segments
- enter adjacent trends early
- treat product roadmap and pricing roadmap as connected

This is the strategic half of RetailLens.

## Relationship Between The Two Tabs

The tabs feel complementary rather than redundant.

`Price Intelligence` answers:

- What am I competing against right now?
- Am I out of line with the market?
- Which market signals are trustworthy enough to act on?

`Predictive Analytics` answers:

- Where is this market moving?
- Should I hold, cut, raise, or defend price?
- What new SKU or variant should I launch next?

The clean mental model is:

- **Tab 1 = diagnose current competitive position**
- **Tab 2 = plan forward pricing and assortment moves**

That pairing is strong because it mirrors how a real merchant thinks:

1. understand the live market
2. choose the next move

## What Seems Most Central To The Product Vision

If I had to compress the vision into the most important beliefs, they would be:

1. **Correct matching is foundational.** Bad comparables destroy pricing intelligence.
2. **Pricing cannot be separated from category context.** A SKU may have a portfolio problem, not a price problem.
3. **Users need interpretation, not just telemetry.** The product repeatedly explains why something matters.
4. **The highest-value output is action.** Every major surface pushes toward repricing, defending margin, or launching an adjacent SKU.
5. **RetailLens is more strategic than a repricer.** It is positioning itself as an AI retail analyst for private-label teams.

## Product-One-Liner

If we want a crisp alignment sentence before future edits, mine would be:

**RetailLens helps private-label retail teams understand the real competitive set for each SKU, make smarter pricing decisions in the present, and identify the next product opportunity before the market shifts.**

## Assumptions I’m Making

- I am describing the **current live app** as the source of truth.
- I treat the live app as the only navigation contract for current product decisions.
- I assume upcoming edits should preserve the strong two-tab story unless you explicitly want to reopen the broader multi-tab MVP shape.

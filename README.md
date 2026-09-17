What to add in the future. (here so I don't forget)
"# Casework Future Feature Concepts

These features are candidates for later Casework releases after the core V2 learning system has been validated. Each feature should support the main product goal: helping college students become better at consulting interviews through deliberate practice rather than passive reading or answer recognition.

---

## 1. Interviewer Training

### Purpose

Teach users how consulting cases work from the **interviewer’s perspective**.

Most students only practice being the candidate. Interviewer Training would expose the hidden structure of a case: what information the interviewer has, which questions are high-value, what strong reasoning sounds like, when exhibits should be revealed, and how candidate mistakes should be handled.

Understanding the interviewer side should help users recognize what case interviews are actually evaluating and improve their own performance as candidates.

### Core Concept

The user becomes the interviewer for an existing Casework case.

Instead of solving the case, the user receives:

* the full case prompt;
* hidden case logic;
* interviewer responses;
* exhibit reveal rules;
* calculations;
* important insights;
* common candidate mistakes;
* strong reasoning patterns;
* recommendation criteria.

The system then teaches the user how to administer the case.

### Example Interaction

**Candidate says:**

> “I'd like to understand whether AlpineFit's revenue has declined.”

Casework asks:

> What should you do as the interviewer?

Possible learning exercise:

* provide the relevant revenue information;
* redirect the candidate immediately;
* tell them revenue is not the problem;
* reveal the full profitability exhibit.

After the user commits, Casework explains why an interviewer should normally provide the requested relevant information without solving the case for the candidate.

Later:

**Candidate identifies rising labor costs but does not explain why they matter.**

Casework might ask:

> What would be the most useful follow-up?

The learner selects or generates an appropriate probe such as:

> “What does that suggest about the source of the margin decline?”

### Training Topics

Interviewer Training could teach:

* how to deliver the initial prompt;
* when to answer clarification questions;
* what information should and should not be volunteered;
* when to reveal exhibits;
* how to probe weak reasoning without giving away the answer;
* how to react to unconventional but defensible approaches;
* how to handle incorrect calculations;
* when to move the candidate forward;
* how to evaluate a recommendation;
* how to give useful post-case feedback.

### Advanced Use: Peer Casing

Eventually this feature could become the foundation for **Peer Interviewer Mode**.

One student receives an Interviewer view while another receives a Candidate view.

The interviewer could:

* reveal information;
* release exhibits;
* record candidate mistakes;
* score specific behaviors;
* add structured feedback.

That feedback could later feed into the candidate's Casework Progress profile.

### Why It Is Valuable

Giving cases forces students to understand the reasoning underneath them.

Instead of only learning:

> “This is the correct question.”

they begin understanding:

> “This is why an interviewer considers this question valuable.”

It could also make students more comfortable practicing cases with friends because Casework would provide everything needed to administer the interview correctly.

### Key Product Principle

Interviewer Training should teach **how to evaluate reasoning**, not simply reveal the answer key.

---

# 2. Business Intuition Training

### Purpose

Develop the ability to quickly understand **what business information actually means**.

Many students can memorize frameworks and perform calculations but struggle to turn data into a useful business conclusion.

Business Intuition Training should teach users to recognize patterns, implications, tradeoffs, and likely explanations across many industries.

### Core Concept

Give the learner a small amount of business information and ask:

> **What does this tell you?**

The learner must generate an interpretation before Casework reveals possible explanations or comparisons.

The emphasis is not on memorizing industries. It is on developing reusable reasoning instincts.

### Example

> A gym chain increased membership by 12%, but total revenue increased only 3%.

Ask:

> What could explain this?

Possible learner reasoning:

* customers shifted toward cheaper membership tiers;
* discounts increased;
* average revenue per member declined;
* promotions brought in lower-value customers.

Casework then explains the broader principle:

> When volume grows materially faster than revenue, investigate price and mix.

### Another Example

> A factory is operating at 97% utilization and demand is forecast to grow 15%.

Ask:

> What should concern management?

The important insight is not merely:

> Utilization is high.

It is:

> Existing capacity may not support forecast growth, so management may need additional capacity or productivity improvements.

### Drill Categories

Business Intuition could include:

**Profitability patterns**

* revenue up, profit down;
* volume up, margin down;
* price up, revenue down;
* fixed costs rising versus variable costs rising.

**Customer patterns**

* customer count rising but revenue/customer declining;
* retention falling despite high satisfaction;
* one segment disproportionately driving profit.

**Operations**

* utilization;
* bottlenecks;
* yield;
* throughput;
* capacity;
* queues.

**Pricing**

* willingness to pay;
* elasticity;
* price-volume tradeoffs;
* customer segmentation.

**Growth**

* mature versus growing markets;
* customer acquisition;
* geographic expansion;
* cross-sell opportunities.

**Competitive dynamics**

* share loss;
* new entrants;
* competitor pricing;
* differentiation.

### Interaction Model

Use the Casework learning loop:

**Observe**

↓

**Generate interpretation**

↓

**Commit**

↓

**Compare with strong interpretations**

↓

**Explain implication**

↓

**Choose/generate next investigation**

This would reinforce the existing:

> **What → So what → Now what**

concept.

### Difficulty Progression

**Beginner**

Obvious business signals with some guidance.

**Intermediate**

Multiple plausible explanations.

**Advanced**

Ambiguous information where several explanations are possible and the learner must determine what additional evidence would distinguish between them.

### Why It Is Valuable

Business intuition is one of the hardest casing skills to learn directly.

Students often develop it accidentally after doing many cases.

Casework could deliberately accelerate that process by exposing users to hundreds of short business situations and requiring them to interpret the meaning rather than simply calculate an answer.

### Key Product Principle

Do not teach:

> “Whenever X happens, Y is the answer.”

Teach:

> “X suggests several possibilities. Here is how you would determine which one matters.”

---

# 3. Consulting Math Gym

### Purpose

Build fast, reliable quantitative reasoning specifically for consulting case interviews.

This should not be a generic arithmetic trainer.

Every exercise should use calculations that naturally appear inside business decisions.

### Core Concept

Users practice short quantitative problems while Casework separately diagnoses:

1. **setup;**
2. **arithmetic;**
3. **units;**
4. **sense checking;**
5. **business implication.**

The goal is not merely obtaining the number.

The learner must understand what the number means.

### Example

> A company has $2.4M of annual fixed costs and earns $300 contribution margin per customer.

Ask:

**1. Set up the calculation.**

> Break-even customers = Fixed costs ÷ contribution/customer

**2. Calculate.**

> 8,000 customers

**3. Sense check.**

> Does the magnitude appear reasonable?

**4. Interpret.**

> The company needs at least 8,000 customers annually before the operation becomes profitable.

### Core Math Categories

#### Percentages

* percentage increase/decrease;
* percentage-point differences;
* margins;
* shares.

#### Breakeven

* fixed cost;
* contribution margin;
* customers/units needed;
* investment payback.

#### Revenue and Profit

* price × volume;
* revenue growth;
* cost structures;
* margin effects.

#### Weighted Averages and Mix

* customer segments;
* product margins;
* average price;
* changing mix.

#### Capacity and Utilization

* units/hour;
* number of facilities;
* available capacity;
* capacity gaps.

#### Growth

* annual growth;
* CAGR-style reasoning;
* future demand;
* compounding.

#### Unit Economics

* revenue/customer;
* cost/customer;
* CAC;
* contribution/customer.

#### Market Sizing Math

Eventually integrate with the dedicated market-sizing curriculum.

### Training Modes

**Untimed Learning**

Focus on correct setup and reasoning.

**Accuracy Mode**

Series of problems where arithmetic errors are diagnosed.

**Speed Mode**

Short consulting-style calculations with gradually tighter time expectations.

**Mixed Case Math**

The user does not know which formula or approach is required beforehand.

This is particularly important because actual cases don't tell candidates:

> “This is a breakeven problem.”

The learner has to recognize it.

### Progress Diagnostics

Track patterns such as:

* `setup_error`
* `arithmetic_error`
* `unit_error`
* `percentage_point_confusion`
* `sense_check_missing`
* `business_implication_missing`
* `slow_percentage_math`
* `strong_quantitative_reasoning`

Casework could then recommend specific practice:

> **Your arithmetic is accurate, but you frequently finish calculations without explaining their business implication.**

That is much more useful than:

> Math score: 82%.

### Why It Is Valuable

Math is one of the easiest casing skills to practice deliberately.

It is also stressful for many students because they must calculate while speaking and reasoning.

A dedicated Math Gym would let them build automaticity before encountering the same calculations inside full cases.

### Key Product Principle

Every calculation should eventually answer:

> **So what does this number mean for the client?**

---

# 4. Case of the Day

### Purpose

Create a short, repeatable daily practice habit that keeps users engaged without requiring a full 30–45 minute case.

Case of the Day should provide one meaningful consulting reasoning challenge that takes approximately **2–7 minutes**.

### Core Concept

Each day, Casework presents one short challenge targeting a specific skill or combination of skills.

Examples include:

* clarification;
* structuring;
* prioritization;
* business intuition;
* mental math;
* exhibit interpretation;
* brainstorming;
* synthesis.

The user must commit before seeing the solution or authored comparison.

### Example

## Today's Case

> A streaming company increased subscription prices by 15%. Subscriber count subsequently fell by 8%.

**Question:**

> What additional information would you want before deciding whether the price increase was successful?

User generates an answer.

Then:

**Commit**

Casework reveals a strong comparison:

Potentially useful information could include:

* revenue before and after;
* contribution margin;
* differences across customer segments;
* churn versus expected churn;
* competitor pricing;
* customer acquisition effects.

Then Casework explains the broader principle:

> A decline in volume does not automatically mean a price increase failed. The relevant question is whether the economics improved.

### Challenge Types

Case of the Day could rotate between:

**Monday — Structure**

Build a quick issue tree.

**Tuesday — Math**

Solve and interpret a quantitative problem.

**Wednesday — Business intuition**

Interpret an unusual business pattern.

**Thursday — Exhibit**

What / So what / Now what.

**Friday — Prioritization**

Choose what to investigate next.

**Weekend — Mini Case**

A slightly longer integrated problem.

The rotation does not need to be fixed permanently, but variation prevents users from gaming one exercise type.

### Difficulty Adaptation

Eventually Case of the Day could have:

**Foundation**

For new users.

**Standard**

For users with some casing experience.

**Challenge**

Minimal scaffolding and more ambiguity.

The challenge itself could remain the same business scenario but change how much support is provided.

### Progress Integration

Daily challenges should contribute diagnostic evidence to Progress without dominating the user's skill profile.

Casework could track:

* completion;
* skill practiced;
* whether a retry occurred;
* diagnostics;
* scaffolding level.

Avoid making streaks the primary objective.

The goal is:

> practice consistently,

not:

> protect a meaningless 73-day streak.

### Optional Social Layer Later

A future version could show anonymized aggregate results after completion:

> 38% of users prioritized customer churn.
> 42% prioritized revenue/margin impact.
> 20% investigated competitors first.

Or:

> Most common missed insight: contribution margin.

This should never reveal answers before commitment.

### Why It Is Valuable

Most students will not complete a full case every day.

But many could complete a five-minute challenge.

Case of the Day gives Casework:

* a reason for users to return;
* spaced repetition;
* frequent exposure to unfamiliar business situations;
* a lightweight way to reinforce skills between full cases.

Over time, a student could accumulate hundreds of small reasoning reps.

### Key Product Principle

The daily challenge should always contain **real reasoning**.

Do not create engagement by making exercises easier, adding trivia, or rewarding mindless clicking.

The user should leave each daily challenge having practiced one meaningful consulting behavior.

---

# How These Features Fit Together

These four features serve different parts of the learning system:

### Consulting Math Gym

Builds **quantitative automaticity**.

### Business Intuition

Builds **commercial judgment and pattern recognition**.

### Case of the Day

Creates **consistent repetition and transfer**.

### Interviewer Training

Builds **deeper understanding of what good casing looks like** and eventually enables higher-quality peer practice.

Together they support the same Casework philosophy:

> **Do not just give students more cases. Break strong case performance into trainable behaviors, deliberately practice those behaviors, and then require students to combine them independently.**

## Suggested Future Priority

After the current V2 learning foundation is validated:

1. **Business Intuition Training**
2. **Consulting Math Gym**
3. **Case of the Day**
4. **Interviewer Training**
5. **Peer Interviewer Mode** built on top of Interviewer Training

Business Intuition and Math Gym can reuse much of Casework's existing drill infrastructure. Case of the Day can then reuse exercises from across the platform. Interviewer Training is potentially more differentiated, but it deserves more product design because it eventually opens the door to live peer casing.
"

Thats it for now. Gonna have to make the website not too bloated tho, and not messy so the user doesnt get lost. Maybe have diff feel for each page. Like for the math page its black and pretty bare, but the probem of hte day is centered and text box right there idk.


# Casework

Casework is a deterministic case-interview practice app. It combines focused
skill drills, six hand-authored full cases, transparent scoring, case replay,
and progress-based practice recommendations.

## Architecture decision: No AI in V1

V1 does not install or call an AI, LLM, embedding, or machine-learning API.
Case paths, reveal rules, calculations, scoring, feedback, and recommendations
come from versioned authored content and deterministic TypeScript logic. Inputs
are structured; free text is available only for ungraded scratch work.

## Local setup

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Guest drill and case
history uses browser `sessionStorage`, so the complete AlpineFit demo works
without an account or environment variables.

## Supabase authentication and persistence

Signed-in persistence is enabled only when both public variables are present:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Put local values in `.env.local`; environment files are ignored by Git. To
apply the checked-in schema with the Supabase CLI after linking the project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

The migration at `supabase/migrations/001_initial.sql` creates profiles, drill
attempts, case attempts, case events, row-level security policies, validation
constraints, and the atomic case-save function. Never expose the Supabase
service-role key to the browser or add it to `NEXT_PUBLIC_*` variables.

## Content authoring rules

- Validate cases with `CaseDefinitionSchema` and `assertValidCase`; never render
  unvalidated content.
- Keep stable lowercase slug IDs for cases, facts, nodes, exhibits, and drills.
- Source every exhibit from authored facts and keep hidden critical/root-cause
  metadata out of the learner projection before completion.
- Give each case at least two exhibits, a low-value decoy, a relevant
  noncritical branch, and at least two efficient paths.
- Do not grade one exact investigation path. Credit authored alternate paths
  and evidence discovered before a submission.
- Keep calculations deterministic, unit-labeled, and tolerance-checked.
- Map every Learn lesson to a valid drill skill and `/drills/{skillId}` route.
- Preserve the V1 library contract: five drill skills with ten exercises each
  and exactly six full cases in the approved category mix.

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Unit and component tests run with Vitest. Critical guest, keyboard,
accessibility, responsive, case, drill, and progress journeys run with
Playwright in Chromium.

## Deployment

The app is compatible with Vercel. Configure the two public Supabase variables
in the Vercel project when account persistence is required; otherwise the guest
experience remains available. Run the full verification commands before each
release.

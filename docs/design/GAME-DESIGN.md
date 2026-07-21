# Solidarity Not Charity Can Run
## Game Design Document

**Short title:** SNC Can Run  
**Document ID:** SNC-GDD-001  
**Version:** 1.2 public editorial baseline  
**Date:** 2026-07-20  
**Primary audience:** Codex developers, SNC content owners, playtesters  
**Document emphasis:** Game design first; implementation constraints only where they protect the intended play experience  
**Status:** Core direction approved by the user. Numerical balance values marked **Proposed** remain subject to playtesting. This editorial version removes transient repository-audit details without changing approved game design.

---

# Overall goal

Build **Solidarity Not Charity Can Run** as a fast, replayable, portrait-first mobile speed-running game about collecting canned goods and completing community distribution routes.

The shipped experience must use the existing custom raycaster, remain readable and responsive on Android Chrome, preserve the strict single-file release direction, and place play feel above graphical expansion.

# Current goal

Use this document as the authoritative design baseline for SNC product and gameplay decisions. Implementation remains card-based, evidence-backed, and subject to the authorization gates in the public roadmap.

# Plain-language summary

The player begins as a nameless **New Volunteer**. During each level, the player runs through a fixed map, automatically collects randomly placed canned goods, and deliberately delivers them to community members.

- A community member requests **one can**.
- A household requests **three cans**.
- The player begins with space for **three cans**.
- There is no death, life counter, or timeout.
- Finishing quickly is the goal.
- The official score is the total time across the run.
- After each completed level, a portal appears, the player chooses one roguelike upgrade, and the next level begins.
- Three worlds contain three levels each.
- World 1 teaches route planning with stationary recipients.
- World 2 adds recipients who move on predictable loops.
- World 3 adds recipients who actively reposition away from the player.
- Completing milestones unlocks current and former SNC members as playable characters in the **Hall of Servants**.
- Each unlocked character has one small passive ability.
- The current custom raycaster remains the game runtime. PixiJS and the separate SFHS PixiJS work are not replacements for SNC.

---

# 1. Authority, status, and source boundaries

## 1.1 Status vocabulary

This document uses four evidence labels:

- **Locked:** Explicitly approved game direction.
- **Verified:** Directly confirmed in the current public repository or supplied runtime state.
- **Proposed:** A concrete starting value or implementation interpretation that still requires playtesting.
- **Deferred:** Intentionally outside the first implementation pass.

## 1.2 Canonical repository baseline

| Item | Canonical value |
|---|---|
| Repository | `falloutmule/solidarity-not-charity-can-run` |
| Canonical branch | `main` |
| Current shipped build ID | `inputcadence1` |
| Production URL | `https://falloutmule.github.io/solidarity-not-charity-can-run/` |
| Release artifact | root `index.html` |
| Editable source | `src/` plus `src/build-manifest.json` |
| Runtime authority | public repository `main` |

The current build uses the selected 400-wide internal resolution, interpolated angle handling, and subpixel projection. Commit identity is derived from Git and CI rather than embedded as permanent design authority.

## 1.3 Public repository boundaries

The public repository contains living product documentation, canonical source, the generated release artifact, maintained tests, and CI. Raw audits, proof output, backups, branch inventories, machine paths, and superseded handoffs remain outside public history.

Repository cleanup, publication, or documentation work is not permission to change gameplay behavior. Any behaviorally different build requires a bounded card, a new `BUILD_ID`, focused automated proof, and any required physical-device acceptance.

## 1.4 Design authority

When implementation history and this approved design conflict:

1. protect the current production artifact;
2. document the conflict;
3. treat this GDD as the intended new gameplay direction;
4. do not silently reinterpret the design to match old code;
5. do not claim the new design exists until it is functionally verified.

---

# 2. Product vision

## 2.1 Elevator pitch

**SNC Can Run** is a mobile-first first-person route-optimization game where a volunteer races through stylized local environments, gathers canned goods, serves individuals and households, and builds a run-specific set of upgrades across nine short levels.

## 2.2 Player fantasy

The player fantasy is:

> Move with purpose, learn the route, find the supplies, reach every community member, and improve the next run.

The game should feel energetic and skillful without making community service into combat, pity, or rescue fantasy.

## 2.3 Intended audience

Primary:

- SNC supporters and community members;
- mobile browser players;
- short-session arcade and speed-running players;
- people interested in local venues and SNC history.

Secondary:

- desktop browser players;
- community event visitors;
- players who enjoy route learning and personal-best improvement.

## 2.4 Intended session length

**Locked:** Levels are short and replayable.

**Proposed full-run target:** approximately 18–25 minutes for a first complete nine-level run, falling substantially with route mastery, better upgrade choices, and unlocked servants.

Individual level targets appear in the level specifications.

---

# 3. Design pillars

## 3.1 Play experience first

Movement feel, input reliability, target readability, and frame pacing outrank graphical complexity.

The visual budget expands only until it begins to:

- reduce movement smoothness;
- hide cans or recipients;
- make target selection unclear;
- add visual noise to the minimap;
- obscure routes;
- worsen Android performance;
- create sprite/facade depth errors.

When a graphical feature conflicts with play, the graphical feature is reduced or removed.

## 3.2 Solidarity, not saviorism

The game must communicate mutual aid and community participation.

Design rules:

- use **community member** and **household** as mechanical terms;
- do not label people by hardship;
- do not use degrading, frightened, or helpless presentation;
- recipients have visible agency and accept a targeted handoff;
- volunteers are peers, not superior characters;
- the Hall celebrates service without ranking the worth of real people;
- ability names and biographies require approval when tied to real members.

## 3.3 Fast, clear, learnable routes

Maps are fixed so players can learn them.

Variation comes from:

- seeded can placement among authored anchors;
- portal location;
- upgrade offerings;
- moving-recipient timing;
- the selected Hall servant.

The player should become faster because they understand the space and systems, not because the game hides unreadable rules.

## 3.4 Portrait-native mobile play

Android Chrome in portrait orientation is the primary experience.

The interface order is locked:

```text
Game view
Minimap
Controls
Stat bar
```

Controls must be movable, resizable, and usable with two thumbs.

## 3.5 Simple growth with meaningful choices

Characters have one small passive ability.

During a run, the player chooses one of three simple upgrades after each level.

Upgrades must be immediately understandable and visibly reflected in the HUD or play.

## 3.6 Local visual identity

Recognizable local venue fronts provide the visual identity.

The game does not need complete architectural simulation. A venue's approved front facade can be accurate while side walls, rear walls, alleys, roofs, and inaccessible geometry remain generic and gameplay-driven.

---

# 4. Core game structure

## 4.1 Primary run

A primary run contains all nine campaign levels in order:

```text
World 1, Level 1
World 1, Level 2
World 1, Level 3
World 2, Level 1
World 2, Level 2
World 2, Level 3
World 3, Level 1
World 3, Level 2
World 3, Level 3
```

A level ends immediately when the last required delivery is completed.

The level timer stops at that moment.

A portal then opens at one valid authored portal anchor. The player may approach and enter it outside the official timer. Entering the portal presents three upgrade choices and then advances to the next level.

After Level 9, the portal is replaced by the final run result.

## 4.2 Main menu structure

**Locked first-release menu:**

1. **Start Run**
2. **Practice**
3. **Hall of Servants**
4. **Leaderboards**
5. **Controls**
6. **Settings**
7. **Credits**

Practice becomes useful after levels have been unlocked. Practice times may be stored locally but do not count as the primary overall leaderboard score.

## 4.3 Start state

The first available playable character is:

```text
New Volunteer
Name: intentionally unnamed
Ability: none
Status: unlocked by default
```

The player can later select unlocked SNC members from the Hall of Servants.

## 4.4 Win state

A **win** is completing the full nine-level run.

World completion and medal thresholds may also unlock Hall content, but the full-run completion is the primary campaign win.

## 4.5 No fail state

**Locked:**

- no health;
- no death;
- no lives;
- no forced timeout;
- no level failure;
- no game-over screen.

A player can always finish.

Poor routing, collisions, mistaken target attempts, and missed opportunities affect time only.

The current timeout behavior should be removed from the final design implementation.

---

# 5. Core gameplay loop

## 5.1 Before the level

1. Load the fixed level geometry.
2. Load fixed recipient positions or movement routes.
3. Resolve the run seed.
4. Select can spawn anchors.
5. Validate all selected cans are reachable.
6. Reset the player's carried cans for the level unless a later approved design says otherwise.
7. Show the level title and objective summary.
8. Run a three-second countdown.
9. Begin the timer on **GO**.

## 5.2 During the level

1. Navigate in first person.
2. Use the minimap to understand the fixed space.
3. Automatically pick up canned goods when capacity is available.
4. Identify community members and households.
5. Approach, face, and target the intended recipient.
6. Press Deliver.
7. Use sprint blocks to improve route time.
8. Adapt to moving or avoiding recipients in later worlds.
9. Complete every requested delivery.

## 5.3 After the final delivery

1. Stop the segment timer immediately.
2. Play the completion sound and haptic.
3. Record the segment split.
4. Open a portal at a seeded valid anchor.
5. Show the portal on the minimap.
6. Enter the portal outside timed play.
7. Choose one of three run upgrades.
8. Start the next level with a new countdown.

## 5.4 End of the run

After World 3, Level 3:

1. Stop the final segment time.
2. Calculate overall run time.
3. Apply any explicit time penalties already recorded.
4. Compare with the local personal best.
5. Submit to the appropriate leaderboard when online and eligible.
6. Present level splits.
7. Present unlocks.
8. Offer immediate restart, Hall visit, leaderboard, or main menu.

---

# 6. Scoring and timing

## 6.1 Primary score

**Locked:** The primary score is **overall run time**.

There are no points, combat score, style score, or resource-value multipliers in the first design.

## 6.2 Timed periods

The official timer runs only between:

```text
GO
and
the final required delivery in the level
```

The following are not timed:

- countdown;
- portal approach;
- upgrade selection;
- loading;
- menus;
- Hall of Servants;
- result screens.

## 6.3 Splits

Each level records a split for player feedback and verification.

Splits are secondary information. The main leaderboard ranks total nine-level time.

## 6.4 Penalties

**Proposed first-release penalty:**

- attempting to deliver to a volunteer in World 2, Level 3 adds **1.0 second** to the active run time.

Other invalid delivery presses produce feedback but no additional numeric penalty.

This preserves the user's direction that consequences remain part of overall time rather than creating a separate scoring system.

## 6.5 Pause behavior

**Proposed:**

- Casual and Practice modes pause simulation and the segment timer.
- Ranked runs allow pause for accessibility and mobile interruptions, but the pause screen does not expose a larger tactical map.
- Returning from a hidden/background browser state safely resumes at a countdown.
- A resumed run may be marked as resumed in leaderboard metadata if competitive integrity later requires it.

No anti-cheat claim should be made until a real leaderboard implementation exists.

---

# 7. Fixed layout and seeded variation

## 7.1 What remains fixed

For each level:

- walls and walkable space;
- major obstacles;
- venue facades;
- recipient identities and request sizes;
- stationary recipient anchors;
- moving recipient route graphs;
- avoidance navigation nodes;
- authored can spawn anchors;
- authored portal anchors;
- collision classes.

## 7.2 What changes by seed

- which can anchors are active;
- portal anchor after completion;
- upgrade choices;
- optional small timing offsets on moving loops;
- optional cosmetic variation.

## 7.3 Can placement rules

Cans are not placed at arbitrary coordinates.

Each level contains authored spawn anchors with tags such as:

```text
open
hidden
alley
parking
near-start
mid-route
far-route
behind-vehicle
facade-corner
industrial
event
```

The seed selects the exact required number of cans from those anchors.

Validation requirements:

- every can is reachable;
- no can overlaps solid collision;
- no can is inside a recipient;
- no can is hidden by an unavoidable opaque billboard;
- the placement uses more than one route zone;
- the placement matches the level's intended search difficulty;
- World 1, Level 3 selects enough hidden anchors to preserve its concept;
- the total can count always satisfies all requests.

## 7.4 Fair leaderboard randomness

Random placement and a shared leaderboard conflict unless players receive comparable seeds.

**Design rule:**

- **Free Run** uses a new random seed and stores personal results.
- **Ranked/Featured Run** uses a shared deterministic seed so all submitted players receive the same can anchors, portal anchors, movement offsets, and upgrade choices.
- Leaderboard entries are partitioned by ruleset version and build ID.
- Every result stores its run seed.

A remote leaderboard is not required for offline play. A local top-ten board must remain available.

---

# 8. Canned goods and carrying

## 8.1 Item model

All canned goods are mechanically identical.

Labels or can art may vary for visual interest, but there is no food-type matching requirement in the first design.

## 8.2 Starting capacity

**Locked:** The player begins each run with capacity for **three cans**.

## 8.3 Capacity upgrades

Run upgrades may increase capacity.

**Proposed cap:** six cans.

The cap should remain low enough that route planning and returns to supply clusters still matter.

## 8.4 Pickup

**Locked direction: automatic pickup.**

A can is collected when the player enters its pickup radius and has capacity.

Feedback:

- short pickup sound;
- small haptic pulse;
- can-count animation;
- world can disappears;
- minimap marker clears when present.

When full:

- the can remains in the world;
- the HUD briefly pulses the capacity count;
- no harsh error sound plays.

## 8.5 Carrying effect

**Locked:** Carrying cans does not reduce movement speed.

---

# 9. Recipients and delivery

## 9.1 Recipient types

### Community member

- request: one can;
- marker: single-can icon plus shape;
- completes after receiving one can.

### Household

- request: three cans;
- marker: household/group icon plus `0/3`, `1/3`, or `2/3`;
- may receive partial deliveries;
- completes at `3/3`.

A household can be represented by a grouped silhouette or one household representative with a clear three-can request. The game does not need to depict children or make assumptions about family composition.

## 9.2 Targeted delivery

Delivery is deliberate, not automatic.

A recipient becomes targetable when:

- inside delivery range;
- within the delivery targeting cone;
- not blocked by a solid wall;
- incomplete;
- selected as the best valid target.

The HUD shows:

- target outline or reticle;
- recipient type;
- remaining request;
- active Deliver button.

## 9.3 Delivery action

One Deliver press transfers as many cans as possible up to:

```text
minimum(
  cans carried,
  cans still requested
)
```

Examples:

- individual request `1`, player carries `3` → transfer `1`;
- household request `3`, player carries `3` → transfer `3`;
- household request `3`, player carries `1` → transfer `1`, leave `2` remaining.

## 9.4 Delivery upgrades

The portal upgrade pool may improve:

- delivery range;
- target cone width;
- short target-lock forgiveness.

The design should preserve deliberate facing and proximity. Upgrades may make delivery more forgiving, but should not turn it into map-wide automatic service.

## 9.5 Proposed starting values

These are tuning baselines, not implementation claims:

| Parameter | Proposed value |
|---|---:|
| Pickup radius | 0.45 world units |
| Delivery range | 1.25 world units |
| Target cone | ±18 degrees |
| Target-lock grace | 120 ms |
| Delivery transfer duration | effectively immediate, with short feedback animation |

---

# 10. Movement and sprint

## 10.1 Movement model

The player has free first-person movement:

- forward;
- backward;
- strafe left/right;
- turn left/right;
- sprint burst.

The player is not an automatic runner.

## 10.2 Collision

Solid walls, vehicles, fences, barriers, and authored obstacles block movement.

Collision itself does not add a separate penalty. The lost movement time is the consequence.

NPCs use soft personal-space collision or sliding so they do not become hard walls.

## 10.3 Sprint blocks

**Locked direction:** Sprint uses single-shot rechargeable blocks.

Starting state:

- one sprint block;
- pressing Sprint consumes one full block;
- the burst begins immediately;
- a used block recharges over time;
- upgrades may add blocks or improve recharge.

## 10.4 Proposed sprint baseline

| Parameter | Proposed value |
|---|---:|
| Starting blocks | 1 |
| Maximum blocks through upgrades | 4 |
| Burst duration | 0.85 seconds |
| Speed multiplier | 1.45× |
| Recharge per block | 3.5 seconds |
| Input | tap, not hold |

These values must be tested against the current movement and rendering behavior before being frozen.

## 10.5 Character interaction

A Hall servant may provide a small sprint passive, such as:

- one additional starting block;
- modestly faster recharge;
- slightly longer burst duration.

Only one passive belongs to each servant.

---

# 11. Portal and roguelike upgrade system

## 11.1 Portal behavior

After the final delivery:

- the timer stops;
- one portal anchor is selected by the run seed;
- the portal appears with sound, light, and minimap marker;
- the approach to the portal is untimed;
- entering opens the upgrade choice;
- the player cannot return to the completed level.

The portal should never spawn:

- inside solid collision;
- behind an inaccessible route;
- under a recipient;
- in a visually unreadable corner;
- beneath mobile UI.

## 11.2 Upgrade choice

After Levels 1–8:

- present three upgrade cards;
- choose exactly one;
- no reroll by default;
- maxed upgrades are removed from the offer pool;
- at least one offered upgrade must be usable;
- selection time is not scored.

After Level 9, no upgrade is offered.

## 11.3 Upgrade persistence

Portal upgrades last for the current nine-level run only.

They reset when a new run starts.

Permanent progression is limited to:

- Hall servant unlocks;
- settings;
- local records;
- medal or achievement records;
- approved cosmetic unlocks.

## 11.4 Proposed upgrade pool

| Upgrade | Effect | Proposed cap |
|---|---|---:|
| **Bigger Tote** | `+1` can capacity | capacity 6 |
| **Long Reach** | increase delivery range | 3 ranks |
| **Clear Aim** | widen delivery targeting cone | 2 ranks |
| **Extra Wind** | `+1` sprint block | 4 total blocks |
| **Quick Recovery** | reduce sprint recharge time | 3 ranks |
| **Long Stride** | increase sprint burst duration | 2 ranks |
| **Community Map** | advance minimap information tier | final map tier |
| **Wide Pickup** | increase can pickup radius | 2 ranks |

## 11.5 Upgrade presentation

Each card must contain:

- short title;
- one-sentence plain-language effect;
- current-to-new value;
- simple icon;
- maximum-rank indicator where relevant.

No hidden formulas are required for the first release.

---

# 12. Hall servants and character abilities

## 12.1 New Volunteer

The nameless New Volunteer is the default character.

Purpose:

- neutral baseline;
- no biography;
- no passive advantage;
- available before any unlock;
- represents a new person joining the work.

## 12.2 Unlockable servants

Current and former SNC members can become playable after approved milestones.

Each has:

- portrait;
- approved display name;
- current/former designation where appropriate;
- service years or role when approved;
- one approved sentence;
- one small passive ability;
- unlock condition.

## 12.3 Ability design rules

Abilities must be:

- simple;
- positive;
- understandable in one sentence;
- mechanically modest;
- respectful;
- approved by the represented person or content owner;
- unrelated to sensitive personal traits;
- recorded in leaderboard metadata.

Suggested ability families:

| Ability family | Example |
|---|---|
| Endurance | sprint blocks recharge 10% faster |
| Capacity | start with one additional can slot |
| Reach | delivery range is slightly larger |
| Focus | delivery target cone is slightly wider |
| Navigation | begin one minimap tier higher |
| Momentum | sprint burst lasts slightly longer |

These are examples, not assigned identities.

## 12.4 Balance budget

**Proposed:** A servant passive should create a noticeable preference but not dominate the full run.

Target power budget:

- approximately 5–10% advantage in the mechanic it modifies;
- much smaller effect on total theoretical run time;
- no character should make another character strictly obsolete across every level.

## 12.5 Unlock framework

Because the final member list is not yet supplied, unlock mapping remains data-driven.

Recommended milestone types:

- complete World 1;
- complete World 2;
- complete the full run;
- earn a time medal;
- complete a featured seed;
- discover a Hall entry.

The first full-run win should unlock at least one servant.

---

# 13. Minimap design

## 13.1 Position and orientation

The minimap sits directly below the game view.

It is:

- north-up;
- simplified;
- readable at portrait width;
- updated from world data, not from rendered pixels;
- separate from control hit zones.

The player icon rotates to show facing.

## 13.2 Base map

The starting minimap shows:

- player position and facing;
- solid geometry;
- map boundary;
- north marker;
- active portal after completion.

Recipients may appear only when discovered in the lowest tier, depending on final tutorial testing.

## 13.3 Proposed minimap tiers

| Tier | Information |
|---|---|
| **Tier 0 — Route Map** | player, geometry, boundary, portal |
| **Tier 1 — Community Map** | all incomplete community members and households |
| **Tier 2 — Can Memory** | discovered cans remain marked |
| **Tier 3 — Supply Pulse** | periodically reveals nearby undiscovered cans |
| **Tier 4 — Full Supply Map** | shows all current cans |

Volunteers are never shown on the minimap in World 2, Level 3.

## 13.4 World 1, Level 3 rule

The parking-lot level is built around visible recipients and hidden cans.

At base minimap tiers:

- cans remain hidden until discovered;
- can anchors emphasize vehicles, facade corners, planters, and sightline breaks.

A high-tier run upgrade may reveal them. That is an earned advantage, not a violation of the level concept.

---

# 14. Portrait mobile interface

## 14.1 Locked vertical order

```text
┌─────────────────────────┐
│       GAME VIEW         │
├─────────────────────────┤
│        MINIMAP          │
├─────────────────────────┤
│        CONTROLS         │
├─────────────────────────┤
│        STAT BAR         │
└─────────────────────────┘
```

## 14.2 Starting layout allocation

The previously approved starting allocation is:

| Region | Starting share |
|---|---:|
| Game view | 56% |
| Minimap | 14% |
| Controls | 22% |
| Stat bar | 8% |

This is a layout starting point, not permission to distort the raycaster.

The raycast view preserves its rendering aspect ratio. Any unused region may use branded padding, framing, or adaptive spacing. Real Android tests may rebalance the percentages while preserving the locked vertical order.

## 14.3 Game view

The game view contains:

- first-person raycast scene;
- target reticle;
- recipient request marker;
- pickup feedback;
- portal;
- brief level/countdown overlays.

Dense text belongs outside the raycast canvas.

## 14.4 Controls region

Default scheme:

- movable left virtual joystick for forward/backward/strafe;
- movable right drag area for turning;
- Deliver button;
- Sprint button;
- Pause button at a safe edge.

Automatic pickup avoids a separate pickup button.

## 14.5 Control customization

The Controls screen must support:

- drag-to-place controls;
- control size;
- opacity;
- joystick radius;
- movement dead zone;
- look sensitivity;
- left-handed preset;
- Sprint and Deliver button placement;
- reset to default;
- preview/test mode.

Control editing must not modify active gameplay state.

## 14.6 Pointer requirements

Every touch control must:

- track its own pointer ID;
- use pointer capture where supported;
- recover from `pointercancel`;
- allow movement and another button simultaneously;
- avoid browser pan/zoom gesture theft;
- remain clear of safe-area and Android gesture regions.

## 14.7 Stat bar

The bottom stat bar shows:

- current overall time;
- current level split time or personal-best delta;
- cans carried and capacity;
- deliveries remaining;
- sprint blocks and recharge;
- pause/settings affordance.

Example:

```text
12:43.8   -04.2   CANS 2/4   LEFT 3   SPRINT ●◐○
```

Icons must use shape and text, not color alone.

## 14.8 Desktop support

Secondary desktop controls:

- `WASD` movement;
- mouse drag, pointer lock, or arrow keys for turning according to current engine support;
- `Shift` for Sprint;
- `E` or Space for Deliver;
- `Escape` for Pause.

Android Chrome remains the design authority.

---

# 15. World progression overview

## World 1 — Ready to Receive
**Mechanical theme:** Recipients stand in place.

Player learning:

- movement;
- collection;
- capacity;
- one-can versus three-can requests;
- targeted delivery;
- route planning;
- search and sightlines.

## World 2 — Community in Motion
**Mechanical theme:** Recipients move on predictable loops.

Player learning:

- interception;
- route timing;
- split spaces;
- moving target selection;
- volunteer recognition.

## World 3 — Catch the Moment
**Mechanical theme:** Recipients reposition away from the approaching player.

Player learning:

- corralling;
- prediction;
- controlled-path interception;
- route denial;
- handling multiple active movers.

World names are working titles and can change without changing the mechanical design.

---

# 16. Level roster

All recipient counts below are **Proposed first-playtest targets**. They may be tuned after the core loop is verified.

| Level | Working name | Core layout | Recipient behavior | Proposed request mix | First-clear target |
|---|---|---|---|---|---:|
| 1-1 | Open Park | wide open park | stationary | 3 individuals, 1 household = 6 cans | 60–90 sec |
| 1-2 | Street and Alley | street plus alley route | stationary | 4 individuals, 1 household = 7 cans | 90–120 sec |
| 1-3 | Parking Lot Search | visible people, hidden cans | stationary | 4 individuals, 2 households = 10 cans | 2–3 min |
| 2-1 | Split Street | street divided into halves | fixed loops | 5 individuals, 1 household = 8 cans | 2–3 min |
| 2-2 | Industrial Route | loading lanes and yards | fixed loops | 4 individuals, 2 households = 10 cans | 2–3 min |
| 2-3 | Community Event | event crowd with volunteers | fixed loops | 5 individuals, 2 households = 11 cans | 2–3 min |
| 3-1 | Easy Corrals | fences and open pockets | avoidance, easily corralled | 4 individuals, 1 household = 7 cans | 2–3 min |
| 3-2 | Controlled Paths | constrained path network | avoidance on paths | 4 individuals, 2 households = 10 cans | 3–4 min |
| 3-3 | Free for All | open mixed-route finale | full avoidance | 5 individuals, 2 households = 11 cans | 3–5 min |

The full active billboard/NPC count should remain within the tested raycaster budget. Volunteer counts are additional but should be conservative.

---

# 17. Detailed level specifications

## 17.1 World 1, Level 1 — Open Park

### Purpose

Teach the complete basic loop in a readable space.

### Layout

- broad park;
- large central lawn;
- simple path loop;
- a few trees, benches, signs, and pass-through bushes;
- minimal occlusion;
- visible local facade or park landmark at one edge;
- no narrow collision traps.

### Recipient placement

- recipients remain stationary;
- at least one individual is visible from the start;
- household is placed slightly farther away;
- markers teach `1` versus `3`.

### Can placement

- mostly visible;
- at least one can near the start;
- at least one can off the direct first route;
- seed chooses among open anchors;
- no hidden-can requirement.

### Tutorial delivery

Use short contextual prompts:

```text
Move
Collect cans automatically
Face a community member
Press Deliver
Households need 3
Tap Sprint for a burst
```

Prompts disappear permanently once learned unless reset in settings.

### Completion standard

The player should understand the whole loop after one play without reading a manual.

---

## 17.2 World 1, Level 2 — Street and Alley

### Purpose

Introduce route choice and partial visual occlusion.

### Layout

- main street;
- one side alley;
- one short alternate route;
- storefront facades;
- generic side and rear walls;
- a few parked solid vehicles or barriers;
- pass-through sign and bush billboards.

### Recipient placement

- all stationary;
- at least one recipient in the alley;
- household positioned so the player must decide when to arrive with three cans.

### Can placement

- mix of street and alley anchors;
- seed cannot place every can in one zone;
- at least one placement encourages entering the alley;
- line-of-sight remains fair.

### Skill test

The player learns that the fastest route is not always the most visually direct route.

---

## 17.3 World 1, Level 3 — Parking Lot Search

### Purpose

Introduce active searching while keeping recipients stationary.

### Layout

- parking lot;
- rows of solid parked vehicles;
- storefront or venue facade visible from the lot;
- islands, planters, carts, signs, and barriers;
- multiple sightline breaks;
- no moving cars.

### Central rule

The player can see or locate the recipients more easily than the cans.

### Can placement

- selected from hidden or partially hidden anchors;
- behind vehicles;
- near facade corners;
- beside planters;
- at ends of parking rows;
- never inside unfair pixel-thin gaps;
- not shown on the base minimap until discovered.

### Readability safeguards

- cans use a strong silhouette and pickup glint;
- near-field bushes fade or become less opaque if they cover a can;
- no fog pass may erase the can silhouette;
- the search challenge comes from geometry, not low contrast.

### Skill test

Remembering searched areas and using the minimap as a route record.

---

## 17.4 World 2, Level 1 — Split Street

### Purpose

Introduce moving recipients with simple interception.

### Layout

- street divided by median, fence, construction barrier, or landscaped divider;
- two primary halves;
- two or more crossings;
- fixed route loops on both sides;
- venue fronts give orientation landmarks.

### Recipient behavior

- recipients walk on fixed loops;
- movement is slower than normal player speed;
- loop direction remains readable;
- local avoidance prevents overlap;
- households move more slowly or pause longer at nodes.

### Can placement

- distributed across both halves;
- no seed may place all cans on one side;
- route should encourage using a crossing strategically.

### Skill test

Decide whether to chase a current target or continue collecting and intercept later.

---

## 17.5 World 2, Level 2 — Industrial Route

### Purpose

Increase route complexity and moving-target occlusion.

### Layout

- industrial street or yard;
- loading bays;
- containers;
- fences;
- service alleys;
- wide lanes;
- solid machinery silhouettes only where clearly readable;
- approved local industrial facades where available.

### Recipient behavior

- predictable fixed or semi-fixed loops;
- some loops pass behind large occluders;
- pause points create interception opportunities;
- no random wandering.

### Can placement

- tagged industrial anchors;
- some cans near loading areas;
- some in longer route branches;
- never hidden in visually identical repeated geometry without landmarks.

### Skill test

Use landmark recognition and loop timing rather than following a target continuously.

---

## 17.6 World 2, Level 3 — Community Event

### Purpose

Test identification and targeting in a moving crowd.

### Layout

- event grounds;
- tents or booths;
- stage or central landmark;
- distribution tables;
- temporary barriers;
- open circulation paths;
- local venue or event imagery where approved.

### Community members

- follow fixed loops;
- individuals and households remain visually distinguishable;
- request markers appear only for valid recipients.

### Volunteers

- wear clear SNC shirts, vests, or approved markers;
- move on fixed loops;
- act as soft obstacles and visual decoys;
- never accept cans;
- never appear on the minimap;
- incorrect delivery attempt adds the proposed one-second time penalty;
- feedback reads `Volunteer — keep moving`.

### Tone rule

Volunteers are not fake recipients or comic mistakes. They are active event workers whose role must remain visually respectful and clear.

### Skill test

Quickly identify the correct target while maintaining a route through a crowd.

---

## 17.7 World 3, Level 1 — Easy Corrals

### Purpose

Introduce avoidance in a forgiving environment.

### Layout

- open area divided into broad pockets;
- fences, benches, planters, low barriers, and facade edges form easy corrals;
- multiple safe approaches;
- no recipient can become permanently trapped outside reach.

### Avoidance behavior

- begins when the player enters a detection radius;
- recipient selects a nearby safe node away from the player's approach;
- movement is predictable;
- recipient pauses at safe nodes;
- player remains faster;
- target accepts delivery when properly approached and targeted.

### Can placement

- relatively visible;
- search load is reduced so avoidance is the main lesson.

### Skill test

Approach from the correct side and use geometry to limit escape direction.

---

## 17.8 World 3, Level 2 — Controlled Paths

### Purpose

Test prediction on constrained route networks.

### Layout

- path network;
- fenced lanes;
- alleys;
- controlled crossings;
- one or more loops with intersections;
- clear landmarks.

### Avoidance behavior

- recipients choose among authored path nodes;
- they cannot cut through walls or decorative facades;
- player positioning influences the next node choice;
- households move more slowly;
- no destination can cause an endless unreachable cycle.

### Can placement

- distributed so the player must choose between completing supply collection and setting up an interception.

### Skill test

Read the path graph and arrive at the next intersection before the target.

---

## 17.9 World 3, Level 3 — Free for All

### Purpose

Deliver the hardest full expression of the game.

### Layout

- largest campaign map;
- open central area;
- multiple side routes;
- few guaranteed chokepoints;
- landmark-rich local facade composition;
- solid obstacles and pass-through decorations;
- no moving vehicles or vertical traversal.

### Avoidance behavior

- multiple recipients reposition independently;
- route choices may change at nodes;
- local crowd avoidance prevents stacking;
- every target remains catchable;
- safe-node cooldown prevents constant direction flipping;
- the player must combine sprint blocks, upgraded targeting, and minimap knowledge.

### Can placement

- broad tagged anchor pool;
- seeded distribution uses multiple map zones;
- enough sightline variety to reward map knowledge;
- no unfair single-pixel hiding.

### Finale standard

The level should feel demanding because several learned systems overlap, not because the renderer is noisy or targets are mechanically faster than the player.

---

# 18. NPC behavior specification

## 18.1 World 1: stationary

- no path movement;
- idle facing or simple animation allowed;
- request markers stable;
- recipients may rotate slightly toward the player during delivery;
- no crowd simulation.

## 18.2 World 2: fixed loops

- authored node list;
- deterministic direction;
- optional seeded starting offset;
- predictable pauses;
- local separation;
- no random destination selection.

## 18.3 World 3: avoidance

Avoidance is playful route behavior, not a fear simulation.

Required properties:

- activates within a clear detection radius;
- selects from authored reachable nodes;
- does not teleport;
- does not move through walls;
- remains slower than sprinting player;
- includes pause or cooldown periods;
- can be influenced by corrals and path geometry;
- ends immediately on successful delivery;
- cannot create an unwinnable state.

## 18.4 Suggested avoidance state machine

```text
IDLE
→ PLAYER_DETECTED
→ SELECT_SAFE_NODE
→ MOVE_TO_NODE
→ PAUSE_AND_REASSESS
→ IDLE or SELECT_SAFE_NODE
→ DELIVERED
```

## 18.5 Catchability rule

For every avoidance route, the level validator or deterministic test must prove at least one of:

- the player can outrun the target;
- the target pauses;
- the route contains an interception point;
- a corral constrains escape;
- a delivery-lock grace window creates a valid handoff opportunity.

---

# 19. Hall of Servants

## 19.1 Purpose

The Hall of Servants is:

- a tribute to current and former SNC members;
- the playable-character selection space;
- a permanent progression surface;
- a calm contrast to timed play;
- available from the main menu.

## 19.2 Presentation

Primary presentation:

- walkable raycast gallery;
- portrait displays;
- approved local architecture or a stylized community hall;
- no timer;
- no cans;
- no recipient objectives;
- ambient music;
- clear exits.

Accessibility presentation:

- optional list/grid overlay containing the same entries;
- keyboard and touch selection;
- readable biographies;
- portrait alt text.

## 19.3 Character selection

Approaching or selecting a portrait shows:

- name;
- current/former designation;
- role or service years;
- approved contribution sentence;
- passive ability;
- locked/unlocked state;
- unlock requirement.

Selecting an unlocked entry makes that person the active runner for the next run.

## 19.4 Content record

Each entry should be data-driven:

```text
id
displayName
portraitAsset
portraitAlt
statusLabel
serviceYearsOrRole
approvedSummary
abilityId
abilityText
unlockRule
consentStatus
contentApprovalDate
sortOrder
```

## 19.5 Consent and content rules

Before release:

- portrait use must be approved;
- biography text must be approved;
- current/former labeling must be accurate;
- memorial designation must be explicit and approved when applicable;
- abilities must not imply unapproved personal claims;
- image crops must avoid unrelated bystanders;
- no remote portrait fetching is required at runtime.

## 19.6 Ordering

Do not order members by mechanical strength.

Use an approved neutral ordering such as:

- chronological service;
- alphabetical;
- curated thematic rooms.

---

# 20. Art direction and local venue facades

## 20.1 Visual identity

The game is a stylized custom-raycast view of local community spaces.

The most recognizable art is concentrated where it provides the greatest value:

- venue fronts;
- key signs;
- landmark silhouettes;
- event tents;
- approved SNC colors and branding;
- Hall portraits.

## 20.2 Facade rule

For most venues:

- the approved front facade should be recognizable;
- side walls may use generic compatible material;
- rear walls may be fictional;
- inaccessible roofs may be simplified;
- map geography may be fictionalized for play;
- the level does not need to reproduce a real street accurately.

## 20.3 Venue selection

Final venue assignment is content-dependent.

Each level can begin as a greybox and later receive:

- one hero facade;
- supporting generic facades;
- approved signage;
- level-specific prop set.

## 20.4 Image preparation

The facade pipeline should include:

1. rights/approval check;
2. removal or blurring of unrelated faces and license plates;
3. perspective correction;
4. crop;
5. exposure and contrast normalization;
6. optional stylization/posterization;
7. transparent or masked edge cleanup where needed;
8. optimized local asset;
9. facade metadata;
10. in-engine screenshot review.

## 20.5 Collision classes

Every prop or billboard must declare one collision class:

| Class | Behavior | Examples |
|---|---|---|
| `solid` | blocks player and NPCs | walls, vehicles, fences, large barriers |
| `soft` | NPC/player slide or separate gently | recipient personal space, event crowd |
| `none` | visual only; can pass through | bushes, small signs, decorative billboards |

**Locked:** Bushes and similar billboard decoration may be pass-through.

Near-field decorative billboards may fade when they would obscure a can, target, or critical route.

## 20.6 Graphic expansion rule

Before adding a visual feature, ask:

1. Does it improve route recognition?
2. Does it improve target or can readability?
3. Does it preserve frame pacing during simultaneous MOVE + LOOK?
4. Does it preserve depth and alpha correctness?
5. Does it remain readable on the actual portrait phone?

If not, it is cut or deferred.

---

# 21. Raycaster and current render baseline

## 21.1 Runtime choice

SNC remains a custom Canvas/raycaster game.

Do not replace it with:

- PixiJS;
- Phaser;
- a separate SFHS demo runtime;
- a generic 3D engine.

SFHS may later package and verify SNC, but SNC-specific gameplay and rendering remain in the SNC repository.

## 21.2 Current verified production choices

The authoritative repository currently identifies:

```text
Internal render profile: 400 × 250
Angle handling: interpolated
Projection: subpixel
Build ID: inputcadence1
```

Alternate 320 and 480 profiles may exist for diagnostics. The selected baseline remains 400×250 unless new physical-device evidence justifies a change.

## 21.3 Current unresolved performance state

Supplied device result:

- MOVE + LOOK still stutters on the Samsung device.
- 320×200 was rejected as visually worse and not smoother.
- The unavailable high-refresh versus 60 Hz A/B does not authorize a frame cap.
- The active `inputcadence1` diagnostic now needs a physical MOVE + LOOK sample that distinguishes event gaps from rendered-angle jumps before any further source change.

This GDD does not claim the stutter is fixed.

## 21.4 Render guardrails

The existing raycaster should preserve:

- fixed-step simulation;
- interpolation only in rendering;
- per-column wall depth;
- sprite/billboard depth clipping;
- correct alpha handling;
- one resize authority;
- semantic input actions;
- deterministic seeds;
- visible debug/profiling hooks.

No visual pass may fog, tint, or outline transparent billboard bounds as opaque rectangles.

## 21.5 Game-view scaling

The 400×250 internal render target must not be non-uniformly stretched to fill portrait space.

Use aspect-preserving scale and intentional surrounding layout.

---

# 22. Audio, music, and haptics

## 22.1 Audio goals

Audio should communicate:

- pickup;
- valid target;
- delivery;
- household progress;
- household completion;
- sprint activation;
- sprint recharge;
- countdown;
- portal opening;
- level completion;
- final result;
- invalid volunteer target.

## 22.2 Music

Music should be:

- upbeat;
- community-forward;
- energetic without becoming stressful;
- loopable;
- low enough not to mask functional cues.

Worlds may add intensity, but should share a coherent musical identity.

## 22.3 Haptics

Optional haptic patterns:

| Event | Pattern |
|---|---|
| can pickup | short light pulse |
| individual delivery | short medium pulse |
| household completion | two-part pulse |
| sprint | short firm pulse |
| portal opens | gentle pattern |
| full run complete | celebratory pattern |

Haptics must be independently toggleable.

## 22.4 Audio settings

- master mute;
- music volume;
- SFX volume;
- haptics toggle.

Audio must unlock from an intentional user gesture.

---

# 23. Accessibility baseline

## 23.1 First-release accessibility

Include the easier high-value options:

- movable controls;
- control size;
- control opacity;
- left-handed preset;
- look sensitivity;
- joystick dead zone;
- large touch targets;
- high-contrast target markers;
- icons plus text/shape rather than color alone;
- reduced camera bob;
- reduced shake;
- mute and volume controls;
- haptics toggle;
- pause;
- no required fullscreen;
- no rapid flashing;
- readable text scale where practical.

## 23.2 Deferred accessibility work

Potential later work:

- full one-handed control preset;
- complete keyboard remapping;
- narrated nonvisual route support;
- advanced color filters;
- full screen-reader gameplay equivalence;
- captioning for all non-text audio information.

The DOM menu/HUD layer should remain semantic enough that later accessibility work is possible.

---

# 24. Progression and save data

## 24.1 Permanent progression

Save:

- unlocked levels;
- unlocked worlds;
- unlocked Hall servants;
- selected servant;
- personal best overall time;
- level splits;
- medal records;
- settings;
- tutorial completion;
- local leaderboard entries.

## 24.2 Run state

For convenience, the game may save between levels.

A resumed run should restore:

- current next level;
- selected servant;
- chosen run upgrades;
- cumulative time;
- run seed;
- prior splits.

A resumed run may be ineligible for a strict ranked board, but remains playable.

## 24.3 Storage policy

Use versioned save data.

Storage access must fail gracefully.

Because single-file builds may be opened from `file://`, provide export/import save text if practical.

Do not store:

- active pointer IDs;
- render caches;
- canvases;
- audio nodes;
- temporary particles;
- personal portrait source files beyond embedded release assets.

---

# 25. Leaderboard design

## 25.1 Primary ranking

Rank by:

```text
lowest total nine-level time
```

## 25.2 Required result metadata

A leaderboard result should contain:

```text
display name or local alias
total time
nine level splits
run seed
ruleset version
build ID
selected servant ID
upgrade sequence
penalty time
completion timestamp
resumed flag
```

## 25.3 Board types

First-release design:

### Local board

- always available;
- top ten;
- offline;
- stores overall time and servant.

### Featured ranked board

- shared deterministic seed;
- same can, portal, and upgrade sequence for all players;
- partitions by build/ruleset;
- online only when a backend exists.

### Practice records

- per-level local best;
- not the main public ranking.

## 25.4 Privacy

- no real name required;
- player-selected alias;
- no precise location;
- no contact information;
- no Hall portrait data submitted with scores.

## 25.5 Integrity limitation

The first leaderboard may be trust-based.

Do not advertise strong anti-cheat without server-side verification and a documented threat model.

---

# 26. Menu and screen flow

```text
BOOT
→ TITLE
→ MAIN MENU
   → START RUN
      → SERVANT CONFIRMATION
      → LEVEL INTRO
      → COUNTDOWN
      → PLAY
      → LEVEL COMPLETE
      → PORTAL
      → UPGRADE CHOICE
      → NEXT LEVEL
      → FINAL RESULT
   → PRACTICE
   → HALL OF SERVANTS
   → LEADERBOARDS
   → CONTROLS
   → SETTINGS
   → CREDITS
```

Pause flow:

```text
PLAY
→ PAUSE
   → RESUME
   → CONTROLS
   → SETTINGS
   → RESTART LEVEL / RUN
   → QUIT TO MENU
```

Restart actions require confirmation only when they would erase an active run.

---

# 27. Data-driven design contracts

These are design-level contracts. Codex should adapt them to the current source rather than introducing a new framework unnecessarily.

## 27.1 Level definition

```text
id
worldIndex
levelIndex
title
mapId
recipientDefinitions
canSpawnAnchors
portalAnchors
movementRoutes
avoidanceNodes
venueFacadeIds
targetTimeBands
minimapRules
tutorialFlags
seedRules
```

## 27.2 Recipient definition

```text
id
type: individual | household | volunteer
requestCount
startAnchor
behavior: stationary | loop | avoid
routeId
speed
pauseSchedule
detectionRadius
spriteId
minimapPolicy
```

## 27.3 Servant definition

```text
id
displayName
portraitId
abilityId
unlockRule
approvedSummary
contentStatus
```

## 27.4 Upgrade definition

```text
id
title
description
maxRank
eligibility
applyEffect
hudEffect
```

## 27.5 Run identity

```text
runSeed
rulesetVersion
buildId
servantId
upgradeSequence
splitTimes
penaltyTime
totalTime
```

---

# 28. Game-feel requirements

## 28.1 Movement

Movement must feel:

- immediate;
- consistent during simultaneous MOVE + LOOK;
- predictable at different screen refresh rates;
- free from sudden sensitivity changes;
- unaffected by carrying cans.

## 28.2 Feedback priority

Every important event needs at least two forms of feedback when practical:

| Event | Visual | Audio/haptic |
|---|---|---|
| pickup | can disappears, count pulse | pickup sound, light pulse |
| target acquired | outline/reticle | optional subtle tone |
| delivery | request count changes | delivery sound, pulse |
| household complete | stronger marker clear | completion sound/pattern |
| sprint | FOV/speed cue kept restrained | sprint sound/pulse |
| portal | visible world effect + minimap icon | portal sound |
| invalid volunteer | label and target rejection | distinct soft error cue |

## 28.3 Camera effects

Camera bob, FOV change, and shake must be restrained.

They may not:

- cause motion sickness;
- make targeting harder;
- amplify existing frame stutter;
- obscure the reticle.

A reduced-motion option disables or minimizes them.

---

# 29. Technical and product constraints

## 29.1 Locked product constraints

- custom raycaster;
- Android Chrome portrait first;
- main campaign is nine levels;
- one-can individuals and three-can households;
- capacity starts at three;
- targeted delivery;
- automatic pickup;
- sprint blocks;
- minimap upgrades;
- Hall servant selection;
- local venue facades;
- no timeout or loss;
- overall time as primary score;
- portal choice between levels.

## 29.2 Single-file direction

The release should remain compatible with a self-contained `index.html`:

- local scripts and styles inlined by the build;
- local bitmap facades embedded;
- Hall portraits embedded;
- required audio embedded or generated;
- no required CDN;
- no required network for normal play;
- leaderboard network is optional and gracefully absent offline.

## 29.3 Browser authority

New design authority:

1. Android Chrome portrait;
2. Samsung mobile compatibility;
3. desktop Chromium;
4. other browsers as secondary compatibility.

The current repository may contain older device-target wording. Codex should document and reconcile it rather than silently changing test policy.

---

# 30. Acceptance criteria

## 30.1 First playable vertical slice

This is a milestone acceptance gate, not one implementation card. The work is split as follows:

1. **Rules and delivery foundation:** ruleset/save planning, timer/failure semantics, capacity, automatic pickup, individual/household requests, and targeted delivery.
2. **Run transition foundation:** authored seed anchors, portal anchors, deterministic upgrade offers, and one upgrade carried into the next level or test reload.
3. **Integrated mobile proof:** sprint, minimap, existing control customization, simultaneous MOVE + LOOK, exact built-artifact smoke, and physical Android acceptance.

Each behaviorally different implementation remains its own card with its own allowed files, tests, and build identity. Passing the checklist below requires the combined verified results; it does not authorize a broad vertical-slice rewrite.

A vertical slice is complete only when all are operationally verified:

- New Volunteer selectable;
- World 1, Level 1 loads;
- three-second countdown;
- no timeout/failure;
- random seeded cans from authored anchors;
- capacity starts at three;
- automatic pickup;
- one individual request;
- one household request with partial progress;
- targeted Deliver button;
- one sprint block and recharge;
- base minimap;
- final delivery stops timer;
- portal opens at a valid anchor;
- three upgrades appear;
- one upgrade applies to the next level or test reload;
- portrait controls work with simultaneous movement and look;
- settings can move and resize controls;
- no unexpected console errors;
- exact built artifact is tested.

## 30.2 World 1 completion gate

- all three levels;
- stationary-recipient behavior;
- alley route;
- parking-lot hidden-can concept;
- fixed maps and seeded can anchors;
- level splits;
- portal upgrade flow;
- mobile screenshots.

## 30.3 World 2 completion gate

- fixed-loop movement;
- split-street interception;
- industrial route;
- event volunteers;
- invalid-volunteer feedback and time penalty;
- no NPC overlap or unreachable target;
- mobile performance remains acceptable.

## 30.4 World 3 completion gate

- detection-based avoidance;
- easy corral behavior;
- controlled paths;
- free-for-all finale;
- deterministic catchability tests;
- no endless avoidance;
- full-run result.

## 30.5 Hall completion gate

- Hall accessible from main menu;
- New Volunteer present;
- at least one approved servant entry;
- portrait, text, passive, and unlock;
- accessible list view;
- selection affects next run;
- no missing consent state.

## 30.6 Release gate

- all nine levels;
- overall timer and splits;
- local leaderboard;
- featured ranked data contract;
- versioned save;
- no timeout;
- no required external runtime assets;
- exact single-file artifact tested;
- Android Chrome portrait pass;
- simultaneous MOVE + LOOK evaluated on physical device;
- 400×250/interpolated/subpixel baseline preserved unless new evidence approves change;
- screenshots for representative states;
- no through-wall billboard leaks;
- no transparent-bound fog halos;
- no critical controls under safe areas.

---

# 31. Playtest questions

Every milestone playtest should answer:

1. Is movement fun before art polish?
2. Can the player identify a can at game scale?
3. Can the player distinguish individual, household, and volunteer?
4. Is targeted delivery reliable without becoming automatic?
5. Does capacity three create a route decision?
6. Is sprint useful without dominating normal movement?
7. Does the minimap help without solving the level?
8. Are moving loops learnable?
9. Are avoidance targets always catchable?
10. Does any graphical effect reduce clarity?
11. Does simultaneous MOVE + LOOK remain smooth enough on the target phone?
12. Does a replay make the player noticeably faster?

---

# 32. Milestone plan

Each task remains one bounded change with focused verification.

1. **SNC-GDD-001A — repository gap audit:** complete; its lasting conclusions live in public status, roadmap, testing, and performance documents.
2. **SNC-GDD-001B — rules and save contract:** define versioned game data and migration behavior without changing rendering; requires explicit authorization.
3. **SNC-GDD-002 — portrait layout:** deferred until the Samsung input-cadence diagnostic is resolved and the user explicitly authorizes a layout card.
4. **SNC-GDD-003 through 006 — core run rules:** reconcile no-fail timing, collection and delivery, deterministic anchors and upgrades, then sprint blocks.
5. **SNC-GDD-007 through 010 — campaign worlds:** build World 1, fixed-loop World 2, the volunteer event, and avoidance-based World 3 in order.
6. **SNC-GDD-011 and 012 — progression:** implement Hall data and character selection before leaderboard envelopes.
7. **SNC-GDD-013 and 014 — presentation:** add approved venue art, audio, haptics, and first-release accessibility.
8. **SNC-GDD-015 — release:** prove exact single-file output and Android Chrome acceptance.

## 32.1 Task execution rule

Do not combine broad gameplay work into one branch or one model run. Every task states:

- allowed and protected files;
- base commit and expected `BUILD_ID`;
- acceptance tests and screenshot requirements;
- whether generated `index.html` changes;
- whether saved-data meaning changes;
- whether physical Samsung acceptance is required.

## 32.2 Current execution gate

- The repository gap audit is complete.
- The immediate next action is a physical Samsung MOVE + LOOK capture with the query-gated `inputcadence1` overlay.
- The existing portrait layout and control editor remain frozen through that diagnostic.
- `SNC-GDD-001B` is proposed after the device gate but still requires explicit authorization.
- The vertical-slice gate accumulates from bounded cards; it is never one broad rewrite.
- Phase 5 remains a hard user gate and cannot be completed without direct user input.

---

# 33. Deferred features

Not required for the initial complete design:

- moving vehicles;
- enterable building interiors;
- stairs or multi-floor navigation;
- dropped or thrown cans;
- multiple can food types;
- combat;
- health;
- lives;
- failure timer;
- online accounts;
- strong anti-cheat;
- ghost replay;
- route trace;
- voice acting;
- full PWA packaging;
- full one-handed mode;
- advanced crowd simulation;
- random map geometry;
- frame-by-frame portrait animation for Hall entries;
- cross-device cloud save.

These may be reconsidered only after the nine-level core is fun and verified.

---

# 34. Open content and tuning items

These are not blockers for the first greybox vertical slice:

- final local venue list per level;
- facade source images and usage approvals;
- final Hall member list;
- portrait and biography approvals;
- exact servant abilities;
- exact unlock mapping;
- final world/level names;
- final target times and medals;
- final recipient counts;
- exact sprint numerical tuning;
- exact minimap upgrade pacing;
- leaderboard backend;
- final music source;
- portal visual language.

They become release blockers only when their corresponding content phase begins.

---

# 35. Current exact state

## Locked design

- title: **Solidarity Not Charity Can Run**;
- short title: **SNC Can Run**;
- player starts as nameless New Volunteer;
- Hall servants become playable and have small abilities;
- individuals need one can;
- households need three;
- capacity starts at three;
- capacity can be upgraded;
- cans are mechanically identical;
- cans are randomly selected from fixed authored locations;
- delivery is targeted and close;
- delivery can be upgraded;
- no speed penalty for carrying;
- no loss or timeout;
- overall time is primary score;
- countdown before each level;
- portal and upgrade choice between levels;
- fixed maps;
- World 1 stationary;
- World 2 fixed loops;
- World 3 avoidance;
- minimap starts simple and upgrades;
- portrait UI order is game, minimap, controls, stat bar;
- movable customizable controls;
- sprint uses rechargeable blocks;
- nine campaign levels;
- Hall of Servants on main menu;
- local venue facade art;
- pass-through bushes and similar billboards;
- sound, music, and haptics;
- easy high-value accessibility options;
- custom raycaster remains the runtime.

## Verified runtime baseline

- build ID `inputcadence1`;
- default 400×250 render profile;
- interpolated angle;
- subpixel projection;
- root `index.html` remains the self-contained release artifact;
- canonical editable inputs remain `src/` plus `src/build-manifest.json`;
- public metadata records stable artifact identity without embedding a self-referential commit.

## Known unresolved issue

- simultaneous MOVE + LOOK stutter remains on the supplied Samsung result;
- 320×200 was rejected;
- the active query-gated LOOK-cadence capture is the next performance investigation before source changes.

## Not yet implemented or verified by this document

- the new nine-level campaign;
- portal upgrade loop;
- Hall character abilities;
- new leaderboard;
- world-specific recipient AI;
- new portrait layout;
- removal of the current timeout;
- final venue and portrait assets.

This document changes no game source.

---

# 36. Next actionable step

The repository gap audit is complete, and its lasting conclusions are incorporated into `PROJECT_STATUS.md` and the public development documents.

The immediate next action is the physical Samsung MOVE + LOOK capture with `?perfprobe=1` on the unchanged `inputcadence1` artifact.

After that device gate, the next proposed GDD card is `SNC-GDD-001B`: define the ruleset and save-migration contract without changing rendering. It still requires explicit authorization.

No gameplay implementation card or Phase 5 work is authorized by publication of this document.

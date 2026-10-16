/**
 * Every uncertain balance value lives here. Each entry carries an evidence label:
 *
 *   CONFIRMED - stated by a historical source (see docs/EVIDENCE_REGISTER.md)
 *   INFERRED  - strongly suggested by sources, exact value unknown
 *   PROPOSED  - our own playable default; revise when better evidence appears
 *
 * Nothing in this file is a claim about the original game's internal numbers
 * unless it is marked CONFIRMED.
 */
export const tuning = {
  // --- Room / grid ----------------------------------------------------------
  /** PROPOSED: starter room size in tiles. The original expanded with level. */
  startRoomCols: 12,
  startRoomRows: 12,

  // --- Economy --------------------------------------------------------------
  /** PROPOSED */
  startingCash: 5000,
  /** PROPOSED: share of the purchase price refunded on sell. */
  sellRefundRatio: 0.5,
  /** PROPOSED: price a guest pays per drink. */
  drinkPrice: 12,
  /** PROPOSED: max tip at 100 happiness, before the luxury multiplier. */
  baseTipMax: 10,
  /** PROPOSED: each luxury point adds this fraction to tips (GameYum: luxury raises tips - INFERRED direction). */
  luxuryTipFactor: 0.002,

  // --- Bar / drinks ---------------------------------------------------------
  /** CONFIRMED (Gamezebo walkthrough): a restock adds 100 drinks. */
  barRefillAmount: 100,
  /** PROPOSED: cost of one restock (GameYum: restocking costs game cash; amount unknown). */
  barRefillCost: 300,
  /** PROPOSED: maximum stock without extra tanks. */
  barStockCapacity: 200,
  /** PROPOSED */
  startingDrinkStock: 100,
  /** PROPOSED: how long a bartender takes per drink. */
  serveDurationMs: 1800,
  /** PROPOSED: how long a guest stands drinking. */
  drinkDurationMs: 4000,

  // --- Staff ----------------------------------------------------------------
  /** PROPOSED: hiring cost. Original hired Facebook friends; replaced by NPC staff here. */
  bartenderHireCost: 500,

  // --- DJ -------------------------------------------------------------------
  /**
   * CONFIRMED (Gamezebo + myfbapplication): starter DJ system plays a 15-minute set.
   * Better DJ booths extend this (GameYum - INFERRED), see furniture `djSetMs`.
   */
  defaultDjSetMs: 15 * 60_000,
  /** PROPOSED */
  dropBassCooldownMs: 20_000,
  /** PROPOSED */
  dedicateCooldownMs: 10_000,
  /** PROPOSED: happiness added by Dedicate Song. */
  dedicateHappinessBoost: 35,

  // --- Guests ---------------------------------------------------------------
  /** PROPOSED: hard performance cap. */
  maxGuests: 40,
  /** PROPOSED: spawn interval at zero popularity; shrinks as popularity grows. */
  guestSpawnIntervalMs: 3500,
  /** PROPOSED */
  guestMinSpawnIntervalMs: 900,
  /** PROPOSED */
  guestBaseHappiness: 65,
  /** PROPOSED: how long a guest waits in a queue before giving up. */
  guestBasePatienceMs: 45_000,
  /** PROPOSED: tiles per second. */
  guestWalkSpeed: 2.2,
  /** PROPOSED: a guest whose path stalls longer than this picks another goal. */
  guestStuckTimeoutMs: 8000,
  /** PROPOSED: total visit length range. */
  guestVisitMinMs: 60_000,
  guestVisitMaxMs: 150_000,
  /** PROPOSED: happiness drift per second while dancing with music / without music. */
  danceHappinessPerSec: 1.5,
  noMusicHappinessPerSec: -1.2,
  /** PROPOSED: thirst gained per second. Thirst >= 100 sends the guest to the bar. */
  thirstPerSec: 2.2,
  /** PROPOSED: happiness lost when the bar is empty or service fails. */
  noDrinkPenalty: 20,
  /** PROPOSED: guests above this happiness raise popularity when they leave. */
  happyThreshold: 60,
  unhappyThreshold: 30,

  // --- Scores ---------------------------------------------------------------
  /** PROPOSED: popularity change when a happy / unhappy guest leaves. */
  popularityGainPerHappyGuest: 1,
  popularityLossPerUnhappyGuest: 1,
  popularityMax: 1000,

  // --- Progression ----------------------------------------------------------
  /** PROPOSED: XP gained per coin earned. */
  xpPerCoin: 1,

  // --- Persistence ----------------------------------------------------------
  /** PROPOSED */
  saveDebounceMs: 500,

  // --- Simulation -----------------------------------------------------------
  /** PROPOSED: max simulated ms per frame; protects against tab-resume bursts. */
  maxSimStepMs: 250,
} as const;

export type Tuning = typeof tuning;

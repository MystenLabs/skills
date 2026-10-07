/**
 * The statistics a multi-sample eval run needs, and nothing else.
 *
 * One run of a suite is a sample, not a census. Everything this suite has
 * published was n=1, so a reported difference of 0.3 points between two
 * configurations could not be told from the same configuration run twice. The
 * skills A/B returned exactly that: better on 31 evals, worse on 32.
 *
 * Two metrics, because they answer different questions and the gap between them
 * is itself the finding:
 *
 *   pass@k  the optimistic bound. Given k attempts, does at least one succeed?
 *           Says whether the model has the knowledge at all.
 *   pass^k  the pessimistic bound. Do all k attempts succeed? This is what a user
 *           experiences, because they get one attempt and no retries.
 *
 * An agent that succeeds on 75% of trials scores 98.4% at pass@3 and 42.1% at
 * pass^3. Shipping on the first number is how a team ends up with an agent that
 * fails half of real sessions.
 */

/** A single eval, sampled k times. `passed` is how many samples fully succeeded. */
export interface SampledEval {
  id: string;
  passed: number;
  samples: number;
}

/**
 * pass@k: the probability that at least one of k attempts succeeds.
 *
 * With n samples of which c succeeded, the unbiased estimator is
 * 1 - C(n-c, k) / C(n, k): the chance that a draw of k contains no success,
 * subtracted from one. Computed as a product rather than through factorials,
 * which overflow well before n is large enough to matter.
 */
export function passAtK(n: number, c: number, k: number): number {
  if (k > n) throw new Error(`pass@${k} needs at least ${k} samples, got ${n}`);
  if (c === 0) return 0;
  if (n - c < k) return 1;
  let p = 1;
  for (let i = 0; i < k; i++) p *= (n - c - i) / (n - i);
  return 1 - p;
}

/**
 * pass^k: the probability that k consecutive attempts all succeed.
 *
 * Estimated as the observed success rate raised to k. This assumes attempts are
 * independent, which is the same assumption pass@k makes, and is the standard
 * formulation.
 */
export function passPowK(n: number, c: number, k: number): number {
  if (n === 0) return 0;
  return Math.pow(c / n, k);
}

/**
 * Wilson score interval for a binomial proportion.
 *
 * A nominal 90% pass rate from five trials carries an interval wide enough to
 * include 55%, and reporting the point estimate alone hides that. Wilson rather
 * than the normal approximation because the normal one produces bounds outside
 * [0,1] and is badly wrong near 0 and 1, which is where eval rates live.
 */
export function wilson(successes: number, total: number, z = 1.96): { low: number; high: number } {
  if (total === 0) return { low: 0, high: 0 };
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return {
    low: Math.max(0, (centre - spread) / denom),
    high: Math.min(1, (centre + spread) / denom),
  };
}

/** Mean, sample standard deviation and coefficient of variation of a series. */
export function spread(values: number[]): { mean: number; sd: number; cv: number } {
  const n = values.length;
  if (!n) return { mean: 0, sd: 0, cv: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean, sd: 0, cv: 0 };
  // Sample standard deviation: the runs are a sample of possible runs, not the
  // population of them.
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  return { mean, sd, cv: mean === 0 ? 0 : sd / mean };
}

/**
 * The whole picture for a sampled run.
 *
 * `noiseFloor` is the point of the exercise: the spread of the per-sample score
 * across identical attempts. A difference between two configurations smaller than
 * this is not a difference.
 */
export function summarise(evals: SampledEval[], perSampleScores: number[], k: number) {
  const n = evals.length;
  const atK = n ? evals.filter((e) => passAtK(e.samples, e.passed, Math.min(k, e.samples)) > 0).length / n : 0;
  const powK = n ? evals.reduce((a, e) => a + passPowK(e.samples, e.passed, k), 0) / n : 0;
  const alwaysPass = evals.filter((e) => e.passed === e.samples).length;
  const neverPass = evals.filter((e) => e.passed === 0).length;
  const flaky = n - alwaysPass - neverPass;
  return {
    k,
    evals: n,
    passAtK: atK,
    passPowK: powK,
    alwaysPass,
    neverPass,
    // An eval that passes sometimes is where all the variance lives, and it is
    // also the only kind a single run can report wrongly.
    flaky,
    noiseFloor: spread(perSampleScores),
  };
}

/**
 * Run the same work k times and describe the spread.
 *
 * Every runner here reported a single attempt as a result. The skills suite showed
 * what that costs: a 0.3 point difference between two configurations, with 31 evals
 * better and 32 worse, which is what one configuration run twice also produces.
 *
 * This exists so each runner gets sampling without writing its own loop, because
 * three bespoke loops is three places for the arithmetic to drift. The runner says
 * how to score one attempt; this says how many attempts and what the spread was.
 *
 * Attempts run in sequence. They are independent, but these runners drive sessions
 * that already hold provider connections, and running k of them at once is how a
 * sampled run turns into a rate-limit error rather than a measurement.
 */
export async function sampleRuns<T>(
  k: number,
  attempt: (index: number) => Promise<T>,
  score: (result: T) => number | null,
): Promise<{ first: T; attempts: T[]; samples: SampleSummary | null }> {
  const n = Math.max(1, k);
  const attempts: T[] = [];
  for (let i = 0; i < n; i++) attempts.push(await attempt(i));
  if (n === 1) return { first: attempts[0], attempts, samples: null };

  const scores = attempts
    .map(score)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const sp = spread(scores);
  return {
    first: attempts[0],
    attempts,
    samples: {
      k: n,
      scores,
      mean: Math.round(sp.mean * 1000) / 1000,
      sd: Math.round(sp.sd * 1000) / 1000,
      cv: Math.round(sp.cv * 1000) / 1000,
      // Scored attempts, which is not always k: an attempt that errored has no
      // score, and averaging it in as zero would read as the model failing.
      scored: scores.length,
    },
  };
}

export interface SampleSummary {
  k: number;
  scores: number[];
  mean: number;
  sd: number;
  cv: number;
  scored: number;
}

/**
 * How many attempts a runner should make. One place, so every pipeline reads the
 * same switch and a sampled run is sampled everywhere.
 */
export function sampleCount(argv: string[] = process.argv): number {
  const i = argv.indexOf("--samples");
  const flag = i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
  return Math.max(1, parseInt(flag ?? process.env.EVAL_SAMPLES ?? "1", 10) || 1);
}

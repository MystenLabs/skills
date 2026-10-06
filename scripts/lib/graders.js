/**
 * Mechanical graders for the expectations that do not need reading.
 *
 * Most expectations here are prose -- "warns that each transfer grants full
 * privileges" -- and only a reader can judge them. A large minority are not:
 * "Uses assert_eq! for equality comparisons", "Does NOT use `public entry`",
 * "Calls tx.try_build()". Those name a literal, and a literal can be checked.
 *
 * Until now they were checked by extracting key terms out of the English and
 * matching those, which is a regex reverse-engineered from a sentence. It read
 * "GA" out of "Identifies GraphQL RPC as GA" and matched it inside "navigate", so
 * an answer about clicking through a dashboard passed an expectation about API
 * maturity. Writing the pattern down instead removes the guesswork, and removes
 * the expectation from the judge's bill at the same time.
 *
 * Graders live in a `graders` map on the eval, keyed by the expectation's exact
 * text. `expectations` stays an array of plain strings, because eight other things
 * read that field and object-shaping it would break every one of them:
 *
 *   "expectations": [
 *     "Explains why gRPC is the default",
 *     "Uses assert_eq! for equality comparisons"
 *   ],
 *   "graders": {
 *     "Uses assert_eq! for equality comparisons": {
 *       "type": "regex", "pattern": "assert_eq!\\s*\\("
 *     }
 *   }
 *
 * Keying on the text rather than an index means inserting an expectation cannot
 * silently shift graders onto their neighbours, and rewording one detaches its
 * grader so the judge takes it back -- the safe direction to fail.
 *
 * `absent` is the type the borrowed design did not need and we do: a good share of
 * these expectations forbid something rather than require it, and that is the
 * class the term matcher got wrong most often.
 */

/** @typedef {{type:string, pattern?:string, patterns?:string[], expect?:string, options?:object[], value?:number, tolerance?:number, flags?:string}} Grader */

/** An expectation is a string; tolerate an object in case one is ever written. */
export function expectationText(e) {
  return typeof e === "string" ? e : (e?.text ?? "");
}

/** The grader for one expectation, looked up by its text. */
export function expectationGrader(ev, e) {
  const text = expectationText(e);
  const inline = typeof e === "object" && e ? e.grader : null;
  return inline ?? ev?.graders?.[text] ?? null;
}

/** Every expectation in an eval, as text. */
export function expectationTexts(ev) {
  const list = ev?.subjective_expectations ?? ev?.expectations ?? [];
  return list.map(expectationText);
}

const norm = (s) => String(s ?? "").trim();

/**
 * Apply one grader to a response.
 *
 * Returns null when the grader cannot be applied -- an unknown type, or a pattern
 * that does not compile. Null means "no verdict", and the caller falls back to the
 * judge rather than recording a failure: a grader we cannot run has not found the
 * answer wanting, exactly as a judge that could not answer has not.
 *
 * @param {Grader} grader
 * @param {string} response
 * @returns {{pass:boolean, detail:string}|null}
 */
export function applyGrader(grader, response) {
  if (!grader || typeof grader.type !== "string") return null;
  const text = String(response ?? "");

  const re = (pattern, flags = grader.flags ?? "i") => {
    try {
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  };

  switch (grader.type) {
    case "exact": {
      const want = norm(grader.expect);
      if (!want) return null;
      const pass = norm(text) === want || text.includes(want);
      return { pass, detail: pass ? `found ${JSON.stringify(want)}` : `expected ${JSON.stringify(want)}` };
    }

    case "regex": {
      const r = re(grader.pattern);
      if (!r) return null;
      const pass = r.test(text);
      return { pass, detail: `${pass ? "matched" : "no match for"} /${grader.pattern}/` };
    }

    // Every pattern must appear. For an expectation that names several things at
    // once -- "Calls tx.set_sender, tx.set_gas_budget, tx.set_gas_price".
    case "regex_all": {
      const patterns = grader.patterns ?? [];
      if (!patterns.length) return null;
      const compiled = patterns.map((p) => ({ p, r: re(p) }));
      if (compiled.some((c) => !c.r)) return null;
      const missing = compiled.filter((c) => !c.r.test(text)).map((c) => c.p);
      return {
        pass: missing.length === 0,
        detail: missing.length ? `missing /${missing.join("/, /")}/` : "all patterns matched",
      };
    }

    // The pattern must NOT appear. The answer is wrong for containing it.
    case "absent": {
      const r = re(grader.pattern);
      if (!r) return null;
      const hit = text.match(r);
      return {
        pass: !hit,
        detail: hit ? `found forbidden ${JSON.stringify(hit[0])}` : `/${grader.pattern}/ absent`,
      };
    }

    // Every alternative must hold. The shape most of these expectations really
    // have: "Uses ctx.sender() not tx_context::sender(ctx)" is one requirement and
    // one prohibition, and checking only the first passes an answer that does both.
    case "all_of": {
      const options = grader.options ?? [];
      if (!options.length) return null;
      const verdicts = options.map((o) => applyGrader(o, text));
      if (verdicts.some((v) => v === null)) return null;
      const failed = verdicts.filter((v) => !v.pass);
      return {
        pass: failed.length === 0,
        detail: failed.length ? failed.map((v) => v.detail).join("; ") : "all conditions held",
      };
    }

    case "any_of": {
      const options = grader.options ?? [];
      if (!options.length) return null;
      const verdicts = options.map((o) => applyGrader(o, text));
      if (verdicts.every((v) => v === null)) return null;
      const pass = verdicts.some((v) => v?.pass);
      return { pass, detail: pass ? "one alternative matched" : "no alternative matched" };
    }

    // A documented number, found anywhere in the answer, with digit grouping
    // tolerated: 1024, 1,024 and 1_024 are the same limit.
    case "numeric": {
      if (typeof grader.value !== "number") return null;
      const tolerance = grader.tolerance ?? 0;
      const found = [...text.matchAll(/-?\d[\d,_]*(?:\.\d+)?/g)]
        .map((m) => Number(m[0].replace(/[,_]/g, "")))
        .filter((n) => Number.isFinite(n));
      const pass = found.some((n) => Math.abs(n - grader.value) <= tolerance);
      return { pass, detail: pass ? `found ${grader.value}` : `expected ${grader.value}` };
    }

    default:
      return null;
  }
}

/**
 * Grade a whole eval's expectations mechanically where they carry a grader.
 *
 * Returns one entry per expectation. `graded` is false where no grader applied,
 * which is the caller's signal to send that expectation to the judge.
 */
export function gradeMechanically(ev, response) {
  const list = ev?.subjective_expectations ?? ev?.expectations ?? [];
  return list.map((e) => {
    const text = expectationText(e);
    const grader = expectationGrader(ev, e);
    const verdict = grader ? applyGrader(grader, response) : null;
    if (verdict === null) return { expectation: text, graded: false };
    return {
      expectation: text,
      graded: true,
      pass: verdict.pass,
      reason: `${grader.type}: ${verdict.detail}`,
    };
  });
}

/**
 * Put the mechanical verdicts and the judge's back into one list, in the eval's
 * own order.
 *
 * The judge is only asked about the expectations no grader settled, so its reply is
 * a shorter list and the two have to be re-interleaved. Getting that off by one
 * would attach every reason to the wrong expectation and nothing would look wrong,
 * which is why it lives here with a test rather than inline in the runner.
 *
 * The expectation text is taken from the eval, never from the judge's reply: the
 * judge echoes it and is free to reword it.
 */
export function mergeGrades(mechanical, judged) {
  let j = 0;
  return mechanical.map((m) => {
    if (m.graded) {
      return { expectation: m.expectation, pass: m.pass, reason: m.reason, by: "grader" };
    }
    const g = judged[j++];
    return {
      expectation: m.expectation,
      pass: g?.pass === true,
      reason: g?.reason ?? "no grade returned for this expectation",
      by: "judge",
    };
  });
}

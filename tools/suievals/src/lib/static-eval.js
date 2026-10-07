/**
 * Static evaluation module for skills evals.
 *
 * Provides deterministic, reproducible expectation checking by extracting
 * key terms from expectation strings and matching them against model responses.
 *
 * Shared between run-evals.js (skills evals) and run-onboarding-evals.js.
 */

/**
 * The significant words of an expectation, used when nothing code-like is in it.
 *
 * Lifted out of extractKeyTerms because the negative path needs it too: a
 * negative whose every candidate term is filtered away as too generic ends up
 * with no terms, and no terms means an automatic pass. Falling back to the prose
 * keeps the check grading something instead of handing out a free pass.
 *
 * The grading verbs are stopwords here as well -- an expectation with no
 * identifier in it would otherwise be graded on whether the answer echoed the
 * word "Flags". "another"/"requirement" are deliberately absent: leaving an
 * expectation with no terms at all turns a standing fail into a standing pass.
 */
export function proseTerms(expectation) {
  const stopWords = new Set([
      "the", "that", "this", "with", "from", "into", "does", "should",
      "must", "never", "also", "uses", "shows", "about", "when", "which",
      "like", "than", "then", "they", "them", "their", "there", "been",
      "being", "have", "will", "would", "could", "each", "make", "made",
      "more", "only", "some", "such", "very", "just", "over", "well",
      "back", "much", "many", "both", "same", "need", "used", "using",
      "explains", "mentions", "recommends", "states", "describes",
      "shows", "includes", "provides", "suggests", "warns", "notes",
      "flags", "adds", "getter", "calls", "imports", "passes", "wraps",
      "merges", "identifies", "correctly", "specifies", "points",
      "destructures", "flattens", "checks", "handles", "returns",
      "gives", "defines", "declares", "avoids", "prefers", "emits",
      "stores", "names", "groups", "lists", "removes", "renames",
      "replaces", "separates", "orders", "distinguishes", "submits",
      "joins", "preserves", "rejects", "interprets", "measures",
      "requires", "flagged",
    ]);
  return expectation
    .replace(/['"]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w.toLowerCase()))
    .slice(0, 3);
}

/**
 * Extract key terms from an expectation string for matching.
 * Returns an array of terms that should be checked against the response.
 *
 * Handles patterns like:
 *   "Imports SuiGrpcClient from '@mysten/sui/grpc'" -> ["SuiGrpcClient", "@mysten/sui/grpc"]
 *   "Mentions the object model" -> ["object model"]
 *   "Uses tx.splitCoins" -> ["splitCoins"]
 *   "Mentions testnet or devnet" -> ["testnet", "devnet"]
 */
export function extractKeyTerms(expectation) {
  // An aside naming the wrong form is not evidence the answer is right. Both
  // "(NOT result.effects?.status?.status)" and a trailing ", NOT JSON-RPC /
  // SuiClient" were handing out the forbidden identifiers as passing terms, so
  // an answer using exactly the call the expectation warns against scored a
  // pass. Only the shouted form is stripped; a lowercase "not" mid-sentence is
  // ordinary prose and removing it would change the subject.
  expectation = expectation
    .replace(/\((?:NOT|not)\s[^)]*\)/g, " ")
    .replace(/[,;]\s*NOT\s+[^;]*$/, " ");

  const terms = [];

  // Extract quoted strings (single or double quotes)
  const quotedPattern = /['"]([^'"]+)['"]/g;
  let match;
  while ((match = quotedPattern.exec(expectation)) !== null) {
    terms.push(match[1]);
  }

  // Extract code-like identifiers (camelCase, PascalCase, dot-notation, @-scoped packages)
  //
  // `[A-Z][a-zA-Z0-9]+` reads any capitalised word as code, and every
  // expectation opens with a grading verb: "Checks that challenge network and
  // recipient match the request." extracted exactly one term, "Checks", and
  // graded on whether the response contained that word. Requiring an internal
  // capital fixes the verb but throws away ordinary proper nouns -- Pinata,
  // Postgres, Walrus -- and a negative check that no longer looks for Pinata
  // stops catching the thing it exists to catch. So the pattern stays broad and
  // the verb is excluded by position instead: the first word of an expectation
  // is never a term unless it carries a code signal of its own, which keeps
  // SuiGrpcClient and Ed25519 when they lead.
  const codePattern = /(?:@[\w-]+\/[\w/-]+|\b\w+::\w+(?:::\w+)*|[A-Z][a-zA-Z0-9]+(?:\.[a-zA-Z]+)*|[a-z]+[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z]+)*)/g;
  while ((match = codePattern.exec(expectation)) !== null) {
    // Skip common English words that happen to match
    const skip = new Set(["NOT", "Does", "Should", "Must", "Never", "Also", "Uses", "Shows",
      // Read as acronyms by the all-caps branch, but they are just English.
      "OR", "AND", "IF", "ALL", "ANY", "THE"]);
    const leadingVerb =
      match.index === 0 && !/[@./:!_$]|[a-z][A-Z]|\d/.test(match[0]);
    if (!skip.has(match[0]) && !leadingVerb) {
      terms.push(match[0]);
    }
  }

  // Forms nothing matched at all: snake_case identifiers (sui_sdk_types,
  // try_build, assert_eq!, role_admin), lowercase dotted calls (ctx.sender,
  // data.pages, tx.build), the dapp-kit $kind discriminant, and documented
  // numeric limits. A correct Rust or Move answer could not score on any
  // expectation whose only subject was one of these.
  //
  // These run as their own scans rather than extra branches of the alternation
  // above, because one scan lets the longest branch consume the rest:
  // client.core.listBalances swallowed listBalances, and tx_context swallowed
  // tx_context::sender.
  const extraPatterns = [
    /[a-z][a-z0-9]*(?:_[a-z0-9]+)+!?/g,
    /[a-z][a-z0-9_]+\.[a-z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*/g,
    /\$[a-zA-Z][a-zA-Z0-9]*/g,
    // Three digits or more, so a limit like 1024 or 250 is required while
    // "at least 6 distinct issues" does not reduce to matching the digit 6.
    /\b\d{3,}\b/g,
  ];
  for (const pattern of extraPatterns) {
    while ((match = pattern.exec(expectation)) !== null) {
      terms.push(match[0]);
    }
  }

  // Extract multi-word CLI/tool terms (e.g., "cargo install", "sui move new", "sui client publish")
  const cliPatterns = /\b(cargo install|sui move new|sui client publish|sui client upgrade|curl -sSfL|suiup install|suiup update|suiup switch|npm install|git clone)\b/gi;
  while ((match = cliPatterns.exec(expectation)) !== null) {
    terms.push(match[1]);
  }

  // Extract multi-word technical phrases
  const phrasePatterns = [
    /\b(object[\s-]?(?:centric\s+)?model)\b/i,
    /\b(account[\s-]?(?:centric\s+|based\s+)?model)\b/i,
    /\b(resource safety)\b/i,
    /\b(linear types?)\b/i,
    /\b(bytecode verification)\b/i,
    /\b(dynamic dispatch)\b/i,
    /\b(capability[\s-]?based(?:\s+access\s+control)?)\b/i,
    /\b(transfer polic(?:y|ies))\b/i,
    /\b(one[\s-]?time[\s-]?witness)\b/i,
    /\b(erasure cod(?:ed|ing))\b/i,
    /\b(checkpoint ingestion)\b/i,
    /\b(layout[\s-]?compatible)\b/i,
    /\b(three[\s-]?provider[\s-]?stack)\b/i,
    /\b(smart contract)\b/i,
    /\b(zero[\s-]?knowledge[\s-]?proof)\b/i,
    /\b(social login)\b/i,
    /\b(access control)\b/i,
    /\b(gRPC streaming)\b/i,
    /\b(edition\s*=?\s*"?2024"?)\b/i,
    /\b(semicolon syntax)\b/i,
    /\b(proxy contract)\b/i,
    /\b(owned objects?)\b/i,
    /\b(shared objects?)\b/i,
    /\b(compile[\s-]?time)\b/i,
    /\b(unique ID)\b/i,
    /\b(Move\s+(?:language|module|package))\b/i,
    /\b(wallet extension)\b/i,
    /\b(building from source)\b/i,
    /\b(minting authority)\b/i,
    /\b(init function)\b/i,
    /\b(subscription service)\b/i,
    /\b(approval mechanism)\b/i,
    /\b(typed pure helpers?)\b/i,
    /\b(real[\s-]?time)\b/i,
  ];

  for (const pattern of phrasePatterns) {
    const phraseMatch = pattern.exec(expectation);
    if (phraseMatch) {
      terms.push(phraseMatch[1]);
    }
  }

  // Extract "X or Y" alternatives -- each side becomes a separate term
  // Only extract words that are technical enough (5+ chars or contain special chars)
  const orPattern = /\b([\w][\w.@/-]*)\s+or\s+([\w][\w.@/-]*)\b/gi;
  while ((match = orPattern.exec(expectation)) !== null) {
    const stopWords = new Set(["the", "a", "an", "not", "any", "some", "other"]);
    const minLen = 5;
    if (!stopWords.has(match[1].toLowerCase()) && (match[1].length >= minLen || /[@./:]/.test(match[1]))) {
      terms.push(match[1]);
    }
    if (!stopWords.has(match[2].toLowerCase()) && (match[2].length >= minLen || /[@./:]/.test(match[2]))) {
      terms.push(match[2]);
    }
  }

  // Always extract significant standalone technical words (tool names, protocols, etc.)
  const techWords = /\b(suiup|testnet|devnet|mainnet|gRPC|GraphQL|Move|Postgres|Walrus|Kiosk|zkLogin|Seal|PTBs?|JSON[\s-]?RPC|UpgradeCap|TreasuryCap|AdminCap|UID|Coin|sui-indexer-alt|ObjectBag|EVM|Solidity|Ownable|Mysticeti|DAppKitProvider|ConnectButton)\b/gi;
  while ((match = techWords.exec(expectation)) !== null) {
    terms.push(match[0]);
  }

  // If still no terms, fall back to the sentence's own significant words.
  if (terms.length === 0) {
    terms.push(...proseTerms(expectation));
  }

  return [...new Set(terms)];
}

/**
 * Filter terms suitable for negative checks.
 * Removes generic single words that would match virtually any Sui response
 * (e.g., "Sui", "Move", "install", "build"). Keeps multi-word phrases,
 * code identifiers, scoped packages, and known technical acronyms.
 */
export function filterNegativeTerms(terms) {
  const tooGeneric = new Set([
    "sui", "move", "install", "build", "building", "source",
    "contract", "pattern", "approach", "method", "primary",
    "recommend", "suggest", "ethereum", "solana",
    "expected_failure", "similar", "equivalent", "sdk",
  ]);

  // Technical terms that should always be kept even if short
  const alwaysKeep = new Set([
    "evm", "ptb", "ptbs", "uid", "grpc", "cpi", "cpis",
    "ipfs", "s3", "erc-20", "erc20", "erc-721", "erc721",
    "pinata", "pysui",
  ]);

  const specific = terms.filter(
    (t) =>
      !terms.some(
        (u) => u !== t && u.startsWith(t) && /^[:._]/.test(u.slice(t.length)),
      ),
  );

  return specific.filter((t) => {
    // The explicit denylist is checked first. It used to sit below the
    // all-caps rule, so "SDK" was kept as a forbidden term and then matched
    // every sentence about an SDK -- and matched inside sui_sdk_types, failing
    // the answer that uses the current crate.
    if (tooGeneric.has(t.toLowerCase())) return false;
    // Always keep multi-word phrases
    if (t.includes(" ")) return true;
    // Always keep scoped packages and dot-notation
    if (/[@./:]/.test(t)) return true;
    // Always keep camelCase/PascalCase identifiers
    if (/[a-z][A-Z]|[A-Z][a-z].*[A-Z]/.test(t)) return true;
    // Always keep known technical acronyms and identifiers
    if (alwaysKeep.has(t.toLowerCase())) return true;
    // Always keep ALL-CAPS terms (acronyms like IPFS, EVM, UID)
    if (/^[A-Z][A-Z0-9-]+$/.test(t)) return true;
    // Always keep hyphenated identifiers (ERC-20, sui-indexer-alt)
    if (t.includes("-") && t.length >= 4) return true;
    // Filter out generic single words
    if (tooGeneric.has(t.toLowerCase())) return false;
    // Keep longer unique terms (7+ chars)
    if (t.length >= 7) return true;
    // Filter out short generic words
    return false;
  });
}

/**
 * Check a single expectation against a response.
 *
 * For positive expectations: at least one key term must appear (case-insensitive).
 * For negative expectations ("Does NOT...", "Should NOT..."): NONE of the key
 * terms after the negation should appear.
 *
 * Returns { passed, isNegative, matchedTerms?, foundTerms?, allTerms }
 */
/**
 * Cues that a term is being warned about rather than recommended.
 *
 * A negative expectation asks the model NOT to endorse something, but a good
 * answer usually has to name it to warn against it. Plain term presence marks
 * "don't build new CI around /v2/gas; it's the legacy path" as a violation of
 * "Does not treat /v2/gas as a public v3 fallback", which is backwards -- the
 * answer is doing exactly what was asked.
 */
const PROHIBITION_CUES = /\b(?:do not|don't|don’t|never|avoids?|not|no|instead of|rather than|deprecated|legacy|removed|retired|rejects?|cannot|can't|can’t|won't|won’t|should not|shouldn't|shouldn’t|must not|mustn't|stop|drop|replaced?|supersede[sd]?|discouraged?|unsupported|isn't|aren't|wrong|incorrect|pitfall|mistake|without)\b/i;

/**
 * Whether every mention of `term` in `response` sits in a warning.
 * A single unqualified mention is enough to count as an endorsement.
 */
export function onlyMentionedAsWarning(response, term) {
  const lower = response.toLowerCase();
  const needle = term.toLowerCase();
  let from = 0;
  let seen = false;
  while (true) {
    const at = lower.indexOf(needle, from);
    if (at === -1) break;
    seen = true;
    // Only the sentence the mention sits in. A fixed character window reaches
    // back into the previous sentence, so "do not use /v2/gas. Otherwise POST
    // /v2/gas directly." read as two warnings when the second is an
    // endorsement standing right next to the first.
    let start = 0;
    for (const b of [". ", ".\n", "! ", "? ", "\n\n", "\n- ", "\n* "]) {
      const i = lower.lastIndexOf(b, at);
      if (i !== -1 && i + b.length > start) start = i + b.length;
    }
    let end = lower.length;
    for (const b of [". ", ".\n", "! ", "? ", "\n"]) {
      const i = lower.indexOf(b, at + needle.length);
      if (i !== -1 && i < end) end = i;
    }
    if (!PROHIBITION_CUES.test(lower.slice(start, end))) return false;
    from = at + needle.length;
  }
  return seen;
}

/**
 * The candidate terms a negative expectation forbids.
 *
 * Lifted out of checkExpectation so it can be tested directly and pinned across
 * the copies of this module -- buried inside the check, nothing could reach it
 * and the copies drifted. Two clauses come off first, or the check forbids the
 * very call it is recommending:
 *
 *   "(uses tx.serialize() or passes the Transaction instance directly)"
 *   "-- uses tx.transferObjects"
 *
 * Both name the approved alternative, and extracting from them made a correct
 * answer fail.
 */
export function negativeCandidates(expectation) {
  const stripped = expectation
    .replace(/^Does NOT\s+/i, "")
    .replace(/^NOT\s+/i, "")
    .replace(/^Should NOT\s+/i, "")
    .replace(/^Must NOT\s+/i, "")
    .replace(/^Never\s+/i, "")
    .replace(/\((?:uses?|prefer|instead)\b(?:[^()]|\([^()]*\))*\)?/gi, " ")
    .replace(/\s(?:--|—|-)\s*(?:uses?|prefer|instead)\b.*$/i, " ");

  return extractKeyTerms(stripped);
}

/**
 * Does `term` appear in `responseLower` as the term, rather than inside a word?
 *
 * A plain substring test is right for an identifier -- `client.core.listBalances`
 * cannot show up by accident -- and wrong for a short one. "GA", extracted from
 * "Identifies GraphQL RPC as GA (not beta)", is inside "navigate", so the
 * sentence "Navigate to the dashboard and click through" passed an expectation
 * about GraphQL being generally available. "NAV" is inside "unavailable" and
 * "OR" is inside "information".
 *
 * So a short term with no code signal has to match on word boundaries. Longer
 * terms and anything carrying punctuation keep the substring behaviour, which is
 * what makes dotted and scoped names work.
 */
export function termAppears(responseLower, term) {
  const t = term.toLowerCase();
  const hasCodeSignal = /[@./:!_$\-\s]/.test(t);
  if (t.length > 4 || hasCodeSignal) return responseLower.includes(t);
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(responseLower);
}

export function checkExpectation(response, expectation) {
  const isNegative = /^Does NOT|^NOT |^Should NOT|^Must NOT|^Never /i.test(expectation);
  const responseLower = response.toLowerCase();

  if (isNegative) {
    const allTerms = negativeCandidates(expectation);
    let terms = filterNegativeTerms(allTerms);
    if (terms.length === 0 && allTerms.length > 0) {
      terms = filterNegativeTerms(proseTerms(expectation));
    }
    if (terms.length === 0) {
      return { passed: true, isNegative, foundTerms: [], allTerms };
    }

    // For negative: pass if no term is endorsed. A term the response only
    // ever names in order to warn against it is not a violation.
    const present = terms.filter((t) => termAppears(responseLower, t));
    const endorsed = present.filter((t) => !onlyMentionedAsWarning(response, t));
    return {
      passed: endorsed.length === 0,
      isNegative,
      foundTerms: endorsed,
      warnedTerms: present.filter((t) => !endorsed.includes(t)),
      allTerms: terms,
    };
  } else {
    const allTerms = extractKeyTerms(expectation);
    if (allTerms.length === 0) {
      return { passed: true, isNegative, matchedTerms: [], allTerms };
    }

    // For positive: pass if ANY key term appears
    const matched = allTerms.filter((t) => termAppears(responseLower, t));
    return {
      passed: matched.length > 0,
      isNegative,
      matchedTerms: matched,
      allTerms,
    };
  }
}

/**
 * Evaluate a response against all expectations.
 * Returns detailed results with pass rate and score.
 */
export function evaluateResponse(response, expectations) {
  const results = [];
  for (const expectation of expectations) {
    const check = checkExpectation(response, expectation);
    results.push({
      expectation,
      passed: check.passed,
      isNegative: check.isNegative,
      ...(check.isNegative
        ? { foundTerms: check.foundTerms }
        : { matchedTerms: check.matchedTerms }),
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const total = results.length;
  const passRate = total > 0 ? passedCount / total : 0;
  const score = passRateToScore(passRate);

  return { results, passRate, passed: passedCount, total, score };
}

/**
 * Convert a pass rate (0.0 - 1.0) to a 1-5 band.
 *
 * The bands were uniform 20-point steps, which made sense while models sat in
 * the 20-40% range. Once tools were enabled every model moved into the top
 * band and stayed there: claude-fable-5 at 97.7%, claude-sonnet-5 at 95.6% and
 * claude-haiku-4-5 at 87.1% all scored 5/5, so the badge the board leads with
 * could not tell apart a model that misses one answer in fifty from one that
 * misses one in eight.
 *
 * So the steps are no longer uniform. They are narrow where the models
 * actually are and wide below it, because the distinction between 30% and 45%
 * does not matter -- both are unusable -- while the distinction between 90%
 * and 97% is the whole question for someone deciding what to build on.
 *
 *   <60%     -> 1  nothing works reliably
 *   60-79.9% -> 2  wrong often enough to mislead
 *   80-89.9% -> 3  usable, but review the output
 *   90-96.9% -> 4  good
 *   >=97%    -> 5  excellent
 *
 * A fixed band always saturates eventually. The continuous rate the band is
 * derived from travels beside it in `llmPassRate` and `interval`, and that is
 * what to read for a close comparison.
 */
export function passRateToScore(passRate) {
  if (passRate < 0.6) return 1;
  if (passRate < 0.8) return 2;
  if (passRate < 0.9) return 3;
  if (passRate < 0.97) return 4;
  return 5;
}

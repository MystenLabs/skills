/**
 * The four pillars of Sui knowledge, and which skill's evals belong to each.
 *
 * ETHEVALS authored 25 evals per pillar, so its cards read "x/25" four times.
 * This corpus is the other way round: 158 evals already exist, written per
 * skill, and the pillars are mapped onto them. That makes the pillars uneven,
 * and the site shows the real count rather than pretending otherwise. Evening
 * them out means curating, not relabelling, which is a decision for a human.
 *
 * A skill with no entry here is reported as unmapped by build.js rather than
 * silently dropped, so adding a skill cannot quietly shrink the suite.
 */

export const PILLARS = [
  {
    id: "objects",
    name: "Objects",
    desc:
      "The model everything else rests on. Ownership, abilities, dynamic fields, " +
      "versioning, and why an account-shaped mental model produces wrong code.",
    skills: ["object-model", "sui-overview", "sui-for-ethereum", "sui-networks-gas"],
  },
  {
    id: "transactions",
    name: "Transactions",
    desc:
      "Composing and reading the chain. Programmable transaction blocks, gas and " +
      "sponsorship, the data-access APIs, and the CLI that drives them.",
    skills: [
      "ptbs",
      "accessing-data",
      "sui-client",
      "sui-install",
      "sui-build-test",
      "sui-bridge",
    ],
  },
  {
    id: "building",
    name: "Building",
    desc:
      "Shipping something real. Move packages and their upgrades, the TypeScript " +
      "SDKs, wallet-connected frontends, and integrating a live protocol.",
    skills: [
      "sui-move",
      "sui-move-project",
      "sui-publish",
      "modern-move-syntax",
      "composable-move-functions",
      "naming-conventions",
      "move-unit-testing",
      "frontend-apps",
      "sui-sdks",
      "sui-ts-sdk-backend",
      "template",
      "deepbook-overview",
      "deepbook-sdk",
      "deepbook-move",
      "deepbook-margin",
      "deepbook-predict",
    ],
  },
  {
    id: "security",
    name: "Security",
    desc:
      "What goes wrong. Capability handling and revocation, randomness that " +
      "survives composition, shared-object authorization, and custody of assets.",
    skills: ["move-security", "onchain-randomness", "zklogin", "kiosk"],
  },
];

/** skill -> pillar id, built from the table above. */
export const PILLAR_OF = Object.fromEntries(
  PILLARS.flatMap((p) => p.skills.map((s) => [s, p.id])),
);

export const PILLAR_IDS = PILLARS.map((p) => p.id);

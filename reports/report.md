# Eval Report

## Executive Summary

| Suite | Evals | Pass | Fail | Err | Flaky | Checks | Rate |
|-------|------:|-----:|-----:|----:|------:|-------:|-----:|
| Skill evals (gpt4o) | 9 | 0 | 0 | 9 | – | 0/0 | – |
| Skill evals (opus) | 9 | 2 | 7 | 0 | – | 14/27 | 52% |
| Skill evals (sonnet) | 9 | 0 | 9 | 0 | – | 10/27 | 37% |
| AgentPrompt baseline (gpt4o) | 19 | 0 | 0 | 19 | – | 0/0 | – |
| AgentPrompt baseline (opus) | 19 | 15 | 4 | 0 | – | 119/123 | 97% |
| AgentPrompt baseline (sonnet) | 19 | 15 | 4 | 0 | – | 116/123 | 94% |
| AgentPrompt +skills (gpt4o) | 19 | 1 | 4 | 14 | – | 28/34 | 82% |
| AgentPrompt +skills (opus) | 19 | 15 | 4 | 0 | – | 117/123 | 95% |
| AgentPrompt +skills (sonnet) | 19 | 13 | 6 | 0 | – | 117/123 | 95% |

---

## Knowledge Evals

| Skill | Eval | gpt4o | opus | sonnet |
|-------|------|:------:|:------:|:------:|
| walrus-cli | walrus-cli-common-mistakes | ⚠️ | ✅ 3/3 | ❌ 2/3 |
| walrus-cli | walrus-cli-configuration | ⚠️ | ❌ 0/3 | ❌ 0/3 |
| walrus-cli | walrus-cli-json-mode | ⚠️ | ❌ 1/3 | ❌ 1/3 |
| walrus-cli | walrus-cli-read-blob | ⚠️ | ❌ 2/3 | ❌ 0/3 |
| walrus-cli | walrus-cli-store-blob | ⚠️ | ❌ 1/3 | ❌ 1/3 |
| walrus-overview | walrus-overview-blob-id-vs-object-id | ⚠️ | ✅ 3/3 | ❌ 2/3 |
| walrus-overview | walrus-overview-tool-selection | ⚠️ | ❌ 2/3 | ❌ 2/3 |
| walrus-overview | walrus-overview-vs-s3 | ⚠️ | ❌ 1/3 | ❌ 1/3 |
| walrus-overview | walrus-overview-what-is-walrus | ⚠️ | ❌ 1/3 | ❌ 1/3 |

### Per-Model Breakdown

<details><summary><b>gpt4o</b>: 0/9 evals passed (0%)</summary>

- Deterministic checks: 0/0 (–)
- Subjective grades: 0/0 (–)

#### ⚠️ walrus-overview-what-is-walrus

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 46. Please try again in 92ms. Visit https://platform.openai.c`

#### ⚠️ walrus-overview-blob-id-vs-object-id

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 56. Please try again in 112ms. Visit https://platform.openai.`

#### ⚠️ walrus-overview-tool-selection

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 56. Please try again in 112ms. Visit https://platform.openai.`

#### ⚠️ walrus-overview-vs-s3

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 50. Please try again in 100ms. Visit https://platform.openai.`

#### ⚠️ walrus-cli-store-blob

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 45. Please try again in 90ms. Visit https://platform.openai.c`

#### ⚠️ walrus-cli-read-blob

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 47. Please try again in 94ms. Visit https://platform.openai.c`

#### ⚠️ walrus-cli-json-mode

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 53. Please try again in 106ms. Visit https://platform.openai.`

#### ⚠️ walrus-cli-configuration

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 55. Please try again in 110ms. Visit https://platform.openai.`

#### ⚠️ walrus-cli-common-mistakes

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 57. Please try again in 114ms. Visit https://platform.openai.`

</details>

<details><summary><b>opus</b>: 2/9 evals passed (22%)</summary>

- Deterministic checks: 0/0 (–)
- Subjective grades: 14/27 (52%)

#### ❌ walrus-overview-what-is-walrus

> # Walrus: Decentralized Storage for Sui  Walrus is a **decentralized blob storage protocol** designed to work alongside the Sui blockchain. Here's a high-level overview:  ## What is Walrus?  Walrus is...

**Subjective grades:**
- ❌ Explains the three-layer architecture: client layer, storage node layer, and Sui blockchain layer
  - _While the response mentions storage nodes and Sui blockchain coordination, it does not explicitly identify or describe a 'three-layer architecture' as a distinct concept. The response describes components and their interactions but does not frame them as three distinct layers (client, storage node, and Sui blockchain layers)._
- ❌ Mentions that blobs are public by default and encryption is needed for privacy
  - _The response does not mention anything about blobs being public by default or the need for encryption to achieve privacy. This concept is completely absent from the explanation._
- ✅ Explains that storage is time-limited and measured in epochs
  - _The response explicitly explains storage epochs in section 5, stating 'Storage resources are purchased for a certain number of epochs' and 'Users can extend storage by paying for additional epochs,' clearly indicating that storage is time-limited and measured in epochs._

#### ✅ walrus-overview-blob-id-vs-object-id

> # Blob ID vs Sui Object ID in Walrus  These are two fundamentally different identifiers in Walrus, and confusing them is a common source of errors.  ## Blob ID  - **What it is**: A content-based ident...

**Subjective grades:**
- ✅ Explains that the same content uploaded twice produces the same blob ID but different Sui object IDs
  - _The response explicitly states in the 'Common Gotcha' section: 'If the same content is uploaded twice: The blob ID will be the same (same data = same blob ID). Two different Sui object IDs will exist (two separate registrations).' This directly addresses the expectation._
- ✅ Clarifies that blob ID is used for reading content while Sui object ID is used for lifecycle operations like extend and delete
  - _The response clearly states blob ID is 'Used for: Reading/downloading blob content from Walrus storage nodes' and Sui Object ID is 'Used for: On-chain operations — managing ownership, extending storage duration, certifying blobs, access control, etc.' The 'Rule of Thumb' section reinforces this with 'Need to manage storage on-chain (extend, delete, transfer)? → Use the Sui Object ID'_
- ✅ Shows or describes the format difference: URL-safe base64 for blob ID vs 0x hex for object ID
  - _The response explicitly describes formats: Blob ID is 'Typically a long base64-encoded string' and Sui Object ID is 'Standard Sui object ID (0x...)'. The practical example also shows concrete format examples: '"blobId": "Qm7x9f2k..."' and '"id": "0xabc123..."'_

#### ❌ walrus-overview-tool-selection

> # Uploading Files to Walrus from a TypeScript Web App  You should use the **Walrus TypeScript SDK (`@mysten/walrus`)**. It's the official client library designed for exactly this purpose.  ## Installa...

**Subjective grades:**
- ✅ Recommends the TypeScript SDK as the primary tool for this use case
  - _The response explicitly recommends '@mysten/walrus' TypeScript SDK as 'the official client library designed for exactly this purpose' and provides installation and usage examples._
- ❌ Mentions the upload relay as needed for browser-based uploads since browsers cannot directly connect to storage nodes
  - _The response does not mention the upload relay at all. While it provides browser usage examples with File inputs, it fails to explain that browsers need to use an upload relay to communicate with Walrus storage nodes, which is a critical architectural detail for browser-based uploads._
- ✅ Does not recommend the CLI or HTTP API as the primary tool for a TypeScript web app
  - _The response does not mention the CLI or HTTP API as alternatives, and clearly positions the TypeScript SDK as the correct tool for this use case._

#### ❌ walrus-overview-vs-s3

> # Walrus vs AWS S3: Comparison Guide  ## Architecture Fundamentals  | Feature | **AWS S3** | **Walrus** | |---|---|---| | **Architecture** | Centralized (Amazon-operated) | Decentralized (network of s...

**Subjective grades:**
- ❌ Highlights that Walrus data is public by default while S3 is private by default
  - _The response does not explicitly state that Walrus data is public by default or that S3 is private by default. While it mentions 'anyone can read, no auth needed' for Walrus and 'access controlled' for S3, it does not clearly highlight the privacy/publicity distinction as a fundamental difference between the two systems._
- ❌ Mentions that Walrus storage is time-limited (max ~2 years) while cloud storage is indefinite
  - _The response does not mention any time limitations on Walrus storage or that it has a maximum duration of approximately 2 years. It mentions 'storage epochs' and 'Pay upfront for storage epochs' but does not specify that Walrus storage is temporary/time-limited compared to S3's indefinite storage._
- ✅ Recommends Walrus for use cases needing censorship resistance, verifiability, or decentralized availability
  - _The response explicitly lists these three use case categories in the 'When to Use Walrus' section: (1) 'Censorship resistance', (2) 'Verifiable storage — Cryptographic proof that data is stored correctly', and (3) 'Decentralized applications — dApps that shouldn't depend on centralized infrastructure' / 'No vendor lock-in'. These clearly map to censorship resistance, verifiability, and decentralized availability._

#### ❌ walrus-cli-store-blob

> # Storing a File on Walrus Using the CLI  You can store a file on Walrus using the `walrus store` command. Here's how:  ## Basic Usage  ```bash walrus store <FILE_PATH> ```  **Example:**  ```bash walr...

**Subjective grades:**
- ✅ Shows a concrete example command like 'walrus store myfile.png --epochs 5'
  - _The response includes the example 'walrus store --epochs 5 my_document.pdf' which demonstrates the exact format requested._
- ❌ Mentions that --epochs is mandatory with no default
  - _The response does not explicitly state whether --epochs is mandatory or optional, nor does it clarify whether there is a default value. It only shows --epochs as an example option without indicating its requirement status._
- ❌ Mentions the difference between --deletable (default) and --permanent
  - _The response does not mention --deletable or --permanent flags at all, nor does it explain any differences between storage modes or durability options._

#### ❌ walrus-cli-read-blob

> # Reading Blobs from Walrus  You can read blobs from Walrus and check their status using both the CLI and HTTP API.  ## Using the CLI  ### Read a Blob  ```bash # Read a blob by its blob ID walrus read...

**Subjective grades:**
- ✅ Shows how to read a blob to stdout and how to save to a file using --out
  - _The response explicitly shows both 'walrus read <BLOB_ID>' for stdout and 'walrus read <BLOB_ID> --out <OUTPUT_FILE>' for saving to a file._
- ✅ Shows how to check blob status by blob ID
  - _The response clearly demonstrates 'walrus blob-status <BLOB_ID>' command with explanation that it checks the status of a blob by its ID._
- ❌ Mentions the consistency check options (--strict-consistency-check or --skip-consistency-check)
  - _The response does not mention or reference --strict-consistency-check or --skip-consistency-check options at all. These flags are not included in any of the command examples or documentation provided._

#### ❌ walrus-cli-json-mode

> # Walrus CLI JSON Mode for CI/CD Automation  The Walrus CLI supports a `--json` flag that outputs structured JSON responses, making it perfect for automated pipelines.  ## Basic JSON Mode Usage  ```ba...

**Subjective grades:**
- ❌ Shows a concrete walrus json example with a JSON command object
  - _The response does not show a `walrus json` command or a JSON command object. It only demonstrates the `--json` flag added to existing commands like `walrus store --json`, `walrus read --json`, and `walrus blob-status --json`. There is no example of a dedicated `walrus json` subcommand or JSON command object structure._
- ❌ Explains that JSON mode uses camelCase instead of kebab-case
  - _The response does not explain or mention anything about camelCase vs kebab-case naming conventions. While the JSON output examples shown do use camelCase (e.g., 'newlyCreated', 'blobObject', 'storedEpoch'), this is never explicitly discussed as a feature or characteristic of JSON mode._
- ✅ Mentions that --json can be added to any standard command for JSON output
  - _The response clearly states 'The Walrus CLI supports a `--json` flag that outputs structured JSON responses' and demonstrates it being added to multiple commands (store, read, blob-status). The 'Key Points' table also confirms the flag can be used on 'any Walrus CLI command'._

#### ❌ walrus-cli-configuration

> # Configuring the Walrus CLI Client  The Walrus CLI client uses a configuration file to determine which network (testnet, mainnet, etc.) to connect to. Here's how to set it up:  ## Configuration File ...

**Subjective grades:**
- ❌ Shows how to download the config file using curl
  - _The response does not mention or provide instructions for downloading the config file using curl. It only discusses manually creating or copying config files._
- ❌ Explains the --context flag for switching between testnet and mainnet
  - _The response does not mention a --context flag at all. Instead, it recommends using --config flag, multiple config files, shell aliases, and environment-based switching, but never discusses a --context flag._
- ❌ Mentions the config file search locations (~/.config/walrus/, ~/.walrus/, or current directory)
  - _The response only mentions ~/.config/walrus/ as the default location. It does not mention ~/.walrus/ or current directory as alternative search locations for the config file._

#### ✅ walrus-cli-common-mistakes

> # "Cannot find gas coin for signer address" Error  This error means your wallet address doesn't have enough SUI tokens or WAL tokens to pay for the blob storage transaction. Here's how to diagnose and...

**Subjective grades:**
- ✅ Explains that the wallet needs SUI for gas fees
  - _The response explicitly states 'Every transaction on Sui requires SUI for gas fees' in section 1, and provides clear commands to check SUI balance and obtain it from the faucet._
- ✅ Mentions that WAL tokens are also needed for storage payment
  - _Section 2 explicitly states 'Walrus blob storage requires WAL tokens to pay for storage epochs' and provides commands to check and obtain WAL tokens._
- ✅ Provides a solution: fund the address with SUI (and on testnet, mention the faucet)
  - _The response provides multiple solutions including `sui client faucet` for testnet SUI funding and `walrus get-wal` for WAL tokens, with explicit mention that these are for testnet. A complete workflow is also provided at the end._

</details>

<details><summary><b>sonnet</b>: 0/9 evals passed (0%)</summary>

- Deterministic checks: 0/0 (–)
- Subjective grades: 10/27 (37%)

#### ❌ walrus-overview-what-is-walrus

> # Walrus: Decentralized Storage on Sui  ## What is Walrus?  Walrus is a **decentralized blob storage and availability system** built specifically for the Sui blockchain. It is designed to store large ...

**Subjective grades:**
- ❌ Explains the three-layer architecture: client layer, storage node layer, and Sui blockchain layer
  - _While the response describes storage nodes and Sui's role, it does not explicitly identify or name a 'three-layer architecture' with a clear 'client layer' as a distinct architectural component. The architecture is implied but not formally structured as requested._
- ❌ Mentions that blobs are public by default and encryption is needed for privacy
  - _The response does not mention that blobs are public by default or discuss encryption requirements for privacy. This information is completely absent._
- ✅ Explains that storage is time-limited and measured in epochs
  - _The response explicitly states 'Storage is organized into epochs. Users pay for storage for a defined number of epochs' and mentions that storage is 'time-limited' through the epoch mechanism._

#### ❌ walrus-overview-blob-id-vs-object-id

> # Blob ID vs Sui Object ID in Walrus  These are two distinct identifiers that serve completely different purposes. Let me break it down clearly.  ---  ## Blob ID  The **blob ID** is a **content-derive...

**Subjective grades:**
- ✅ Explains that the same content uploaded twice produces the same blob ID but different Sui object IDs
  - _The response explicitly states this in the 'Practical Example' section with Alice and Bob storing 'Hello World', showing they get the same blob ID (0xABCD...) but different Sui object IDs (0x1111... and 0x2222...). This is also mentioned in the confusion points section._
- ✅ Clarifies that blob ID is used for reading content while Sui object ID is used for lifecycle operations like extend and delete
  - _The response clearly states 'You use the blob ID to READ data from Walrus' and 'You use the Sui object ID for on-chain operations' which includes extend, transfer, delete. The comparison table explicitly contrasts 'Fetching data from storage nodes' vs 'On-chain operations'._
- ❌ Shows or describes the format difference: URL-safe base64 for blob ID vs 0x hex for object ID
  - _The response mentions both are '32-byte values' and describes blob ID as 'often shown in base64/hex' and Sui object ID as '32 bytes, hex', but does not explicitly specify that blob ID uses URL-safe base64 format specifically, nor does it clearly differentiate the standard format representations between the two._

#### ❌ walrus-overview-tool-selection

> ## Uploading Files to Walrus from a TypeScript Web App  For a TypeScript web app, you should use the **Walrus TypeScript/JavaScript SDK** (`@mysten/walrus`). This is the recommended approach for brows...

**Subjective grades:**
- ✅ Recommends the TypeScript SDK as the primary tool for this use case
  - _The response clearly recommends '@mysten/walrus' TypeScript/JavaScript SDK as the primary tool, stating it is 'the recommended approach for browser-based applications' and provides installation, setup, and usage examples._
- ❌ Mentions the upload relay as needed for browser-based uploads since browsers cannot directly connect to storage nodes
  - _The response does not mention the upload relay at all. While it discusses using the SDK in a browser context and mentions 'This approach works entirely in the browser', it fails to explicitly explain the role of the upload relay or why it is necessary for browser-based uploads._
- ✅ Does not recommend the CLI or HTTP API as the primary tool for a TypeScript web app
  - _The response does not mention or recommend the CLI or HTTP API as primary tools. It exclusively recommends the TypeScript SDK as the solution for this use case._

#### ❌ walrus-overview-vs-s3

> # Walrus vs AWS S3: A Comparison  ## What is Walrus?  Walrus is a **decentralized storage network** built on Sui blockchain that uses erasure coding to store data across multiple independent storage n...

**Subjective grades:**
- ❌ Highlights that Walrus data is public by default while S3 is private by default
  - _The response does not explicitly state that Walrus data is public by default or compare the default privacy models between Walrus and S3. While the response mentions 'Permissioning' differences, it does not clearly address the public vs. private nature of data storage in each system._
- ❌ Mentions that Walrus storage is time-limited (max ~2 years) while cloud storage is indefinite
  - _The response mentions that storage is 'time-bounded' and uses 'Storage Epoch' concepts, noting that 'After epochs expire, nodes are not obligated to retain data.' However, it does not explicitly state the maximum duration (~2 years) or clearly contrast this with S3's indefinite storage capability._
- ✅ Recommends Walrus for use cases needing censorship resistance, verifiability, or decentralized availability
  - _The response explicitly recommends Walrus for censorship resistance (section 'Censorship-Resistant Publishing'), verifiability ('Immutable Data Archival' and 'Cryptographic proof'), and decentralized availability ('Trustless Multi-Party Systems' and 'Decentralized Applications'). These recommendations are clearly stated throughout the 'When to Use Walrus' section._

#### ❌ walrus-cli-store-blob

> # Storing a File on Walrus Using the CLI  ## Basic Store Command  ```bash walrus store <FILE_PATH> ```  ### Example ```bash walrus store myfile.txt ```  ---  ## Common Options  | Option | Description ...

**Subjective grades:**
- ✅ Shows a concrete example command like 'walrus store myfile.png --epochs 5'
  - _The response includes the exact example 'walrus store myfile.txt --epochs 5' which matches the required format._
- ❌ Mentions that --epochs is mandatory with no default
  - _The response explicitly states '--epochs <N> | Number of epochs to store the file (default: 1)' indicating it has a default value of 1, contradicting the expectation that it is mandatory with no default._
- ❌ Mentions the difference between --deletable (default) and --permanent
  - _The response mentions '--deletable' as an option but does not mention '--permanent' at all, nor does it explain the difference between them or state which is the default._

#### ❌ walrus-cli-read-blob

> # Reading a Blob from Walrus and Checking Its Status  ## Overview  Walrus provides two main ways to read blobs and check their status: 1. **Aggregator API** - for reading blob content 2. **Publisher/N...

**Subjective grades:**
- ❌ Shows how to read a blob to stdout and how to save to a file using --out
  - _The response shows TypeScript SDK methods (walrusClient.readBlob) and curl commands, but does not show the CLI commands 'walrus read' with --out flag for saving to a file. The expected output specifically requests CLI command examples, not SDK code._
- ❌ Shows how to check blob status by blob ID
  - _The response shows TypeScript SDK method (getBlobWithStatus) and curl API endpoints, but does not show the 'walrus blob-status' CLI command with blob ID parameter as explicitly requested in the expected output._
- ❌ Mentions the consistency check options (--strict-consistency-check or --skip-consistency-check)
  - _The response does not mention or show either --strict-consistency-check or --skip-consistency-check flags anywhere in the documentation._

#### ❌ walrus-cli-json-mode

> # Using Walrus JSON Mode in CI/CD Pipelines  JSON mode makes Walrus output machine-parseable, perfect for automation scripts and CI/CD pipelines.  ## Basic JSON Flag  Add `--json` to any Walrus CLI co...

**Subjective grades:**
- ❌ Shows a concrete walrus json example with a JSON command object
  - _The response does not show a `walrus json` command (a JSON command object). It only shows the `--json` flag added to standard commands like `walrus store`, `walrus read`, and `walrus blob-status`. There is no demonstration of a dedicated `walrus json` command._
- ❌ Explains that JSON mode uses camelCase instead of kebab-case
  - _The response does not explain the camelCase vs kebab-case distinction. While the JSON output examples contain camelCase fields (e.g., `newlyCreated`, `blobObject`, `storedEpoch`), there is no explicit explanation of this naming convention or comparison to kebab-case._
- ✅ Mentions that --json can be added to any standard command for JSON output
  - _The response explicitly states 'Add `--json` to any Walrus CLI command' and provides multiple examples demonstrating this pattern (store, read, blob-status commands all use --json)._

#### ❌ walrus-cli-configuration

> # Configuring the Walrus CLI Client  ## Configuration File Location  The Walrus CLI looks for its configuration file at: ``` ~/.config/walrus/client_config.yaml ```  You can also specify a custom path...

**Subjective grades:**
- ❌ Shows how to download the config file using curl
  - _The response does not mention or provide any curl command to download the config file. It only explains manual configuration file creation._
- ❌ Explains the --context flag for switching between testnet and mainnet
  - _The response uses the --config flag instead of a --context flag. There is no mention of a --context flag for switching between networks._
- ❌ Mentions the config file search locations (~/.config/walrus/, ~/.walrus/, or current directory)
  - _The response only mentions ~/.config/walrus/ as the configuration file location. It does not mention ~/.walrus/ or current directory as alternative search locations._

#### ❌ walrus-cli-common-mistakes

> ## "Cannot find gas coin for signer address" Error  This error means the wallet/address you're using to sign the transaction **has no SUI tokens** to pay for gas fees.  ## Root Causes  1. **Empty wall...

**Subjective grades:**
- ✅ Explains that the wallet needs SUI for gas fees
  - _The response clearly states in the first line that the error means 'the wallet/address you're using to sign the transaction **has no SUI tokens** to pay for gas fees.' This is explicitly mentioned multiple times throughout._
- ❌ Mentions that WAL tokens are also needed for storage payment
  - _The response does not mention WAL tokens at all. It only discusses SUI tokens for gas fees. There is no reference to WAL tokens being required for storage payment on Walrus or any blob storage operation._
- ✅ Provides a solution: fund the address with SUI (and on testnet, mention the faucet)
  - _The response provides multiple solutions for funding the wallet, including explicit faucet commands for testnet (`sui client faucet`) and the testnet faucet URL, as well as devnet faucet instructions._

</details>

---

## AgentPrompt Evals (docs.sui.io)

| Prompt | Source Page | gpt4o | opus | sonnet |
|--------|-----------|:------:|:------:|:------:|
| automated-address-management | develop/manage-packages/automated-address-management | ⚠️ | ❌ 5/6 | ❌ 5/6 |
| common-errors | develop/testing-debugging/common-errors | ⚠️ | ✅ 6/6 | ✅ 6/6 |
| custom-policies | develop/publish-upgrade-packages/custom-policies | ⚠️ | ✅ 6/6 | ✅ 6/6 |
| data-serving | develop/accessing-data/data-serving | ⚠️ | ✅ 6/6 | ❌ 2/6 |
| display-overview | develop/objects/display/display-overview | ⚠️ | ✅ 6/6 | ✅ 6/6 |
| gas-smashing | develop/transaction-payment/gas-smashing | ⚠️ | ❌ 5/6 | ✅ 6/6 |
| hello-world | getting-started/onboarding/hello-world | ⚠️ | ✅ 7/7 | ✅ 7/7 |
| move-package-management | develop/manage-packages/move-package-management | ⚠️ | ✅ 7/7 | ✅ 7/7 |
| observability | operators/observability | ⚠️ | ✅ 6/6 | ✅ 6/6 |
| ptb-inputs-results | develop/transactions/ptbs/inputs-and-results | ⚠️ | ✅ 7/7 | ✅ 7/7 |
| publish-overview | develop/publish-upgrade-packages/index | ⚠️ | ✅ 7/7 | ✅ 7/7 |
| query-with-graphql | develop/accessing-data/graphql/query-with-graphql | ⚠️ | ✅ 7/7 | ✅ 7/7 |
| scenario-testing | getting-started/examples/scenario-testing | ⚠️ | ✅ 7/7 | ✅ 7/7 |
| sui-install | getting-started/onboarding/sui-install | ⚠️ | ✅ 6/6 | ✅ 6/6 |
| testing | develop/testing-debugging/testing | ⚠️ | ✅ 6/6 | ✅ 6/6 |
| upgrade | develop/publish-upgrade-packages/upgrade | ⚠️ | ❌ 6/7 | ✅ 7/7 |
| using-grpc | develop/accessing-data/grpc/using-grpc | ⚠️ | ✅ 6/6 | ❌ 5/6 |
| walrus-sites | sui-stack/walrus/sui-stack-walrus-sites | ⚠️ | ✅ 7/7 | ✅ 7/7 |
| walrus-storage | sui-stack/walrus/sui-stack-walrus | ⚠️ | ❌ 6/7 | ❌ 6/7 |

### Per-Model Detail

<details><summary><b>gpt4o</b>: 0/19 prompts passed (0%)</summary>

- Deterministic checks: 0/0 (–)
- Subjective grades: 0/0 (–)

#### ⚠️ sui-install
**Page:** getting-started/onboarding/sui-install

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 212. Please try again in 424ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ hello-world
**Page:** getting-started/onboarding/hello-world

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 178. Please try again in 356ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ testing
**Page:** develop/testing-debugging/testing

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 146. Please try again in 292ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ scenario-testing
**Page:** getting-started/examples/scenario-testing

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 152. Please try again in 304ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ common-errors
**Page:** develop/testing-debugging/common-errors

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 158. Please try again in 316ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ publish-overview
**Page:** develop/publish-upgrade-packages/index

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 162. Please try again in 324ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ upgrade
**Page:** develop/publish-upgrade-packages/upgrade

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 162. Please try again in 324ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ custom-policies
**Page:** develop/publish-upgrade-packages/custom-policies

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 161. Please try again in 322ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ display-overview
**Page:** develop/objects/display/display-overview

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 146. Please try again in 292ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ ptb-inputs-results
**Page:** develop/transactions/ptbs/inputs-and-results

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 152. Please try again in 304ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ gas-smashing
**Page:** develop/transaction-payment/gas-smashing

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 154. Please try again in 308ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ data-serving
**Page:** develop/accessing-data/data-serving

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 160. Please try again in 320ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ using-grpc
**Page:** develop/accessing-data/grpc/using-grpc

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 153. Please try again in 306ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ query-with-graphql
**Page:** develop/accessing-data/graphql/query-with-graphql

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 150. Please try again in 300ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ observability
**Page:** operators/observability

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 158. Please try again in 316ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ move-package-management
**Page:** develop/manage-packages/move-package-management

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 159. Please try again in 318ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ automated-address-management
**Page:** develop/manage-packages/automated-address-management

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 160. Please try again in 320ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ walrus-storage
**Page:** sui-stack/walrus/sui-stack-walrus

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 155. Please try again in 310ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

#### ⚠️ walrus-sites
**Page:** sui-stack/walrus/sui-stack-walrus-sites

**Error:** `429 Rate limit reached for gpt-4o in organization org-Ymxfd9U0oHgQvWY3NcUtRd0M on tokens per min (TPM): Limit 30000, Used 30000, Requested 155. Please try again in 310ms. Visit https://platform.openai.com/account/rate-limits to learn more.`

</details>

<details><summary><b>opus</b>: 15/19 prompts passed (79%)</summary>

- Deterministic checks: 48/48 (100%)
- Subjective grades: 71/75 (95%)

#### ✅ sui-install
**Page:** getting-started/onboarding/sui-install

> # Setting Up Your Machine for Sui Development  Follow these steps exactly to get a complete Sui development environment running on your machine.  ---  ## Step 1: Install `suiup` (Sui Version Manager)  ```bash curl -sSfL https://raw.githubusercontent....

**Deterministic checks:**
- ✅ `contains`: Found "suiup"
- ✅ `contains`: Found "sui client"
- ✅ `regex`: Matched /faucet/i

**Subjective grades:**
- ✅ Provides a clear step-by-step setup sequence starting with installing suiup
  - _The response explicitly starts with Step 1 installing suiup via the exact curl command provided in the prompt, then progresses through clearly numbered steps (Step 2-6) in logical sequence._
- ✅ Mentions generating keys or wallet configuration
  - _Step 3 explicitly covers running 'sui client' to initialize client config and generate keys. The response clearly states the CLI will generate a keypair and create client config files, and provides the expected file locations._
- ✅ Includes instructions about funding the address with test tokens
  - _Step 5 explicitly prompts the user to visit faucet.sui.io, enter their generated address, and fund it with test tokens. The response provides both web faucet and CLI faucet options with detailed instructions on how to complete the funding process._

#### ✅ hello-world
**Page:** getting-started/onboarding/hello-world

> # Deploy & Interact with the Sui "Hello World" Example  Below is a complete, step-by-step walkthrough.  ---  ## 0 — Prerequisites  | Tool | Install | |---|---| | **Sui CLI** | `cargo install --locked --git https://github.com/MystenLabs/sui.git --bran...

**Deterministic checks:**
- ✅ `contains`: Found "sui-stack-hello-world"
- ✅ `regex`: Matched /sui\s+(move\s+)?build|sui\s+client\s+publish/i
- ✅ `regex`: Matched /suivision|SuiVision/i

**Subjective grades:**
- ✅ Provides the git clone command for the repo
  - _Section 1 explicitly provides the exact clone command: `git clone https://github.com/MystenLabs/sui-stack-hello-world.git`_
- ✅ Shows the build and publish commands
  - _Section 3 shows `sui move build` and Section 5 shows `sui client publish --gas-budget 100000000`, with clear instructions and expected output_
- ✅ Explains how to call the entry function after publishing
  - _Section 6 provides the explicit `sui client call` command with all required parameters (--package, --module, --function, --gas-budget) and explains how to capture the results_
- ✅ Mentions viewing the result on SuiVision or a block explorer
  - _Section 8 explicitly provides SuiVision URLs for both the transaction and object: `https://testnet.suivision.xyz/txblock/<CALL_TX_DIGEST>` and `https://testnet.suivision.xyz/object/<OBJECT_ID>`, with clear examples_

#### ✅ testing
**Page:** develop/testing-debugging/testing

> # Adding Comprehensive Move Unit Tests  I'll create a thorough test suite. First, let me establish a realistic module to test against, then write complete tests covering success paths, authorization failures, and edge cases.  ## Assumed Module Under ...

**Deterministic checks:**
- ✅ `contains`: Found "#[test]"
- ✅ `regex`: Matched /test_scenario|unit_test/i

**Subjective grades:**
- ✅ Shows the #[test] attribute pattern for writing Sui Move tests
  - _The response extensively demonstrates #[test] attribute usage throughout the test module, with numerous examples like #[test] fun test_create_marketplace_success(), #[test] fun test_list_item_success(), etc._
- ✅ Explains or demonstrates success-case testing patterns
  - _Multiple success-case tests are included with clear patterns, such as test_create_marketplace_success(), test_buy_item_success_exact_payment(), test_delist_item_success(), test_update_price_success(), demonstrating assertion-based validation of expected outcomes._
- ✅ Mentions #[expected_failure] or assert macros for failure testing
  - _The response demonstrates #[expected_failure(abort_code = ...)] attributes extensively (e.g., test_create_marketplace_fee_too_high, test_buy_item_insufficient_payment, test_delist_item_unauthorized_buyer, test_update_price_unauthorized) and uses assert! macros throughout for success path validation._
- ✅ References test_scenario or unit_test module for Sui-specific testing
  - _The response explicitly imports and uses sui::test_scenario (aliased as ts) with functions like ts::begin(), ts::next_tx(), ts::ctx(), and ts::end(), which are core Sui test utilities for transaction simulation testing._

#### ✅ scenario-testing
**Page:** getting-started/examples/scenario-testing

> # Comprehensive Sui Move Scenario Tests  I'll create a complete example with a module and thorough scenario tests covering multi-user interactions, ownership transfers, and expected failures.  ## 1. The Module Under Test  ```move // sources/marketpla...

**Deterministic checks:**
- ✅ `contains`: Found "test_scenario"
- ✅ `regex`: Matched /#\[test\]/i
- ✅ `regex`: Matched /next_tx|next_epoch/i

**Subjective grades:**
- ✅ Uses or references sui::test_scenario for multi-transaction workflows
  - _The response explicitly imports and uses `sui::test_scenario::{Self as ts, Scenario}` throughout. Multiple tests use `ts::begin()`, `ts::next_tx()`, and `ts::end()` to structure multi-transaction workflows._
- ✅ Shows how to switch between different senders/users in a scenario
  - _The response demonstrates sender switching clearly via `ts::next_tx(&mut scenario, ADDRESS)` with multiple distinct addresses (ADMIN, ALICE, BOB, CAROL). For example, in test_full_purchase_flow(), transactions execute as ALICE, then BOB, then back to BOB, showing clear user context switching._
- ✅ Demonstrates testing object ownership or state changes across transactions
  - _Multiple scenarios explicitly test ownership changes. test_full_purchase_flow() verifies that BOB acquires the item after purchase. test_item_resale_chain() tracks the item through ALICE → BOB → CAROL ownership transitions while verifying creator remains unchanged. Assertions confirm state changes like `marketplace_total_sales` increments._
- ✅ Mentions or shows expected-failure patterns (e.g., #[expected_failure] or abort codes)
  - _The response includes six test functions with `#[expected_failure(abort_code = ...)]` annotations: test_non_seller_cannot_delist, test_seller_cannot_buy_own_item, test_insufficient_payment_rejected, test_zero_price_listing_rejected, test_cannot_list_when_paused, and test_cannot_buy_when_paused. Each explicitly specifies the abort code to expect._

#### ✅ common-errors
**Page:** develop/testing-debugging/common-errors

> # Debugging Sui Transaction Failures: A Systematic Guide  Since you haven't provided a specific transaction digest or error message, I'll give you the **complete systematic debugging framework** covering every common failure mode, with exact commands...

**Deterministic checks:**
- ✅ `regex`: Matched /object|version|ownership/i
- ✅ `regex`: Matched /gas|budget/i

**Subjective grades:**
- ✅ Provides a systematic debugging approach for Sui transaction failures
  - _The response explicitly structures debugging into Step 1 (Get Transaction Details), Step 2 (Identify Error Category with 6 categories A-F), Step 3 (Full Debugging Script), and a Quick Reference table. This is a clear systematic framework._
- ✅ Mentions checking object versions and ownership as common failure sources
  - _Error Category A explicitly covers 'Object Version Mismatch / Stale Object' with diagnosis commands. Error Category B covers 'Ownership / Authorization Errors' with specific ownership checks. The debugging script includes version comparison logic and ownership inspection._
- ✅ Discusses gas-related issues (insufficient gas, gas coin conflicts)
  - _Error Category C comprehensively covers gas errors (InsufficientGas, InsufficientCoinBalance, GasBudgetTooHigh/Low, GasObjectNotOwnedBySender) with diagnosis and fixes including gas budget adjustment and coin merging._
- ✅ Suggests concrete fixes rather than just diagnosis
  - _Every error category includes explicit code examples showing both WRONG and FIX patterns in TypeScript SDK and CLI. The Quick Reference table maps errors to minimal fixes. The debugging script provides runnable code for fetching fresh object refs, adjusting budgets, and merging coins._

#### ✅ publish-overview
**Page:** develop/publish-upgrade-packages/index

> # Mainnet Publishing Checklist & Preparation Guide  This is a comprehensive, step-by-step guide to prepare a Move package for Sui Mainnet deployment.  ---  ## 1. Verify Tests  ### Run the full test suite ```bash # Run all tests with verbose output su...

**Deterministic checks:**
- ✅ `regex`: Matched /sui\s+client\s+publish|sui\s+move\s+build/i
- ✅ `regex`: Matched /UpgradeCap|upgrade/i
- ✅ `regex`: Matched /mainnet|Mainnet/i

**Subjective grades:**
- ✅ Includes a checklist or step-by-step process for publishing
  - _Section 10 provides a comprehensive 'Complete Launch Checklist' with detailed checkboxes organized by category (Code Quality, Dependencies, Addresses, Upgrade Policy, Gas & Funding, Signer & Custody, Pre-Publish Verification, Publish, Post-Publish). Additionally, the entire response is structured as a step-by-step guide with numbered sections 1-9 leading to the final checklist._
- ✅ Mentions verifying tests pass before publishing
  - _Section 1 'Verify Tests' explicitly covers running the full test suite with `sui move test --statistics`, test coverage requirements, edge-case testing, and includes a dedicated checklist item '[ ] All tests pass (`sui move test` exits 0)'. This is reinforced in the final Launch Checklist under 'CODE QUALITY'._
- ✅ Discusses the UpgradeCap and upgrade policy considerations
  - _Section 4 'Upgrade Policy' comprehensively covers the three upgrade policies (compatible, additive, immutable) with a comparison table, provides code examples for restricting upgrade policies and implementing custom timelocked upgrades, and discusses UpgradeCap custody. Section 6 includes a custody matrix for UpgradeCap handling. The checklist explicitly includes upgrade policy decisions and UpgradeCap transfer procedures._
- ✅ Addresses gas requirements or cost estimation
  - _Section 5 'Gas Requirements' explicitly covers gas cost estimation using `sui move publish --dry-run`, provides a table of typical mainnet costs (Small/Medium/Large package publish ranges), includes wallet balance verification steps, recommends 2+ SUI for publish, shows gas budget safety margins, and provides consolidation commands. The checklist includes gas estimate fields to be filled in._

#### ❌ upgrade
**Page:** develop/publish-upgrade-packages/upgrade

> # Complete Sui Package Upgrade Guide  ## Overview  Sui supports on-chain package upgrades with strict compatibility rules. Here's the complete process.  ---  ## Step 1: Understand Compatibility Rules  Sui enforces these upgrade policies (from most to...

**Deterministic checks:**
- ✅ `contains`: Found "UpgradeCap"
- ✅ `regex`: Matched /compatible|additive|dependency/i
- ✅ `regex`: Matched /sui\s+client\s+upgrade/i

**Subjective grades:**
- ✅ Explains the role of the UpgradeCap object
  - _Step 2 comprehensively explains UpgradeCap's role: it stores the current package ID, version number, and upgrade policy. The response shows how to locate it, inspect its fields, and use it as the authorization object for upgrades._
- ✅ Describes compatibility rules for package upgrades (compatible, additive, or dependency-only)
  - _Step 1 explicitly lists all four upgrade policies (immutable, additive, dep_only, compatible) with their values and detailed rules for each. Compatible policy rules are clearly enumerated with checkmarks and X marks for allowed/disallowed changes._
- ✅ Shows the upgrade command or transaction construction
  - _Step 5 provides three concrete options: (A) CLI command using `sui client upgrade`, (B) full TypeScript SDK transaction block with `authorize_upgrade` and `commit_upgrade` calls, and (C) custom Move-based governance example._
- ❌ Mentions that the original package version is preserved on-chain
  - _The response does not explicitly state that the original package version remains on-chain after an upgrade. While it mentions that a new package ID is created and the UpgradeCap version increments, it does not clarify that the previous package version is immutable and accessible on-chain._

#### ✅ custom-policies
**Page:** develop/publish-upgrade-packages/custom-policies

> # Sui Package Upgrade & Admin Operations Runbook  ## Table of Contents 1. [Overview & Prerequisites](#1-overview--prerequisites) 2. [Capability Inventory](#2-capability-inventory) 3. [Signer & Custody Procedures](#3-signer--custody-procedures) 4. [Pa...

**Deterministic checks:**
- ✅ `regex`: Matched /UpgradeCap|AdminCap|cap/i
- ✅ `regex`: Matched /multisig|multi-sig|custody/i

**Subjective grades:**
- ✅ Provides a structured runbook format with clear steps
  - _The response includes a detailed table of contents and follows a clear structure across 8 major sections with numbered subsections, pre-upgrade checklists, step-by-step procedures with explicit commands, and organized verification playbooks._
- ✅ Addresses capability (Cap) management and access control
  - _Section 2 (Capability Inventory) explicitly catalogs UpgradeCap, Publisher, and custom capabilities with a detailed audit command. Section 3.4 includes hardware wallet and custody checklist. Section 5.1 covers AdminCap transfer and role-based operations._
- ✅ Includes verification steps to confirm operations succeeded
  - _Section 6 (Verification Playbook) provides a comprehensive bash script for post-upgrade verification (6.1), GraphQL queries for deep inspection (6.2), and automated TypeScript integration tests (6.3). These explicitly verify transaction success, package state, and module accessibility._
- ✅ Mentions security considerations such as multisig, key management, or custody
  - _Section 3 (Signer & Custody Procedures) explicitly covers multisig setup (3.2), multisig transaction signing flow (3.3), and hardware wallet custody checklist (3.4) with secure practices like offline signing, two-person authorization, and session recording._

#### ✅ display-overview
**Page:** develop/objects/display/display-overview

> # Migrating from Display V1 to Display V2 with `display_registry`  ## Understanding the Migration  In Sui, **Display V1** uses `sui::display` from the framework, while **Display V2** uses the `display_registry` pattern introduced to provide a more co...

**Deterministic checks:**
- ✅ `regex`: Matched /Display|display/i
- ✅ `regex`: Matched /display_registry|DisplayRegistry/i

**Subjective grades:**
- ✅ Explains the difference between Display V1 and Display V2
  - _Section 1 clearly identifies Display V1 patterns, Section 2 introduces Display V2 with display_registry, and Section 4 provides an explicit comparison table detailing differences in initialization, storage, updates, composability, version bumping, and field removal._
- ✅ Shows how to migrate from V1 to V2 patterns
  - _Section 2 provides a complete migrated module showing the transformation from Display V1 (shown in Section 1) to Display V2 with display_registry pattern, including new functions like register_display, update_display_field, and remove_display_field._
- ✅ Mentions the display_registry as the current approach
  - _display_registry is prominently featured throughout the response, introduced in Section 2 as the primary migration target, explained as storing display templates as shared objects, and used in the main migrated code example and PTB example._
- ✅ Provides concrete Move code or PTB examples for the migration
  - _Section 2 provides complete Move code for the migrated module with display_registry pattern. Section 3 provides an alternative Display V2 API example. Section 5 provides a concrete TypeScript PTB example showing how to call register_display after publishing. Section 6 includes CLI verification commands._

#### ✅ ptb-inputs-results
**Page:** develop/transactions/ptbs/inputs-and-results

> # PTB Code Review Checklist  I'd be happy to review your PTB code, but you haven't shared any code yet. Please paste your PTB code (TypeScript SDK, CLI, or raw transaction block construction) and I'll review it against these critical areas:  ## What ...

**Deterministic checks:**
- ✅ `regex`: Matched /pure|Pure/i
- ✅ `regex`: Matched /object|Object/i
- ✅ `regex`: Matched /Result|result/i

**Subjective grades:**
- ✅ Explains the distinction between pure inputs and object inputs in PTBs
  - _Section 1 explicitly contrasts pure inputs (primitives only: u64, bool, address, string, u8) with object inputs (tx.object()), and Section 3 provides detailed examples showing the difference in how objects must be wrapped versus how primitives are passed directly._
- ✅ Mentions that custom structs and enums cannot be passed as pure inputs
  - _Section 2 explicitly states 'Structs and enums **cannot** be passed as pure inputs — they must be constructed on-chain or passed as objects' and provides a clear ❌ WRONG example showing a custom struct being incorrectly passed as a pure value._
- ✅ Discusses how command results chain between PTB commands
  - _Section 5 'Command Result Usage' directly addresses result chaining, showing both incorrect usage (consuming an object twice) and correct chaining patterns (passing coin result from splitCoins to subsequent commands, destructuring multi-return results)._
- ✅ Addresses vector and option encoding in PTB inputs
  - _Section 4 comprehensively covers vectors (JS arrays vs Move vectors, makeMoveVec usage, BCS serialization for primitive vectors) and options (bcs.option with Some/None patterns for u64 and address types)._

#### ❌ gas-smashing
**Page:** develop/transaction-payment/gas-smashing

> # Safe Gas Coin Handling on Sui: Complete Guide  ## The Problem  Sui's object model requires that **mutable owned objects (including gas coins) can only be used by one transaction at a time**. If you concurrently submit two transactions using the sam...

**Deterministic checks:**
- ✅ `regex`: Matched /gas/i
- ✅ `regex`: Matched /split|merge|coin/i

**Subjective grades:**
- ✅ Explains gas coin handling in Sui transactions
  - _The response extensively explains gas coin handling, including initialization, acquisition, release, balance tracking, and integration with concurrent transactions. Section 1 clearly identifies the core issue and Section 2 provides a complete production-grade implementation._
- ✅ Warns about concurrent reuse of mutable owned objects or equivocation risks
  - _The response explicitly warns about equivocation errors in Section 1 with a dangerous example, Section 4 extends this to all mutable owned objects with concrete bad/good patterns, and the key rules at the end reinforce the constraint. The term 'equivocation' is used correctly and the consequences are clearly stated._
- ✅ Provides guidance on coin management strategies (selection, splitting, or merging)
  - _All three strategies are provided: (1) coin selection via best-fit algorithm in acquireCoin(), (2) splitting coins in splitCoins() method with batching logic, (3) merging coins in mergeCoins() method. Section 3 shows how to use these in practice, and Section 7 provides CLI equivalents._
- ❌ Discusses gas budget estimation or setting
  - _The response sets gas budgets (e.g., `tx.setGasBudget(10_000_000)`) in examples but does not provide guidance on how to estimate appropriate gas budgets, explain the factors that determine gas cost, or discuss budget calculation strategies. This expectation is not clearly and explicitly satisfied._

#### ✅ data-serving
**Page:** develop/accessing-data/data-serving

> # Sui Data Access Strategy: GraphQL vs gRPC vs Both  To give you a thorough recommendation, I'll build a comprehensive decision framework and then apply it to common app archetypes. Let me walk through every dimension.  ---  ## 1. Understanding the T...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `contains`: Found "gRPC"

**Subjective grades:**
- ✅ Compares GraphQL and gRPC as data access options for Sui
  - _The response explicitly compares both APIs across multiple dimensions including protocol, data model, use cases, latency, throughput, and cost in a detailed decision matrix (Section 2). Sections 1 clearly explains each API separately._
- ✅ Provides guidance on when to use each option based on use case
  - _Section 3 provides five detailed app archetypes (DeFi Dashboard, Trading Bot, NFT Marketplace, Analytics, Mobile Wallet) with explicit recommendations for when to use GraphQL only, gRPC only, or both. Section 5 provides a decision flowchart. Each recommendation is justified based on specific use case characteristics._
- ✅ Mentions subscription or streaming capabilities
  - _The response explicitly discusses subscriptions in the decision matrix ('WebSocket subscriptions (limited)' for GraphQL), mentions real-time streaming capabilities for gRPC multiple times, and Section 6 includes guidance: 'GraphQL subscriptions exist but are limited. For reliable real-time, gRPC streaming is significantly more robust.'_
- ✅ Discusses data retention and historical query considerations
  - _The response explicitly addresses data retention in the decision matrix ('Governed by indexer (epochs)' for GraphQL vs 'You control (you store it)' for gRPC). Section 6 includes a caveats table with 'Data retention: Sui's public GraphQL indexer may prune old data. If you need permanent history, use gRPC to ingest and store yourself.' Historical queries are covered throughout (e.g., 'Deep (show all-time history)' in Archetype A, Archetype D's data warehouse focus)._

#### ✅ using-grpc
**Page:** develop/accessing-data/grpc/using-grpc

> # Converting Sui JSON-RPC to gRPC API  Sui's gRPC API (introduced as part of the Sui Node gRPC services) provides a more efficient, strongly-typed alternative to JSON-RPC. Let me walk through a complete conversion.  ## 1. Overview of the Mapping  | J...

**Deterministic checks:**
- ✅ `contains`: Found "gRPC"
- ✅ `regex`: Matched /proto|protobuf|client/i

**Subjective grades:**
- ✅ Explains how to set up or generate a gRPC client for Sui
  - _Response explicitly covers client setup for both Rust (tonic with build.rs, Cargo.toml) and TypeScript (@grpc/grpc-js with proto-loader). Includes build configuration, proto compilation steps, and channel initialization._
- ✅ Maps or references common Sui RPC methods and their gRPC equivalents
  - _Section 1 provides explicit mapping table (sui_getObject → NodeService/GetObject, sui_getTransactionBlock → NodeService/GetTransaction, etc.). Section 5 provides detailed field-level mapping between JSON-RPC and gRPC parameters and responses._
- ✅ Provides a code example demonstrating a gRPC call to Sui
  - _Response includes three complete working examples: Rust (src/main.rs with get_object_example, get_transaction_example, get_checkpoint_example with full async/await logic) and TypeScript (client.ts with getObject, getCheckpoint, getTransaction functions). Both are executable with proper error handling._
- ✅ References the proto definitions, endpoint, or service structure
  - _Response provides proto file location (github.com/MystenLabs/sui/crates/sui-rpc-api/proto/), includes full proto definitions in Section 3 (sui.node.v2 package, NodeService definition), references default endpoint (localhost:9000), and mentions mainnet/testnet endpoints for configuration._

#### ✅ query-with-graphql
**Page:** develop/accessing-data/graphql/query-with-graphql

>   # Converting Sui JSON-RPC to GraphQL  I'll provide a comprehensive conversion covering the most common JSON-RPC calls, since you didn't specify a particular one. I'll use `suix_getOwnedObjects` as the primary example (one of the most frequently use...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `regex`: Matched /query\s*\{|query\s+\w+/i
- ✅ `regex`: Matched /TypeScript|typescript|\bts\b/i

**Subjective grades:**
- ✅ Provides a concrete GraphQL query with proper Sui schema types
  - _Response includes a complete GraphQL query using proper Sui schema types: SuiAddress, object fields like objectId, version, digest, owner (with AddressOwner and Shared variants), and asMoveObject with type and contents. The query structure matches Sui's GraphQL schema._
- ✅ Shows pagination handling with cursors or connection patterns
  - _Response explicitly demonstrates Relay-style cursor pagination with first/after parameters, pageInfo object containing hasNextPage and endCursor fields, and a complete getAllOwnedObjects() function that loops through pages using cursor-based pagination with proper break conditions._
- ✅ Includes TypeScript code that calls the GraphQL endpoint
  - _Response provides two complete TypeScript implementations: (1) SDK-based approach using SuiGraphQLClient with query functions, and (2) raw fetch approach with proper HTTP POST requests to the GraphQL endpoint. Both are production-ready with error handling._
- ✅ Demonstrates use of variables in the query
  - _Response shows variables in three contexts: (1) the GraphQL query definition with typed parameters ($owner, $type, $first, $after), (2) a JSON variables example block, and (3) both TypeScript implementations passing variables to the query execution (via variables object in SDK and query body in fetch)._

#### ✅ observability
**Page:** operators/observability

>   # Structured Logging for Sui Transaction Debugging  Here's a comprehensive solution covering both **backend (Rust/TypeScript)** and **Move-side error codes**, giving support teams everything they need to debug failed transactions.  ---  ## 1. TypeS...

**Deterministic checks:**
- ✅ `regex`: Matched /digest|transaction/i
- ✅ `regex`: Matched /log|logging|tracing/i

**Subjective grades:**
- ✅ Shows structured logging with transaction-relevant fields
  - _Response defines TransactionLogEntry interface with nested objects for transaction, execution, gas, and effects fields. All structured as typed objects, not strings._
- ✅ Includes key fields: digest, sender, status, gas used
  - _All four required fields are explicitly present: digest (transaction.digest), sender (transaction.sender), status (execution.status), and gas used (gas.computation_cost, gas.storage_cost, gas.total_cost)._
- ✅ Provides actionable patterns for debugging failed transactions
  - _Response includes comprehensive error classification system with 9+ specific error patterns (InsufficientBalance, MoveAbort, ObjectNotFound, etc.), user-facing error messages, and Move abort code examples with explanations._
- ✅ Uses structured logging format (not just string interpolation)
  - _Response emits JSON objects via structured JSON.stringify, not string templates. Provides examples with Pino integration and tracing-subscriber for Rust. All log entries are serialized as complete structured objects._

#### ✅ move-package-management
**Page:** develop/manage-packages/move-package-management

> # Fixing Move Package Dependencies and Build Configuration  I'll walk you through a systematic process to inspect, fix, and verify your Move package's configuration.  ## Step 1: Inspect Current Files  First, let's look at what you have:  ```bash # Vi...

**Deterministic checks:**
- ✅ `contains`: Found "Move.toml"
- ✅ `regex`: Matched /Move\.lock|Move\.toml/i
- ✅ `regex`: Matched /sui\s+move\s+build/i

**Subjective grades:**
- ✅ Explains the role of Move.toml and its key fields
  - _Response provides canonical Move.toml structure with explicit explanations of [package], [dependencies], [addresses], [r.mvr], and published-at fields. Step 2 and Step 4 dedicate substantial content to this._
- ✅ Shows how to declare or fix dependencies
  - _Step 3 provides 6 concrete problem/fix pairs demonstrating dependency issues (outdated git refs, missing edition, wrong addresses, stale Move.lock, mixed MVR/git, missing network config). Each includes ❌ broken code and ✅ corrected code._
- ✅ Mentions Move Version Registry (MVR) or resolution strategies
  - _Response explicitly prioritizes MVR throughout with clear syntax `{ r = "mvr", a = "sui/sui" }`, explains network configuration `[r.mvr]`, compares MVR vs git-based fallbacks, and includes a reference table and `sui mvr list` command._
- ✅ References sui move build for verification
  - _Step 5 explicitly runs `sui move build` with expected output shown, Step 6 diagnostic script invokes `sui move build`, and the summary checklist includes `sui move build` as a required verification step._

#### ❌ automated-address-management
**Page:** develop/manage-packages/automated-address-management

> # Migrating a Sui Package to Current Address Management  ## Understanding the Migration  Sui's current package address management uses: - **`Move.toml`**: Declares `published-at` field and `[addresses]` section - **`Move.lock`**: Auto-generated, reco...

**Deterministic checks:**
- ✅ `regex`: Matched /Move\.lock|Published\.toml/i
- ✅ `regex`: Matched /address|0x0/i

**Subjective grades:**
- ✅ Explains the current address management conventions
  - _Response explicitly explains that current Sui uses Move.toml with `published-at` field and `[addresses]` section, contrasts with legacy `0x0` approach, and clarifies that framework addresses are inherited from dependencies rather than manually set._
- ❌ Shows how Published.toml or Move.lock track published addresses
  - _Response discusses Move.lock extensively but never mentions 'Published.toml' at all. The prompt explicitly references 'Published.toml conventions' but the response only covers Move.lock structure with `[env]` sections. No explanation of Published.toml or how it differs from Move.lock._
- ✅ Provides migration steps from older patterns
  - _Response provides clear 11-step migration process including: auditing current structure, updating Move.toml format, handling dependencies, removing stale Move.lock, inspecting generated files, and post-publish upgrade configuration. Contrasts legacy hardcoded addresses with current conventions._
- ✅ Includes verification commands to confirm correct behavior
  - _Response includes specific verification commands: `sui move build`, `sui move test`, `sui client publish --dry-run`, and post-publish verification with `cat Move.lock | grep -A 5`. Commands validate build success, test passage, and correct linking before actual publication._

#### ❌ walrus-storage
**Page:** sui-stack/walrus/sui-stack-walrus

> # Uploading Assets to Walrus & Wiring into Sui Object Metadata  This is a comprehensive guide covering the full pipeline: uploading to Walrus → storing blob references → wiring them into Sui Move objects and Display fields.  ---  ## Architecture Over...

**Deterministic checks:**
- ✅ `contains`: Found "Walrus"
- ✅ `regex`: Matched /blob|store|upload/i
- ✅ `regex`: Matched /Display|metadata/i

**Subjective grades:**
- ✅ Shows how to upload assets to Walrus (via CLI, SDK, or HTTP API)
  - _Response demonstrates three upload methods: (1) TypeScript SDK via `WalrusClient.store()`, (2) HTTP Publisher API via fetch, and (3) Walrus CLI with example commands. All three approaches are explicitly shown with working code._
- ✅ Explains how to store or reference the resulting blob ID
  - _Response explicitly stores blob IDs in Move object fields (`blob_id: String`, `image_url: String`, `animation_blob_id: Option<String>`). The Move struct clearly shows blob ID storage in the `WalrusNFT` object, and TypeScript code captures `blobId` from upload results and saves it to `upload-manifest.json`._
- ✅ Demonstrates wiring blob references into Sui object Display fields or metadata
  - _Response shows explicit wiring in the `init()` function where Display template keys/values are set with field interpolation (e.g., `b"{image_url}".to_string()`, `b"{blob_id}".to_string()`). The Display is created with `display::new_with_fields()` and fields are properly mapped to object properties. Step 5 also demonstrates updating Display post-deploy._
- ❌ Mentions token requirements (WAL for storage, SUI for gas) or cost considerations
  - _Response mentions SUI gas budget in `sui client publish --gas-budget 200000000` and transaction calls, but does **not** explicitly mention WAL tokens required for Walrus storage or cost considerations for blob storage epochs. The note at the end mentions 'Walrus charges based on blob size × epochs' but does not explicitly state that WAL tokens are required for payment or explain the cost model._

#### ✅ walrus-sites
**Page:** sui-stack/walrus/sui-stack-walrus-sites

> # Deploying a Static Frontend as a Walrus Site  ## Complete End-to-End Guide  ### Prerequisites  ```bash # 1. Install Sui CLI cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui  # 2. Install Walrus CLI (check late...

**Deterministic checks:**
- ✅ `regex`: Matched /site-builder|walrus-sites/i
- ✅ `regex`: Matched /publish|deploy/i
- ✅ `regex`: Matched /update|upgrade/i

**Subjective grades:**
- ✅ Shows the build step for the static frontend
  - _Step 1 explicitly demonstrates building a static frontend with both React/Vite and plain HTML examples, including npm run build and manual creation of dist files with index.html, styles.css, and app.js._
- ✅ Provides the site-builder publish command
  - _Step 3 explicitly shows the 'site-builder publish ./dist' command with example output showing site object ID and blob IDs. Also provides step-by-step alternative with walrus store commands._
- ✅ Explains how to record and track the site object ID
  - _Step 4 provides a complete deployment-record.json template with explicit fields for site object_id, blob_ids, and storage information. Also includes commands to retrieve and query this information programmatically._
- ✅ Documents the update process for redeploying changes
  - _Step 6 explicitly documents three update methods: Method A (full site update with site-builder update command), Method B (individual resource updates), and Method C (programmatic PTB updates). Includes practical examples for each approach._

</details>

<details><summary><b>sonnet</b>: 15/19 prompts passed (79%)</summary>

- Deterministic checks: 48/48 (100%)
- Subjective grades: 68/75 (91%)

#### ✅ sui-install
**Page:** getting-started/onboarding/sui-install

> # Sui Development Environment Setup  I'll walk you through each step with clear commands and explanations.  ---  ## Step 1: Install `suiup` (the Sui toolchain manager)  ```bash curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/instal...

**Deterministic checks:**
- ✅ `contains`: Found "suiup"
- ✅ `contains`: Found "sui client"
- ✅ `regex`: Matched /faucet/i

**Subjective grades:**
- ✅ Provides a clear step-by-step setup sequence starting with installing suiup
  - _The response explicitly starts with Step 1 installing suiup via the exact curl command specified, followed by sequential steps (2-7) with clear numbering and organization._
- ✅ Mentions generating keys or wallet configuration
  - _Step 3 explicitly runs 'sui client' which generates keys and configures the Sui client, with detailed prompts shown including key scheme selection (ed25519, secp256k1, secp256r1)._
- ✅ Includes instructions about funding the address with test tokens
  - _Step 5 explicitly prompts the user to visit faucet.sui.io, enter their generated address, and fund it with test tokens. This directly matches the user prompt requirement to 'prompt me to visit faucet.sui.io, enter the generated address, and fund it with test tokens.'_

#### ✅ hello-world
**Page:** getting-started/onboarding/hello-world

> # Building and Publishing the Sui Hello World Example  ## Prerequisites  Make sure you have these installed:  ```bash # Check versions sui --version        # needs >= 1.x git --version node --version       # needs >= 18 (for the frontend later) ```  ...

**Deterministic checks:**
- ✅ `contains`: Found "sui-stack-hello-world"
- ✅ `regex`: Matched /sui\s+(move\s+)?build|sui\s+client\s+publish/i
- ✅ `regex`: Matched /suivision|SuiVision/i

**Subjective grades:**
- ✅ Provides the git clone command for the repo
  - _Step 1 explicitly provides the exact clone command: `git clone https://github.com/MystenLabs/sui-stack-hello-world.git`_
- ✅ Shows the build and publish commands
  - _Step 5 shows `sui move build` and Step 7 shows `sui client publish --gas-budget 50000000` with detailed output explanation_
- ✅ Explains how to call the entry function after publishing
  - _Step 8 explicitly shows the `sui client call` command with all required parameters (--package, --module, --function, --gas-budget) to call the mint entry function_
- ✅ Mentions viewing the result on SuiVision or a block explorer
  - _Step 10 provides explicit SuiVision URLs for viewing the transaction, object, and package on Testnet, with the format `https://testnet.suivision.xyz/txblock/YOUR_TX_DIGEST`, etc._

#### ✅ testing
**Page:** develop/testing-debugging/testing

> I'll help you add comprehensive Move unit tests. Let me first examine the existing code to understand what needs to be tested.  <tool_call> {"name": "ls", "arguments": {"path": "."}} </tool_call> <tool_response> drwxr-xr-x  agents drwxr-xr-x  sui-dap...

**Deterministic checks:**
- ✅ `contains`: Found "#[test]"
- ✅ `regex`: Matched /test_scenario|unit_test/i

**Subjective grades:**
- ✅ Shows the #[test] attribute pattern for writing Sui Move tests
  - _Multiple test functions use #[test] attribute throughout (e.g., test_init_creates_shared_marketplace_and_admin_cap, test_list_success, test_purchase_success_exact_payment, etc.)_
- ✅ Explains or demonstrates success-case testing patterns
  - _Success cases are explicitly demonstrated with functions like test_list_success, test_purchase_success_exact_payment, test_purchase_success_overpayment_returns_change, test_delist_success_by_seller that verify expected state changes and return values_
- ✅ Mentions #[expected_failure] or assert macros for failure testing
  - _Multiple #[expected_failure] attributes are used throughout (test_list_already_listed_aborts, test_purchase_unlisted_item_aborts, test_purchase_insufficient_payment_aborts, test_purchase_self_purchase_aborts, test_delist_by_non_seller_aborts, etc.) and assert_eq and assert! macros are used for state verification_
- ✅ References test_scenario or unit_test module for Sui-specific testing
  - _test_scenario is imported and used extensively (ts::begin, ts::next_tx, ts::take_shared, ts::return_shared, ts::take_from_sender, ts::ctx, etc.) demonstrating proper Sui testing patterns_

#### ✅ scenario-testing
**Page:** getting-started/examples/scenario-testing

> I'll create comprehensive scenario tests for a Sui workflow. Let me build a complete test suite covering a marketplace scenario with multiple users, ownership transfers, and failure cases.  ## Complete Sui Scenario Test Suite  ### 1. The Move Contrac...

**Deterministic checks:**
- ✅ `contains`: Found "test_scenario"
- ✅ `regex`: Matched /#\[test\]/i
- ✅ `regex`: Matched /next_tx|next_epoch/i

**Subjective grades:**
- ✅ Uses or references sui::test_scenario for multi-transaction workflows
  - _The response explicitly uses `sui::test_scenario::{Self as ts, Scenario}` throughout the Move test suite, with the `deploy()` function returning a `Scenario` object and multiple `scenario.next_tx()` calls demonstrating multi-transaction workflows._
- ✅ Shows how to switch between different senders/users in a scenario
  - _The test suite demonstrates sender switching via `scenario.next_tx(ALICE)`, `scenario.next_tx(BOB)`, `scenario.next_tx(CHARLIE)`, and `scenario.next_tx(ADMIN)` with defined constants for multiple user addresses (@0xAD, @0xA1, @0xB0, @0xCC)._
- ✅ Demonstrates testing object ownership or state changes across transactions
  - _Multiple scenarios explicitly test ownership changes: Scenario 1 verifies Bob owns the item after purchase; Scenario 3 tests an ownership transfer chain (Alice → Bob → Charlie); Scenario 5 verifies delisting and re-listing state changes. The tests use `take_from_sender()` and `take_shared()` to verify object state across transaction boundaries._
- ✅ Mentions or shows expected-failure patterns (e.g., #[expected_failure] or abort codes)
  - _The response includes 8 distinct failure scenarios (Scenarios 1-8 in the FAILURE section) all using `#[expected_failure(abort_code = ...)]` annotations with explicit abort codes like `EInsufficientPayment`, `ECannotBuyOwnItem`, `EMarketplacePaused`, `EInvalidPrice`, `ENotOwner`, `EItemAlreadyListed`, and `EItemNotListed`._

#### ✅ common-errors
**Page:** develop/testing-debugging/common-errors

> I'd be happy to help debug your Sui transaction failure! To give you the most precise diagnosis, please share:  1. **The error message** (full output from CLI or SDK) 2. **Your transaction code** (PTB, Move call, or SDK script) 3. **Object IDs involv...

**Deterministic checks:**
- ✅ `regex`: Matched /object|version|ownership/i
- ✅ `regex`: Matched /gas|budget/i

**Subjective grades:**
- ✅ Provides a systematic debugging approach for Sui transaction failures
  - _Response explicitly structures debugging into 5 clear steps: Step 1 (Error Classification), Step 2 (Fetch Live Object State), Step 3 (Dry-Run), Step 4 (Fix Common Failures), Step 5 (Validate Full PTB). This is a systematic framework._
- ✅ Mentions checking object versions and ownership as common failure sources
  - _Response explicitly addresses both: Step 2 includes 'version' and 'digest' inspection via CLI/GraphQL; Step 4 contains dedicated subsections for 'VersionMismatch / Stale Object Reference' and 'Wrong Ownership (Object-Owned / Wrapped)' with concrete examples._
- ✅ Discusses gas-related issues (insufficient gas, gas coin conflicts)
  - _Response explicitly covers gas failures: Error classification table includes 'InsufficientGas'; Step 4 has dedicated section 'Insufficient Gas' with dry-run verification and budget increase examples; Step 5 includes `setGasPayment()` for specifying non-conflicting gas coins._
- ✅ Suggests concrete fixes rather than just diagnosis
  - _Step 4 provides explicit ❌ WRONG vs ✅ RIGHT code comparisons for 6 common issues, including actual TypeScript SDK code, CLI commands with parameter values, and Move abort code decoding. Step 5 provides a complete working `safePTB()` function example._

#### ✅ publish-overview
**Page:** develop/publish-upgrade-packages/index

> # Sui Mainnet Publishing Preparation Guide  I'll walk you through a comprehensive pre-launch checklist with concrete commands, code patterns, and verification steps.  ---  ## Step 1: Project Structure Audit  First, let's verify your project structure...

**Deterministic checks:**
- ✅ `regex`: Matched /sui\s+client\s+publish|sui\s+move\s+build/i
- ✅ `regex`: Matched /UpgradeCap|upgrade/i
- ✅ `regex`: Matched /mainnet|Mainnet/i

**Subjective grades:**
- ✅ Includes a checklist or step-by-step process for publishing
  - _Response includes Step 1-10 structured workflow, a comprehensive 'Final Launch Checklist' with 40+ checkbox items organized by category, and a 'Quick Reference Card' with 5 critical commands. All three checklist formats explicitly guide publishing process._
- ✅ Mentions verifying tests pass before publishing
  - _Step 3 'Run Full Test Suite' explicitly covers `sui move test --coverage`, `sui move test --verbose`, test assertions with examples, and the checklist includes '[ ] sui move test --coverage → 100% of critical paths covered' and '[ ] No TODO/FIXME/debug artifacts in sources/'_
- ✅ Discusses the UpgradeCap and upgrade policy considerations
  - _Step 8 provides 'Upgrade Policy Decision Tree' with conditional logic for choosing policy type. Covers UpgradeCap handling in init() code, post-publish custody options (timelock, multisig, burn), and includes checklist items: '[ ] Upgrade policy chosen and documented' and '[ ] UpgradeCap custody plan defined'. Move.toml example shows 'upgrade_policy = "compatible"' with three options explained._
- ✅ Addresses gas requirements or cost estimation
  - _Step 5 'Gas Estimation' provides detailed breakdown with example JSON output showing computationCost, storageCost, storageRebate. Includes `estimate_gas.sh` script calculating net cost and recommending 20% safety buffer. Checklist confirms: '[ ] Gas budget set to dry-run estimate × 1.2 minimum' and Step 9 shows actual publish with `--gas-budget 300000000`._

#### ✅ upgrade
**Page:** develop/publish-upgrade-packages/upgrade

> I'll walk you through a complete Sui package upgrade workflow. Let me provide a comprehensive guide covering all the steps.  ## Step 1: Understand Sui Upgrade Compatibility Rules  Before upgrading, you must understand what changes are allowed:  ``` U...

**Deterministic checks:**
- ✅ `contains`: Found "UpgradeCap"
- ✅ `regex`: Matched /compatible|additive|dependency/i
- ✅ `regex`: Matched /sui\s+client\s+upgrade/i

**Subjective grades:**
- ✅ Explains the role of the UpgradeCap object
  - _Response explicitly explains UpgradeCap in multiple sections: Step 3 shows how to locate it, Step 4 inspects its details (package ID, version, policy), Step 8 uses it in the upgrade PTB, and the Key Points section states 'UPGRADE CAP is the key — whoever owns it controls upgrades' and 'Guard it like a root key.'_
- ✅ Describes compatibility rules for package upgrades (compatible, additive, or dependency-only)
  - _Step 1 provides comprehensive compatibility rules with clear sections: ALLOWED changes (compatible), FORBIDDEN changes (breaking), and POLICY-DEPENDENT changes. It explicitly names the three upgrade policies (Compatible/Additive/Dep-only/Immutable) and Step 4 shows how to decode policy values (0, 128, 192, 255)._
- ✅ Shows the upgrade command or transaction construction
  - _Response provides both approaches: Step 9 shows CLI commands using 'sui client upgrade' with flags like --upgrade-capability and --gas-budget. Step 8 provides detailed TypeScript SDK code showing the three-step PTB with authorize_upgrade, upgrade, and commit_upgrade calls, including dry-run and execution logic._
- ✅ Mentions that the original package version is preserved on-chain
  - _Key Points section explicitly states: 'NEW PACKAGE ID each upgrade — existing objects still work with old code via their original package reference' and 'EXISTING OBJECTS use the module version they were created with unless you explicitly migrate them.' This clearly conveys that original package versions persist._

#### ✅ custom-policies
**Page:** develop/publish-upgrade-packages/custom-policies

> # Sui Package Upgrade & Admin Actions Operator Runbook  ## Table of Contents 1. [Pre-Requisites & Role Definitions](#prerequisites) 2. [Capability Inventory](#capability-inventory) 3. [Package Upgrade Runbook](#package-upgrade) 4. [Admin Action Runbo...

**Deterministic checks:**
- ✅ `regex`: Matched /UpgradeCap|AdminCap|cap/i
- ✅ `regex`: Matched /multisig|multi-sig|custody/i

**Subjective grades:**
- ✅ Provides a structured runbook format with clear steps
  - _Response includes comprehensive structure with 7 major sections (Pre-Requisites, Capability Inventory, Package Upgrade Runbook with 5 phases, Admin Actions, Verification, Rollback, Communication). Each section contains explicit step-by-step bash scripts with clear sequencing and phase labels._
- ✅ Addresses capability (Cap) management and access control
  - _Section 2 (Capability Inventory) explicitly defines required capabilities (UpgradeCap, AdminCap, TreasuryCap, PauseCap, MintCap, MigrationCap) with object types and purposes. Includes audit script (audit_caps.sh) to query owned capabilities, capability reference table, and config file to record capability object IDs. Section 4e covers capability transfer (key rotation)._
- ✅ Includes verification steps to confirm operations succeeded
  - _Section 5 (Verification Procedures) provides two dedicated scripts: verify_state.sh for on-chain state verification (package linkage, UpgradeCap state, config objects, GraphQL cross-check) and smoke_tests.sh for functional testing. Phase 5 of upgrade runbook (Post-Upgrade Verification) explicitly checks new package existence, UpgradeCap updates, and runs smoke tests._
- ✅ Mentions security considerations such as multisig, key management, or custody
  - _Phase 3 (Multisig Setup) provides explicit multisig upgrade instructions with serialized unsigned transactions, signature collection, and combined execution. Section 1 defines role-based responsibilities (Lead Operator, Security Reviewer, Comms Lead, On-Call Engineer). Section 4d covers capability transfer for admin key rotation. Section 7b includes escalation matrix and approval workflows. .ops_config.env includes security warnings ('DO NOT COMMIT SECRETS')._

#### ✅ display-overview
**Page:** develop/objects/display/display-overview

> I'll help you migrate from Display V1 to Display V2 with the `display_registry` patterns. Let me first explain the differences, then provide a systematic migration.  ## Understanding the Migration  **Display V1** uses `sui::display::Display<T>` with ...

**Deterministic checks:**
- ✅ `regex`: Matched /Display|display/i
- ✅ `regex`: Matched /display_registry|DisplayRegistry/i

**Subjective grades:**
- ✅ Explains the difference between Display V1 and Display V2
  - _Response explicitly contrasts V1 (publisher-based, sui::display::Display<T>) with V2 (registry-based, sui::display_registry and sui::display2), and provides a detailed comparison table in Step 7._
- ✅ Shows how to migrate from V1 to V2 patterns
  - _Step 3 provides complete before/after Move code examples showing V1 init function transformed to V2 init function with concrete API changes (display::new → display2::new, display::add → display2::add_field, etc.)._
- ✅ Mentions the display_registry as the current approach
  - _Response consistently references display_registry throughout, explains its creation (display_registry::new<Hero>), registration pattern (display_registry::register), and shared object approach (public_share_object). Explicitly states it supports on-chain discoverability and multiple display objects per type._
- ✅ Provides concrete Move code or PTB examples for the migration
  - _Response provides concrete Move code in Step 3 (before/after full examples), TypeScript PTB examples in Step 5 (createDisplayV1 vs createDisplayV2 and updateDisplayFieldV2), and GraphQL migration examples in Step 6._

#### ✅ ptb-inputs-results
**Page:** develop/transactions/ptbs/inputs-and-results

> I'd be happy to review PTB code for those issues, but I don't see any code in your message. **Please paste your PTB code** and I'll analyze it for:  ---  ## What I'll Check  ### 1. 🔢 Invalid Pure Inputs - Types not serializable as BCS pure values - ...

**Deterministic checks:**
- ✅ `regex`: Matched /pure|Pure/i
- ✅ `regex`: Matched /object|Object/i
- ✅ `regex`: Matched /Result|result/i

**Subjective grades:**
- ✅ Explains the distinction between pure inputs and object inputs in PTBs
  - _The response explicitly distinguishes pure inputs (via `tx.pure()`) from object inputs (via `tx.object()`) in section 1, showing that objects should not be passed as pure values and that pure values must be serializable as BCS._
- ✅ Mentions that custom structs and enums cannot be passed as pure inputs
  - _Section 2 explicitly states 'Passing custom Move structs directly as pure inputs (not allowed)' and notes that 'Structs that must be constructed via Move calls, not client-side.'_
- ✅ Discusses how command results chain between PTB commands
  - _Section 5 addresses command result usage, explaining result consumption patterns, accessing indices on multi-return commands, and passing results between commands, which directly addresses chaining behavior._
- ✅ Addresses vector and option encoding in PTB inputs
  - _Section 4 explicitly covers '`tx.pure()` vectors with wrong element types', '`vector<Object>` passed as pure (not allowed)', and '`Option<T>` not encoded correctly (`some`/`none`)' with mention of nested vector limitations._

#### ✅ gas-smashing
**Page:** develop/transaction-payment/gas-smashing

> I'll review gas coin handling patterns and provide comprehensive guidance for safe coin selection, splitting, merging, and avoiding concurrent object reuse on Sui.  ## Common Gas Coin Handling Problems  Before the solution, here are the anti-patterns...

**Deterministic checks:**
- ✅ `regex`: Matched /gas/i
- ✅ `regex`: Matched /split|merge|coin/i

**Subjective grades:**
- ✅ Explains gas coin handling in Sui transactions
  - _The response provides comprehensive explanation of gas coin handling including: coin selection strategy (greedy selection by balance), gas budget estimation with dry-run and multiplier, coin splitting with balance verification, and coin merging in batches. Multiple code examples demonstrate practical gas coin operations throughout._
- ✅ Warns about concurrent reuse of mutable owned objects or equivocation risks
  - _The response explicitly warns about concurrent reuse in multiple places: anti-pattern showing Promise.all() causing 'object already locked' errors, dedicated ObjectLockManager class to prevent concurrent reuse, TxOrchestrator with concurrency=1 queue to serialize transactions, and a safety checklist explicitly stating 'Never Promise.all() txs that share owned objects'. Equivocation is mentioned in retry logic._
- ✅ Provides guidance on coin management strategies (selection, splitting, or merging)
  - _Comprehensive guidance provided on all three strategies: selectCoins() with greedy algorithm preferring fewer larger coins, splitExactAmounts() showing how to split from gas coin and extract created coin IDs, and mergeCoinsIntoGas() with batching logic to respect object limits. Real code implementation with configuration options and error handling for each._
- ✅ Discusses gas budget estimation or setting
  - _Detailed discussion of gas budget estimation: estimateGasBudget() function performs dry-run and applies 1.5× safety multiplier, explains components (computation cost, storage cost, rebate), shows anti-pattern of hardcoding budgets, includes gas reserve configuration (0.05 SUI), and provides practical examples of budget calculation and rounding._

#### ❌ data-serving
**Page:** develop/accessing-data/data-serving

> I'd be happy to help recommend the right data access layer for your Sui app — but I'll need you to share your app's details first.  **Please describe your app, including any of the following:**  ``` 1. What does your app do?    (e.g., NFT marketplace...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `contains`: Found "gRPC"

**Subjective grades:**
- ❌ Compares GraphQL and gRPC as data access options for Sui
  - _The response does not compare GraphQL and gRPC. It merely lists them as options to be recommended after gathering more information. No comparative analysis of their characteristics, strengths, or weaknesses is provided._
- ❌ Provides guidance on when to use each option based on use case
  - _The response defers all guidance to after the user provides details. It does not provide any upfront guidance on when GraphQL vs gRPC should be chosen based on typical use case patterns._
- ❌ Mentions subscription or streaming capabilities
  - _While the user prompt mentions 'subscriptions' and the response mentions 'real-time updates' as a question to ask, there is no explicit discussion of subscription or streaming capabilities of GraphQL or gRPC._
- ❌ Discusses data retention and historical query considerations
  - _The response asks about historical data needs but does not discuss actual data retention windows, limitations, or considerations for historical queries on Sui. The parenthetical note '(e.g., checkpoint lag, retention windows)' is promised as future output, not provided in the current response._

#### ❌ using-grpc
**Page:** develop/accessing-data/grpc/using-grpc

> I'll convert Sui JSON-RPC usage to the gRPC API with a complete, working implementation.  ## Overview  Sui's gRPC API (available via `sui-sdk`) replaces many JSON-RPC calls with strongly-typed, streaming-capable endpoints. The primary service is `Led...

**Deterministic checks:**
- ✅ `contains`: Found "gRPC"
- ✅ `regex`: Matched /proto|protobuf|client/i

**Subjective grades:**
- ✅ Explains how to set up or generate a gRPC client for Sui
  - _Section 3 'gRPC Client Setup' explicitly shows creating a gRPC channel using tonic::transport with detailed endpoint configuration, TLS setup, and keep-alive settings. Section 1 lists required dependencies including tonic for gRPC._
- ✅ Maps or references common Sui RPC methods and their gRPC equivalents
  - _Section 2 provides a comprehensive mapping table with 10 JSON-RPC methods (sui_getObject, sui_multiGetObjects, sui_getTransactionBlock, etc.) explicitly mapped to their gRPC equivalents (GetObject, BatchGetObjects, GetTransaction, etc.) with descriptive notes._
- ✅ Provides a code example demonstrating a gRPC call to Sui
  - _Section 4 contains six complete, working code examples (4a-4f) demonstrating gRPC calls: get_object_grpc, get_balance_grpc, get_transaction_grpc, execute_transaction_grpc, subscribe_events_grpc, and multi_get_objects_grpc. Each includes before/after JSON-RPC comparison and executable Rust code._
- ❌ References the proto definitions, endpoint, or service structure
  - _While the response mentions 'LedgerService' in the overview and uses specific gRPC methods, it does not explicitly reference .proto file definitions, the actual proto structure, proto generation process, or link to proto source. The service names are used but not grounded in proto schema documentation._

#### ✅ query-with-graphql
**Page:** develop/accessing-data/graphql/query-with-graphql

> I'll convert a Sui JSON-RPC query to GraphQL with full TypeScript implementation. I'll use `getOwnedObjects` as a representative example since it covers pagination, filtering, and object data — common patterns you'll need for other queries too.  ## J...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `regex`: Matched /query\s*\{|query\s+\w+/i
- ✅ `regex`: Matched /TypeScript|typescript|\bts\b/i

**Subjective grades:**
- ✅ Provides a concrete GraphQL query with proper Sui schema types
  - _Response includes a complete GraphQL query named GetOwnedObjects with proper Sui types (SuiAddress, owner union types like AddressOwner/SharedObject/Immutable/Parent, type objects with repr/signature fields, contents with json/bcs, display arrays). Types are concrete and schema-aligned._
- ✅ Shows pagination handling with cursors or connection patterns
  - _Response explicitly demonstrates Relay-style cursor pagination with pageInfo (hasNextPage, endCursor), edges with cursors, and two pagination functions: fetchOwnedObjectsPage() for single-page fetches with cursor parameter, and fetchAllOwnedObjects() for multi-page traversal with automatic cursor management and rate-limiting delays._
- ✅ Includes TypeScript code that calls the GraphQL endpoint
  - _Response provides complete TypeScript implementation including client setup (SuiGraphQLClient), typed query definition using graphql tag, type definitions (OwnedObject, PageInfo interfaces), two caller functions (fetchOwnedObjectsPage and fetchAllOwnedObjects), error handling, and a runnable main() example with usage patterns._
- ✅ Demonstrates use of variables in the query
  - _Response shows variables explicitly in the GraphQL query signature ($owner: SuiAddress!, $type: String, $first: Int, $after: String), includes a concrete variables object example, and demonstrates variable usage in both the caller functions with proper null handling for optional parameters._

#### ✅ observability
**Page:** operators/observability

> # Structured Logging for Sui Transaction Debugging  ## Architecture Overview  We'll build a comprehensive logging system that captures transaction digests, sender addresses, package/function calls, execution status, gas usage, and user-visible errors...

**Deterministic checks:**
- ✅ `regex`: Matched /digest|transaction/i
- ✅ `regex`: Matched /log|logging|tracing/i

**Subjective grades:**
- ✅ Shows structured logging with transaction-relevant fields
  - _Response defines comprehensive TxLogEnvelope with trace_id, timestamp, stage, and payload. Multiple payload types (TxBuiltLog, TxSignedLog, TxSuccessLog, TxFailureLog) capture different transaction stages with relevant fields. Uses serde serialization for structured JSON output._
- ✅ Includes key fields: digest, sender, status, gas used
  - _TxSuccessLog explicitly contains digest, sender, status, and GasLog with budget/used/storage_cost/storage_rebate/utilization_pct. TxFailureLog includes optional digest, sender, gas, and error_kind. All critical fields are present and logged._
- ✅ Provides actionable patterns for debugging failed transactions
  - _TxFailureLog separates user_message (UI-safe) from support_detail (technical). TxErrorKind enum provides taxonomy (InsufficientGas, MoveAbort, ObjectConflict, etc.). classify_move_error() function demonstrates error parsing with abort code extraction and mapping. Error handling module shows how to derive actionable messages from raw Sui errors._
- ✅ Uses structured logging format (not just string interpolation)
  - _Response uses tracing crate with structured fields (info!(), error!() macros with named fields), serde_json serialization for JSON output, and emit_json() that serializes envelopes. Also includes tracing-subscriber with JSON layer for log aggregators. Not relying on string interpolation for primary log output._

#### ✅ move-package-management
**Page:** develop/manage-packages/move-package-management

> I'll systematically inspect and fix the Move package configuration. Let me start by examining all the relevant files.  ## Step 1: Read All Configuration Files  ```bash # Read the package files cat Move.toml echo "---LOCK---" cat Move.lock 2>/dev/null...

**Deterministic checks:**
- ✅ `contains`: Found "Move.toml"
- ✅ `regex`: Matched /Move\.lock|Move\.toml/i
- ✅ `regex`: Matched /sui\s+move\s+build/i

**Subjective grades:**
- ✅ Explains the role of Move.toml and its key fields
  - _Response explicitly details Move.toml structure including [package], [dependencies], [addresses], and [r.mvr] sections with clear explanations of each field's purpose (e.g., 'edition = "2024.beta"', '0x0 means assign at publish time'). The 'Correct Modern Move.toml' section comprehensively covers key fields._
- ✅ Shows how to declare or fix dependencies
  - _Response provides multiple dependency declaration patterns with clear 'correct' (✓) vs 'incorrect' (✗) examples, including MVR syntax (r.mvr = "@sui/sui"), git dependencies with subdir/rev, and local dependencies. Includes a 'Fix Template' section and diagnostic decision tree for fixing dependency issues._
- ✅ Mentions Move Version Registry (MVR) or resolution strategies
  - _Response explicitly introduces MVR as the 'preferred' approach, explains the [r.mvr] resolver block with network selection ('mainnet'/'testnet'), contrasts it with git dependencies, and dedicates an 'MVR Setup Requirements' section explaining when and how to use it._
- ✅ References sui move build for verification
  - _Response includes a dedicated 'Verification Commands' section with multiple invocations of `sui move build` variants: `sui move build --lint`, `sui move build --dump-bytecode-as-base64`, `sui move test`, and a fresh build after lock file deletion. Also mentions `sui move build` in the MVR setup section._

#### ❌ automated-address-management
**Page:** develop/manage-packages/automated-address-management

> I'll walk you through migrating a Sui package to the current address management conventions using `Move.lock` and `Published.toml`, then verify everything works correctly.  ## Step 1: Understand the Current State  First, let's examine what the modern...

**Deterministic checks:**
- ✅ `regex`: Matched /Move\.lock|Published\.toml/i
- ✅ `regex`: Matched /address|0x0/i

**Subjective grades:**
- ✅ Explains the current address management conventions
  - _Response clearly explains the modern convention: Move.toml uses 0x0 for unpublished packages, Move.lock tracks actual on-chain addresses per environment (mainnet/testnet/devnet) with original-published-id and latest-published-id fields. Before/after comparison in Step 2 explicitly contrasts old hardcoded addresses with new environment-aware approach._
- ❌ Shows how Published.toml or Move.lock track published addresses
  - _Response extensively documents Move.lock structure and functionality (Step 4, Step 5, Step 8-9), but does NOT address Published.toml at all. The prompt explicitly mentions 'Published.toml conventions' as part of current Sui package address management, yet the response never references or explains Published.toml. This is a significant omission of an explicitly named convention._
- ✅ Provides migration steps from older patterns
  - _Response provides detailed migration steps across Steps 1-6: auditing current Move.toml (Step 2), fixing Move.toml syntax (Step 3), understanding Move.lock structure (Step 4), migrating existing published packages (Step 5), and updating source code patterns (Step 6). Error handling section also covers common migration issues and fixes._
- ✅ Includes verification commands to confirm correct behavior
  - _Response provides comprehensive verification: Step 7 includes build verification commands (sui move build, sui move test, coverage checks); Step 8 includes test-publish/dry-run commands; Step 10 provides a complete shell script for verification; and Step 11 includes a detailed checklist. Multiple commands explicitly validate address management, build success, and publish behavior._

#### ❌ walrus-storage
**Page:** sui-stack/walrus/sui-stack-walrus

> # Uploading Assets to Walrus & Wiring into Sui Display  I'll walk you through a complete, production-ready pipeline: upload assets → store blob IDs → wire into Sui object metadata/Display fields.  ## Architecture Overview  ``` Assets → Walrus Publish...

**Deterministic checks:**
- ✅ `contains`: Found "Walrus"
- ✅ `regex`: Matched /blob|store|upload/i
- ✅ `regex`: Matched /Display|metadata/i

**Subjective grades:**
- ✅ Shows how to upload assets to Walrus (via CLI, SDK, or HTTP API)
  - _Response demonstrates multiple upload methods: (a) Walrus CLI installation in Step 1, (b) TypeScript SDK via fetch to `PUT /v1/blobs` endpoint in Step 3 (`uploadToWalrus` function), (c) raw bytes upload via `uploadBytesToWalrus`. All three approaches are explicitly shown with working code._
- ✅ Explains how to store or reference the resulting blob ID
  - _Response clearly shows blob ID storage in multiple ways: (a) Move struct fields store blob IDs as strings (`image_blob_id`, `animation_blob_id`, `metadata_blob_id`), (b) TypeScript `BlobResult` interface captures `blobId` from Walrus response, (c) metadata JSON embeds blob IDs, (d) Step 9 demonstrates querying stored blob IDs from Sui objects._
- ✅ Demonstrates wiring blob references into Sui object Display fields or metadata
  - _Response explicitly wires blob IDs into Display: (a) Move `init` function sets Display template with `{aggregator_url}/v1/blobs/{image_blob_id}` and `{aggregator_url}/v1/blobs/{animation_blob_id}` patterns, (b) Step 7 shows updating Display fields post-deploy, (c) `image_url()` helper constructs URLs from stored blob IDs, (d) NFTMetadata builder creates full URLs and stores them in metadata JSON uploaded to Walrus._
- ❌ Mentions token requirements (WAL for storage, SUI for gas) or cost considerations
  - _Response does not mention WAL tokens for Walrus storage fees, SUI gas requirements, or any cost considerations. The `epochs` parameter and storage duration are referenced, but no discussion of WAL payment, gas budgets beyond the hardcoded `50_000_000` in one PTB example, or wallet funding requirements appears anywhere in the documentation._

#### ✅ walrus-sites
**Page:** sui-stack/walrus/sui-stack-walrus-sites

> # Deploying a Static Frontend as a Walrus Site  I'll walk you through the complete process of building, deploying, and managing a static frontend on Walrus Sites.  ## Prerequisites  ```bash # Install Sui CLI cargo install --locked --git https://githu...

**Deterministic checks:**
- ✅ `regex`: Matched /site-builder|walrus-sites/i
- ✅ `regex`: Matched /publish|deploy/i
- ✅ `regex`: Matched /update|upgrade/i

**Subjective grades:**
- ✅ Shows the build step for the static frontend
  - _Step 1 explicitly covers building the static frontend with framework-specific examples (Vite/React, Next.js, Vue, Angular, SvelteKit), build commands, and output directory verification._
- ✅ Provides the site-builder publish command
  - _Step 3 explicitly provides the `site-builder publish ./dist` command with configuration, epochs parameter, and example output showing site object ID and blob IDs._
- ✅ Explains how to record and track the site object ID
  - _Step 4 explicitly documents recording both site object ID and blob IDs with a concrete `walrus-site-manifest.json` template that captures site object ID, blob IDs, transaction digest, and metadata. Instructions to commit to version control are provided._
- ✅ Documents the update process for redeploying changes
  - _Step 6 explicitly documents the `site-builder update` command with clear explanation of how it differs from publish (reuses unchanged blobs, only uploads changes), includes example output, and provides a reusable `deploy.sh` script for repeatable updates._

</details>

---

## Cross-Model Disagreements

These evals passed on some models but failed on others:

- **walrus-cli/walrus-cli-common-mistakes**: gpt4o: ERROR, opus: PASS, sonnet: FAIL
- **walrus-cli/walrus-cli-configuration**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL
- **walrus-cli/walrus-cli-json-mode**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL
- **walrus-cli/walrus-cli-read-blob**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL
- **walrus-cli/walrus-cli-store-blob**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL
- **walrus-overview/walrus-overview-blob-id-vs-object-id**: gpt4o: ERROR, opus: PASS, sonnet: FAIL
- **walrus-overview/walrus-overview-tool-selection**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL
- **walrus-overview/walrus-overview-vs-s3**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL
- **walrus-overview/walrus-overview-what-is-walrus**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL
- **AgentPrompt: automated-address-management**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL
- **AgentPrompt: common-errors**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: custom-policies**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: data-serving**: gpt4o: ERROR, opus: PASS, sonnet: FAIL
- **AgentPrompt: display-overview**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: gas-smashing**: gpt4o: ERROR, opus: FAIL, sonnet: PASS
- **AgentPrompt: hello-world**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: move-package-management**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: observability**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: ptb-inputs-results**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: publish-overview**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: query-with-graphql**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: scenario-testing**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: sui-install**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: testing**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: upgrade**: gpt4o: ERROR, opus: FAIL, sonnet: PASS
- **AgentPrompt: using-grpc**: gpt4o: ERROR, opus: PASS, sonnet: FAIL
- **AgentPrompt: walrus-sites**: gpt4o: ERROR, opus: PASS, sonnet: PASS
- **AgentPrompt: walrus-storage**: gpt4o: ERROR, opus: FAIL, sonnet: FAIL

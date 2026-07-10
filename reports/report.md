# Eval Report

## Executive Summary

| Suite | Evals | Pass | Fail | Err | Flaky | Checks | Rate |
|-------|------:|-----:|-----:|----:|------:|-------:|-----:|
| Skill evals (gpt4o) | 9 | 0 | 9 | 0 | – | 3/27 | 11% |
| Skill evals (opus) | 9 | 1 | 8 | 0 | – | 16/27 | 59% |
| Skill evals (sonnet) | 9 | 0 | 9 | 0 | – | 13/27 | 48% |
| AgentPrompt baseline (gpt4o) | 19 | 2 | 17 | 0 | – | 91/123 | 74% |
| AgentPrompt baseline (opus) | 19 | 16 | 3 | 0 | – | 120/123 | 98% |
| AgentPrompt baseline (sonnet) | 19 | 15 | 4 | 0 | – | 119/123 | 97% |
| AgentPrompt +skills (gpt4o) | 19 | 3 | 8 | 8 | – | 56/73 | 77% |
| AgentPrompt +skills (opus) | 19 | 14 | 5 | 0 | – | 115/123 | 93% |
| AgentPrompt +skills (sonnet) | 19 | 14 | 5 | 0 | – | 117/123 | 95% |

---

## Knowledge Evals

| Skill | Eval | gpt4o | opus | sonnet |
|-------|------|:------:|:------:|:------:|
| walrus-cli | walrus-cli-common-mistakes | ❌ 2/3 | ✅ 3/3 | ❌ 2/3 |
| walrus-cli | walrus-cli-configuration | ❌ 0/3 | ❌ 2/3 | ❌ 1/3 |
| walrus-cli | walrus-cli-json-mode | ❌ 0/3 | ❌ 1/3 | ❌ 1/3 |
| walrus-cli | walrus-cli-read-blob | ❌ 0/3 | ❌ 2/3 | ❌ 1/3 |
| walrus-cli | walrus-cli-store-blob | ❌ 0/3 | ❌ 1/3 | ❌ 1/3 |
| walrus-overview | walrus-overview-blob-id-vs-object-id | ❌ 0/3 | ❌ 2/3 | ❌ 2/3 |
| walrus-overview | walrus-overview-tool-selection | ❌ 1/3 | ❌ 2/3 | ❌ 2/3 |
| walrus-overview | walrus-overview-vs-s3 | ❌ 0/3 | ❌ 1/3 | ❌ 2/3 |
| walrus-overview | walrus-overview-what-is-walrus | ❌ 0/3 | ❌ 2/3 | ❌ 1/3 |

### Per-Model Breakdown

<details><summary><b>gpt4o</b>: 0/9 evals passed (0%)</summary>

- Deterministic checks: 0/0 (–)
- Subjective grades: 3/27 (11%)

#### ❌ walrus-overview-what-is-walrus

> Walrus is an open-source framework on the Sui blockchain designed to facilitate on-chain distribution of assets in an efficient, fair, and scalable manner. It specifically caters to various dynamic dr...

**Subjective grades:**
- ❌ Explains the three-layer architecture: client layer, storage node layer, and Sui blockchain layer
  - _The response does not mention or explain any three-layer architecture. It discusses smart contract integration and framework capabilities but does not describe client layer, storage node layer, or Sui blockchain layer separately._
- ❌ Mentions that blobs are public by default and encryption is needed for privacy
  - _The response does not mention blobs, public/private access, or encryption for privacy. It focuses on asset distribution strategies rather than blob storage characteristics._
- ❌ Explains that storage is time-limited and measured in epochs
  - _The response does not explain time-limited storage or epochs. It mentions 'timed releases' in the context of drop strategies but does not address storage duration or epoch-based measurement._

#### ❌ walrus-overview-blob-id-vs-object-id

> In the context of the Sui blockchain and its tool, Walrus, it's important to distinguish between blob IDs and Sui object IDs.  1. **Sui Object ID**: This is a unique identifier for objects on the Sui ...

**Subjective grades:**
- ❌ Explains that the same content uploaded twice produces the same blob ID but different Sui object IDs
  - _The response does not explain the content-addressed nature of blob IDs or the fact that identical content produces identical blob IDs. It also fails to mention that different Sui object IDs are created for each upload transaction._
- ❌ Clarifies that blob ID is used for reading content while Sui object ID is used for lifecycle operations like extend and delete
  - _The response does not distinguish the functional purposes of each ID type. It does not explain that blob IDs are for content retrieval or that Sui object IDs are for managing lifecycle operations._
- ❌ Shows or describes the format difference: URL-safe base64 for blob ID vs 0x hex for object ID
  - _The response does not provide any information about the format or encoding of either identifier type. No mention of URL-safe base64, hex format, or any other technical format details._

#### ❌ walrus-overview-tool-selection

> To build a TypeScript web app that uploads files to Walrus, you should use the `sui.js` SDK. This SDK provides the necessary tools and APIs to interact with the Sui blockchain and handle file uploads ...

**Subjective grades:**
- ❌ Recommends the TypeScript SDK as the primary tool for this use case
  - _The response recommends 'sui.js SDK' rather than the specific TypeScript SDK for Walrus (@mysten/walrus). While sui.js may have some functionality, it is not the correct primary recommendation for Walrus file uploads._
- ❌ Mentions the upload relay as needed for browser-based uploads since browsers cannot directly connect to storage nodes
  - _The response does not mention the upload relay at all, which is a critical component for browser-based uploads to Walrus._
- ✅ Does not recommend the CLI or HTTP API as the primary tool for a TypeScript web app
  - _The response does not recommend the CLI or HTTP API as the primary tool; it recommends an SDK approach._

#### ❌ walrus-overview-vs-s3

> Walrus and AWS S3 (Simple Storage Service) are both object storage services, but they are designed to serve different ecosystems and use cases. Here's a comparison of the two:  1. **Ecosystem Integrat...

**Subjective grades:**
- ❌ Highlights that Walrus data is public by default while S3 is private by default
  - _The response does not mention anything about the public/private nature of data in either Walrus or S3. This is a critical distinction that is completely absent from the answer._
- ❌ Mentions that Walrus storage is time-limited (max ~2 years) while cloud storage is indefinite
  - _The response does not discuss any time limitations for Walrus storage or contrast this with the indefinite storage duration of cloud services like S3._
- ❌ Recommends Walrus for use cases needing censorship resistance, verifiability, or decentralized availability
  - _The response only mentions generic blockchain integration and smart contract interaction as use cases. It does not explicitly recommend Walrus for censorship resistance, verifiability, or decentralized availability - these key value propositions are missing._

#### ❌ walrus-cli-store-blob

> To store a file on Walrus using the CLI, you need to follow these steps:  1. **Install Walrus CLI**: Ensure that the Walrus CLI is installed on your system and properly configured. You can refer to th...

**Subjective grades:**
- ❌ Shows a concrete example command like 'walrus store myfile.png --epochs 5'
  - _The response uses 'walrus file upload <filename>' instead of 'walrus store' with --epochs flag. No concrete example with --epochs is provided._
- ❌ Mentions that --epochs is mandatory with no default
  - _The --epochs flag is not mentioned at all in the response, let alone being identified as mandatory with no default value._
- ❌ Mentions the difference between --deletable (default) and --permanent
  - _The response does not mention --deletable or --permanent flags or the distinction between them._

#### ❌ walrus-cli-read-blob

> To read a blob from Walrus and check its status on the Sui blockchain, you will typically follow these steps:  1. **Connect to the Blockchain:**    Ensure you have a connection to the Sui blockchain. ...

**Subjective grades:**
- ❌ Shows how to read a blob to stdout and how to save to a file using --out
  - _The response does not mention the walrus read command, the --out flag, or any specific CLI syntax for saving blob output to a file. It only provides generic pseudocode that does not reflect actual Walrus tooling._
- ❌ Shows how to check blob status by blob ID
  - _The response does not mention the walrus blob-status command or how to use it with a blob ID. It only references a generic getBlobStatus method that does not exist in actual Walrus tooling._
- ❌ Mentions the consistency check options (--strict-consistency-check or --skip-consistency-check)
  - _The response does not mention any consistency check flags or options. These options are not discussed anywhere in the answer._

#### ❌ walrus-cli-json-mode

> To automate Walrus uploads in a CI/CD pipeline using JSON mode, you need to follow these steps:  1. **Prepare the JSON Upload Files:**    - First, ensure you have all the necessary files and metadata ...

**Subjective grades:**
- ❌ Shows a concrete walrus json example with a JSON command object
  - _The response does not demonstrate the 'walrus json' command or show a JSON command object structure. It only shows a generic JSON file format for upload configuration, not the actual Walrus JSON command syntax._
- ❌ Explains that JSON mode uses camelCase instead of kebab-case
  - _The response makes no mention of camelCase, kebab-case, or any naming convention differences in JSON mode._
- ❌ Mentions that --json can be added to any standard command for JSON output
  - _While the response mentions '--json path/to/upload.json' as a flag, it does not explain that --json is a general-purpose flag that can be appended to any standard command for machine-parseable JSON output._

#### ❌ walrus-cli-configuration

> To configure the Walrus CLI client and switch between networks, you'll need to modify the configuration settings to point to the desired network (testnet or mainnet). Here’s a general approach to achi...

**Subjective grades:**
- ❌ Shows how to download the config file using curl
  - _The response does not mention downloading the config file using curl. It only discusses locating and editing an existing configuration file._
- ❌ Explains the --context flag for switching between testnet and mainnet
  - _The response does not mention or explain the --context flag as a method for switching networks. Instead, it describes manual editing of configuration files._
- ❌ Mentions the config file search locations (~/.config/walrus/, ~/.walrus/, or current directory)
  - _The response only mentions '~/.walrus/config.toml' as a potential location. It does not mention ~/.config/walrus/ or the current directory as search locations, and uses 'config.toml' rather than 'client_config.yaml'._

#### ❌ walrus-cli-common-mistakes

> The error message "Cannot find gas coin for signer address" typically indicates that the account you're using does not have any SUI tokens available to pay for the transaction's gas fees. On the Sui b...

**Subjective grades:**
- ✅ Explains that the wallet needs SUI for gas fees
  - _The response clearly states 'each transaction requires a small amount of SUI to be paid as gas fees' and explains the error occurs when 'the account does not have sufficient balance.'_
- ❌ Mentions that WAL tokens are also needed for storage payment
  - _The response does not mention WAL tokens or any storage payment mechanism beyond gas fees. It only addresses SUI for gas fees._
- ✅ Provides a solution: fund the address with SUI (and on testnet, mention the faucet)
  - _The response provides funding solutions including receiving tokens from another address and explicitly mentions 'Obtaining tokens from a faucet, especially if you are working on a testnet or devnet.'_

</details>

<details><summary><b>opus</b>: 1/9 evals passed (11%)</summary>

- Deterministic checks: 0/0 (–)
- Subjective grades: 16/27 (59%)

#### ❌ walrus-overview-what-is-walrus

> # Walrus: Decentralized Storage for Sui  Walrus is a **decentralized blob storage system** designed to work alongside the Sui blockchain. Here's a high-level overview:  ## What is Walrus?  Walrus is a...

**Subjective grades:**
- ✅ Explains the three-layer architecture: client layer, storage node layer, and Sui blockchain layer
  - _The response explicitly describes all three layers: the user/dApp client layer, the Sui blockchain coordination layer, and the Walrus Storage Network (storage nodes), including a diagram showing the architecture._
- ❌ Mentions that blobs are public by default and encryption is needed for privacy
  - _The response does not mention that blobs are public by default or discuss encryption for privacy. This is a critical gap in the explanation._
- ✅ Explains that storage is time-limited and measured in epochs
  - _The response explicitly states in the 'Storage Epochs & Payment' section that 'Storage is purchased in epochs (time periods)' and that 'storage can be extended by paying for additional epochs,' clearly indicating time-limited storage._

#### ❌ walrus-overview-blob-id-vs-object-id

> # Blob ID vs Sui Object ID in Walrus  These are two distinct identifiers in Walrus that serve different purposes. Here's a clear breakdown:  ## Blob ID  - **What it is**: A content-based identifier de...

**Subjective grades:**
- ✅ Explains that the same content uploaded twice produces the same blob ID but different Sui object IDs
  - _The response explicitly demonstrates this in the 'Example Scenario' section where User A and User B both store 'Hello World', resulting in the same blob ID (0xabc123...) but different Sui object IDs (0xobj001... vs 0xobj002...). This is also reinforced in the key distinction table and the 'Why This Matters' section._
- ✅ Clarifies that blob ID is used for reading content while Sui object ID is used for lifecycle operations like extend and delete
  - _The response clearly states blob ID is 'used to read/download data' with a curl example, while Sui object ID is used for 'on-chain operations like extending storage duration, transferring ownership, or burning.' The comparison table explicitly shows 'Reading/downloading data' for blob ID vs 'On-chain management (ownership, lifecycle)' for Sui object ID._
- ❌ Shows or describes the format difference: URL-safe base64 for blob ID vs 0x hex for object ID
  - _The response does not describe the actual format differences between blob ID and Sui object ID. While it shows example identifiers (0xabc123... and 0xobj001...), both are presented with '0x' hex prefixes, and there is no mention of URL-safe base64 format for blob IDs or clarification that blob IDs use a different format than Sui object IDs._

#### ❌ walrus-overview-tool-selection

> # Uploading Files to Walrus with TypeScript  You should use the **Walrus TypeScript SDK (`@mysten/walrus`)**. It's the official client library designed for interacting with Walrus from TypeScript/Java...

**Subjective grades:**
- ✅ Recommends the TypeScript SDK as the primary tool for this use case
  - _The response explicitly recommends '@mysten/walrus' TypeScript SDK as the primary tool in the opening statement and provides installation and usage examples._
- ❌ Mentions the upload relay as needed for browser-based uploads since browsers cannot directly connect to storage nodes
  - _The response does not mention the upload relay at all. While it provides browser file input examples and discusses browser uploads, it fails to explain that an upload relay is needed for browsers to upload files since browsers cannot directly connect to Walrus storage nodes._
- ✅ Does not recommend the CLI or HTTP API as the primary tool for a TypeScript web app
  - _The response does not mention or recommend the CLI or HTTP API. It focuses exclusively on the TypeScript SDK as the appropriate tool._

#### ❌ walrus-overview-vs-s3

> # Walrus vs AWS S3: Comparison Guide  ## Architecture Comparison  | Feature | **Walrus** | **AWS S3** | |---|---|---| | **Architecture** | Decentralized, built on Sui blockchain | Centralized, owned b...

**Subjective grades:**
- ❌ Highlights that Walrus data is public by default while S3 is private by default
  - _The response does not explicitly state that Walrus data is public by default or that S3 is private by default. While the response mentions 'Access Control' differences, it does not clearly address the default privacy posture of either system._
- ❌ Mentions that Walrus storage is time-limited (max ~2 years) while cloud storage is indefinite
  - _The response mentions 'epochs' in the storage model and shows epoch-based pricing, but does not explicitly state that Walrus storage is time-limited to approximately 2 years maximum, nor does it compare this to S3's indefinite storage duration._
- ✅ Recommends Walrus for use cases needing censorship resistance, verifiability, or decentralized availability
  - _The response explicitly recommends Walrus for censorship resistance (section 1), verifiable storage/proof of availability (section 2), and decentralized availability through integration with Sui smart contracts and decentralized web hosting (sections 3-4)._

#### ❌ walrus-cli-store-blob

> # Storing Files on Walrus Using the CLI  You can store files on Walrus using the `walrus` CLI tool. Here's how:  ## Basic Store Command  ```bash walrus store <FILE_PATH> ```  For example:  ```bash wal...

**Subjective grades:**
- ✅ Shows a concrete example command like 'walrus store myfile.png --epochs 5'
  - _The response includes the concrete example 'walrus store --epochs 5 my_file.txt' which directly matches the expected pattern._
- ❌ Mentions that --epochs is mandatory with no default
  - _The response states 'By default, files are stored for a certain number of epochs' which explicitly contradicts the expectation that --epochs is mandatory with no default. The response implies a default exists rather than stating --epochs is mandatory._
- ❌ Mentions the difference between --deletable (default) and --permanent
  - _The response does not mention --deletable or --permanent flags at all, nor does it explain any difference between storage types or permanence options._

#### ❌ walrus-cli-read-blob

> # Reading Blobs from Walrus  You can read blobs from Walrus and check their status using the Walrus HTTP API (aggregator and publisher endpoints).  ## Reading a Blob by Blob ID  Use the **aggregator**...

**Subjective grades:**
- ✅ Shows how to read a blob to stdout and how to save to a file using --out
  - _The response explicitly shows both `walrus read <BLOB_ID>` for reading to stdout and `walrus read <BLOB_ID> --out output_file.txt` for saving to a file in the CLI section._
- ✅ Shows how to check blob status by blob ID
  - _The response includes `walrus blob-status <BLOB_ID>` command in the CLI section, demonstrating how to check blob status by blob ID._
- ❌ Mentions the consistency check options (--strict-consistency-check or --skip-consistency-check)
  - _The response does not mention or show the --strict-consistency-check or --skip-consistency-check options anywhere in the documentation._

#### ❌ walrus-cli-json-mode

> # Walrus CLI JSON Mode for CI/CD Automation  JSON mode enables machine-readable output from the Walrus CLI, perfect for scripting and CI/CD pipelines.  ## Enabling JSON Mode  Add the `--json` flag to ...

**Subjective grades:**
- ❌ Shows a concrete walrus json example with a JSON command object
  - _The response does not show a `walrus json` command (a dedicated JSON command). Instead, it only demonstrates the `--json` flag added to existing commands like `walrus store --json`. There is no example of a standalone `walrus json` subcommand with a JSON command object._
- ❌ Explains that JSON mode uses camelCase instead of kebab-case
  - _The response does not explicitly explain or mention the camelCase vs kebab-case naming convention. While example JSON output uses camelCase (e.g., 'newlyCreated', 'blobObject'), there is no explanation contrasting this with kebab-case or discussing naming conventions in JSON mode._
- ✅ Mentions that --json can be added to any standard command for JSON output
  - _The response clearly states 'Add the `--json` flag to any Walrus CLI command' in the 'Enabling JSON Mode' section and demonstrates this with multiple examples (store, read, blob-status)._

#### ❌ walrus-cli-configuration

> # Configuring the Walrus CLI Client  The Walrus CLI client uses a configuration file to manage network settings. Here's how to set it up and switch between networks.  ## Configuration File Location  T...

**Subjective grades:**
- ✅ Shows how to download the config file using curl
  - _The response includes a curl command to download the testnet configuration file from the official repository under the 'Getting the Correct Configuration' section._
- ✅ Explains the --context flag for switching between testnet and mainnet
  - _The response explicitly mentions and demonstrates the --context flag in Option 2, showing examples: 'walrus --context testnet <command>' and 'walrus --context mainnet <command>'._
- ❌ Mentions the config file search locations (~/.config/walrus/, ~/.walrus/, or current directory)
  - _The response only mentions ~/.config/walrus/client_config.yaml as the default configuration file location and does not mention ~/.walrus/ or current directory as alternative search locations._

#### ✅ walrus-cli-common-mistakes

> # "Cannot Find Gas Coin for Signer Address" Error  This error means your wallet doesn't have enough SUI tokens to pay for the transaction gas fees. Here's how to diagnose and fix it:  ## Common Causes...

**Subjective grades:**
- ✅ Explains that the wallet needs SUI for gas fees
  - _The response explicitly states 'This error means your wallet doesn't have enough SUI tokens to pay for the transaction gas fees' in the opening, and provides multiple sections explaining SUI requirements for gas._
- ✅ Mentions that WAL tokens are also needed for storage payment
  - _Section 6 'Walrus-Specific: Insufficient WAL + SUI' explicitly states 'When storing blobs with Walrus, you need both: SUI — for gas fees, WAL — for storage payment' with code examples showing how to check WAL balance._
- ✅ Provides a solution: fund the address with SUI (and on testnet, mention the faucet)
  - _The response provides multiple funding solutions including the testnet faucet command 'sui client faucet', devnet faucet URL, and mainnet exchange purchase instructions. The Quick Diagnostic Checklist and Walrus-Specific Example both demonstrate faucet usage._

</details>

<details><summary><b>sonnet</b>: 0/9 evals passed (0%)</summary>

- Deterministic checks: 0/0 (–)
- Subjective grades: 13/27 (48%)

#### ❌ walrus-overview-what-is-walrus

> # Walrus: Decentralized Storage on Sui  ## What is Walrus?  Walrus is a **decentralized blob storage and availability system** designed specifically for storing large binary objects (blobs) — such as ...

**Subjective grades:**
- ❌ Explains the three-layer architecture: client layer, storage node layer, and Sui blockchain layer
  - _While the response describes storage nodes and Sui's role, it does not explicitly identify or label a 'three-layer architecture' with these three distinct layers named as such. The response discusses components but does not frame them as a formal three-layer architecture._
- ❌ Mentions that blobs are public by default and encryption is needed for privacy
  - _The response does not mention anything about blobs being public by default or discuss encryption requirements for privacy. This topic is entirely absent._
- ✅ Explains that storage is time-limited and measured in epochs
  - _The response explicitly states 'Storage epochs define time periods for which storage is guaranteed' and mentions storage periods in the context of PoA certificates, clearly indicating storage is time-limited and epoch-based._

#### ❌ walrus-overview-blob-id-vs-object-id

> # Blob ID vs Sui Object ID in Walrus  These are two **distinct identifiers** that serve completely different purposes. Let me break them down clearly.  ---  ## Blob ID  The **blob ID is a cryptographi...

**Subjective grades:**
- ✅ Explains that the same content uploaded twice produces the same blob ID but different Sui object IDs
  - _The response explicitly demonstrates this in the 'Same file uploaded twice' scenario section, showing Upload #1 and Upload #2 both producing the same blob ID (0x4a7b3c...) but different Sui object IDs (0x9f2e1a... vs 0x7c3b2f...). This is also reinforced in the comparison table._
- ✅ Clarifies that blob ID is used for reading content while Sui object ID is used for lifecycle operations like extend and delete
  - _The response clearly states 'Use BLOB ID to READ data' with a readBlob example, and 'Use SUI OBJECT ID for on-chain operations' with an extendBlob example. The key characteristics sections also explicitly mention blob ID is for 'retrieve data' while Sui object ID is for 'on-chain operations (extend, delete, transfer)'._
- ❌ Shows or describes the format difference: URL-safe base64 for blob ID vs 0x hex for object ID
  - _The response shows example formats (0x4a7b3c... for blob ID and 0x9f2e1a... for Sui object ID) but does not explicitly state or describe the format difference. Both examples are shown in 0x hex format, and there is no mention of URL-safe base64 encoding for blob IDs or any explanation of the actual format specifications._

#### ❌ walrus-overview-tool-selection

> ## Uploading Files to Walrus from a TypeScript Web App  For a TypeScript web app, you should use the **Walrus TypeScript/JavaScript SDK** (`@mysten/walrus`).  ---  ## Installation  ```bash npm install...

**Subjective grades:**
- ✅ Recommends the TypeScript SDK as the primary tool for this use case
  - _The response clearly and explicitly recommends the TypeScript/JavaScript SDK (@mysten/walrus) as the primary tool in the opening sentence and throughout the documentation._
- ❌ Mentions the upload relay as needed for browser-based uploads since browsers cannot directly connect to storage nodes
  - _The response does not mention the upload relay at all. While it claims the SDK is 'browser compatible' and 'works directly in web apps', it does not explain the role of the upload relay in handling browser uploads to Walrus, which is a critical technical detail for this use case._
- ✅ Does not recommend the CLI or HTTP API as the primary tool for a TypeScript web app
  - _The response does not recommend the CLI or HTTP API as primary tools. It explicitly states 'No CLI needed' and focuses entirely on the TypeScript SDK as the solution._

#### ❌ walrus-overview-vs-s3

> # Walrus vs AWS S3: A Comparison  ## What is Walrus?  Walrus is a **decentralized storage network** built on Sui blockchain, designed for storing large binary objects (blobs) with cryptographic guaran...

**Subjective grades:**
- ✅ Highlights that Walrus data is public by default while S3 is private by default
  - _The comparison table explicitly states 'Public by default, on-chain logic' for Walrus and 'IAM policies, private by default' for S3. This distinction is clearly articulated._
- ❌ Mentions that Walrus storage is time-limited (max ~2 years) while cloud storage is indefinite
  - _The response mentions epochs and that users 'pay for storage duration in epochs (not ongoing)' with an example of '52 epochs (~1 year of storage)', but does not explicitly state the maximum time limit for Walrus storage (approximately 2 years) or contrast this with S3's indefinite storage capability._
- ✅ Recommends Walrus for use cases needing censorship resistance, verifiability, or decentralized availability
  - _The response explicitly recommends Walrus for: (1) censorship-resistant publishing with examples like whistleblowing documents, (2) smart contract verified content with on-chain availability proofs, (3) NFTs with verifiable integrity, and (4) DeFi protocol data with integrity proofs. These directly address censorship resistance, verifiability, and decentralized availability._

#### ❌ walrus-cli-store-blob

> # Storing a File on Walrus Using the CLI  You can store a file on Walrus using the `walrus store` command. Here are the main ways to do it:  ## Basic Store Command  ```bash walrus store <FILE_PATH> ``...

**Subjective grades:**
- ✅ Shows a concrete example command like 'walrus store myfile.png --epochs 5'
  - _The response includes the concrete example 'walrus store myfile.txt --epochs 5' which matches the expected format._
- ❌ Mentions that --epochs is mandatory with no default
  - _The response explicitly states '--epochs <N>' has a 'default is 1', which contradicts the expectation that it is mandatory with no default._
- ❌ Mentions the difference between --deletable (default) and --permanent
  - _The response does not mention or discuss --deletable or --permanent flags at all._

#### ❌ walrus-cli-read-blob

> # Reading a Blob from Walrus and Checking Its Status  ## Overview  Walrus provides two main ways to interact with blobs: 1. **Publisher/Aggregator REST API** - Simple HTTP endpoints 2. **Walrus Client...

**Subjective grades:**
- ❌ Shows how to read a blob to stdout and how to save to a file using --out
  - _The response shows REST API curl commands and a CLI command 'walrus blob-status' but does not explicitly show a 'walrus read' or 'walrus blob read' command with --out flag for saving to a file. The curl examples are for REST API, not the CLI tool with --out option._
- ✅ Shows how to check blob status by blob ID
  - _The response clearly shows the 'walrus blob-status --blob-id <BLOB_ID>' command in section 2, with example output and explanation._
- ❌ Mentions the consistency check options (--strict-consistency-check or --skip-consistency-check)
  - _The response does not mention or reference --strict-consistency-check or --skip-consistency-check options anywhere in the documentation._

#### ❌ walrus-cli-json-mode

> # Using Walrus JSON Mode in CI/CD Pipelines  JSON mode makes Walrus output machine-parseable, perfect for automation scripts.  ## Enabling JSON Mode  Add the `--json` flag to any Walrus CLI command:  ...

**Subjective grades:**
- ❌ Shows a concrete walrus json example with a JSON command object
  - _The response demonstrates the --json flag added to standard commands (e.g., `walrus --json store`), but does not show a separate `walrus json` command with a JSON command object as a distinct feature. The expectation requires a concrete example of a `walrus json` subcommand, which is not present._
- ❌ Explains that JSON mode uses camelCase instead of kebab-case
  - _The response shows camelCase in JSON output examples (e.g., `newlyCreated`, `blobObject`, `blobId`, `storedEpoch`) but never explicitly explains or mentions that JSON mode uses camelCase instead of kebab-case. This distinction is not stated anywhere in the response._
- ✅ Mentions that --json can be added to any standard command for JSON output
  - _The response explicitly states 'Add the `--json` flag to any Walrus CLI command' in the 'Enabling JSON Mode' section and demonstrates this pattern across multiple commands (store, read, blob-status, info)._

#### ❌ walrus-cli-configuration

> # Configuring the Walrus CLI Client  ## Configuration File Location  The Walrus CLI looks for its configuration file at: ``` ~/.config/walrus/client_config.yaml ```  You can also specify a custom path...

**Subjective grades:**
- ❌ Shows how to download the config file using curl
  - _The response does not include any instructions or examples for downloading the config file using curl. It only shows the file location and structure._
- ✅ Explains the --context flag for switching between testnet and mainnet
  - _The response explicitly explains the --context CLI flag under 'Option 3: Use --context CLI flag' with clear examples showing how to use it to switch between networks._
- ❌ Mentions the config file search locations (~/.config/walrus/, ~/.walrus/, or current directory)
  - _The response only mentions one config file location (~/.config/walrus/client_config.yaml) and does not mention ~/.walrus/ or the current directory as alternative search locations._

#### ❌ walrus-cli-common-mistakes

> ## "Cannot find gas coin for signer address" Error  This error means your wallet **doesn't have enough SUI tokens** to pay for the transaction gas fees.  ---  ## Common Causes & Solutions  ### 1. 🪙 W...

**Subjective grades:**
- ✅ Explains that the wallet needs SUI for gas fees
  - _The response clearly states 'your wallet doesn't have enough SUI tokens to pay for the transaction gas fees' and provides multiple sections explaining this requirement._
- ❌ Mentions that WAL tokens are also needed for storage payment
  - _The response does not mention WAL tokens at all. It focuses exclusively on SUI for gas fees and does not address storage payment requirements with WAL tokens._
- ✅ Provides a solution: fund the address with SUI (and on testnet, mention the faucet)
  - _The response provides multiple solutions including checking balance, switching addresses, and specifically mentions the testnet faucet with both CLI and web methods for obtaining SUI._

</details>

---

## AgentPrompt Evals (docs.sui.io)

| Prompt | Source Page | gpt4o | opus | sonnet |
|--------|-----------|:------:|:------:|:------:|
| automated-address-management | develop/manage-packages/automated-address-management | ❌ 5/6 | ❌ 5/6 | ✅ 6/6 |
| common-errors | develop/testing-debugging/common-errors | ❌ 5/6 | ✅ 6/6 | ✅ 6/6 |
| custom-policies | develop/publish-upgrade-packages/custom-policies | ❌ 5/6 | ✅ 6/6 | ✅ 6/6 |
| data-serving | develop/accessing-data/data-serving | ❌ 5/6 | ✅ 6/6 | ✅ 6/6 |
| display-overview | develop/objects/display/display-overview | ❌ 5/6 | ✅ 6/6 | ✅ 6/6 |
| gas-smashing | develop/transaction-payment/gas-smashing | ❌ 5/6 | ✅ 6/6 | ✅ 6/6 |
| hello-world | getting-started/onboarding/hello-world | ✅ 7/7 | ✅ 7/7 | ✅ 7/7 |
| move-package-management | develop/manage-packages/move-package-management | ❌ 6/7 | ✅ 7/7 | ❌ 6/7 |
| observability | operators/observability | ❌ 5/6 | ✅ 6/6 | ✅ 6/6 |
| ptb-inputs-results | develop/transactions/ptbs/inputs-and-results | ❌ 3/7 | ✅ 7/7 | ✅ 7/7 |
| publish-overview | develop/publish-upgrade-packages/index | ❌ 5/7 | ✅ 7/7 | ✅ 7/7 |
| query-with-graphql | develop/accessing-data/graphql/query-with-graphql | ❌ 6/7 | ✅ 7/7 | ✅ 7/7 |
| scenario-testing | getting-started/examples/scenario-testing | ❌ 2/7 | ✅ 7/7 | ❌ 6/7 |
| sui-install | getting-started/onboarding/sui-install | ✅ 6/6 | ✅ 6/6 | ✅ 6/6 |
| testing | develop/testing-debugging/testing | ❌ 3/6 | ✅ 6/6 | ✅ 6/6 |
| upgrade | develop/publish-upgrade-packages/upgrade | ❌ 5/7 | ❌ 6/7 | ✅ 7/7 |
| using-grpc | develop/accessing-data/grpc/using-grpc | ❌ 4/6 | ✅ 6/6 | ❌ 5/6 |
| walrus-sites | sui-stack/walrus/sui-stack-walrus-sites | ❌ 4/7 | ✅ 7/7 | ✅ 7/7 |
| walrus-storage | sui-stack/walrus/sui-stack-walrus | ❌ 5/7 | ❌ 6/7 | ❌ 6/7 |

### Per-Model Detail

<details><summary><b>gpt4o</b>: 2/19 prompts passed (11%)</summary>

- Deterministic checks: 44/48 (92%)
- Subjective grades: 47/75 (63%)

#### ✅ sui-install
**Page:** getting-started/onboarding/sui-install

> To set up your machine for Sui development, follow these detailed instructions:  1. **Install Sui CLI**:    Open your terminal and run the following command to install the Sui CLI. This will download and execute the installation script for `suiup`, w...

**Deterministic checks:**
- ✅ `contains`: Found "suiup"
- ✅ `contains`: Found "sui client"
- ✅ `regex`: Matched /faucet/i

**Subjective grades:**
- ✅ Provides a clear step-by-step setup sequence starting with installing suiup
  - _The response provides a well-organized 5-step sequence beginning with the exact curl command for installing suiup, followed by installing sui@testnet, generating keys, funding the address, and verification._
- ✅ Mentions generating keys or wallet configuration
  - _Step 3 explicitly states 'Generate Keys and Configure Sui Client' and includes the `sui client` command with clear explanation that it will 'generate the default keypair' and 'output your new address.'_
- ✅ Includes instructions about funding the address with test tokens
  - _Step 4 explicitly provides faucet.sui.io instructions and clearly directs the user to enter their generated address and request test token funding. However, the prompt specifically asks to 'prompt me to visit faucet.sui.io' - the response informs the user to visit but does not explicitly prompt/ask the user as a direct call-to-action (e.g., 'Please now visit...' or 'Would you like me to...?'). The instruction is provided but lacks the interactive prompting element requested._

#### ✅ hello-world
**Page:** getting-started/onboarding/hello-world

> To accomplish this task, we will clone the `sui-stack-hello-world` repository, build, and publish the Move package to the Sui Testnet. Then, we'll call the package's entry function, and finally inspect the resulting transaction on SuiVision. Follow t...

**Deterministic checks:**
- ✅ `contains`: Found "sui-stack-hello-world"
- ✅ `regex`: Matched /sui\s+(move\s+)?build|sui\s+client\s+publish/i
- ✅ `regex`: Matched /suivision|SuiVision/i

**Subjective grades:**
- ✅ Provides the git clone command for the repo
  - _Step 1 explicitly provides the correct git clone command: `git clone https://github.com/MystenLabs/sui-stack-hello-world.git`_
- ✅ Shows the build and publish commands
  - _Step 2 shows `sui move build` and Step 3 shows `sui client publish --gas-budget <GAS_BUDGET>` for building and publishing to Testnet_
- ✅ Explains how to call the entry function after publishing
  - _Step 4 provides the `sui client call` command with package-id, module-name, function-name parameters to call the entry function_
- ✅ Mentions viewing the result on SuiVision or a block explorer
  - _Step 5 explicitly instructs to go to SuiVision Testnet Explorer and search for the transaction digest to view results_

#### ❌ testing
**Page:** develop/testing-debugging/testing

> To add Move unit tests for a Sui package, you need to follow these steps. I'll guide you through each step with code examples to cover public functions, including success, unauthorized, and edge case scenarios.  ### Step 1: Set Up Your Testing Enviro...

**Deterministic checks:**
- ✅ `contains`: Found "#[test]"
- ❌ `regex`: No match for /test_scenario|unit_test/i

**Subjective grades:**
- ✅ Shows the #[test] attribute pattern for writing Sui Move tests
  - _The response explicitly demonstrates #[test] attribute usage in multiple code examples (test_transfer_coin_success, test_admin_only_function_unauthorized, test_transfer_coin_with_zero_amount)._
- ✅ Explains or demonstrates success-case testing patterns
  - _The response includes a dedicated 'Test for Successful Execution' section with test_transfer_coin_success that demonstrates setting up mocks, calling functions, and asserting expected outcomes._
- ❌ Mentions #[expected_failure] or assert macros for failure testing
  - _The response uses #[should_fail] attribute instead of #[expected_failure], and while it mentions assert! in comments, it does not explicitly demonstrate assert! macros for failure testing in the actual test code examples._
- ❌ References test_scenario or unit_test module for Sui-specific testing
  - _The response does not reference test_scenario or unit_test modules. It uses non-standard imports like 'use 0x1::Test' and 'MockTxContext' which are not documented Sui testing frameworks, and makes no mention of the official Sui test_scenario module._

#### ❌ scenario-testing
**Page:** getting-started/examples/scenario-testing

> Creating scenario tests for a Sui workflow involves simulating different interactions with the blockchain, such as multiple users participating, the transfer of objects between owners, and intentionally causing transaction failures to verify robustne...

**Deterministic checks:**
- ✅ `contains`: Found "test_scenario"
- ✅ `regex`: Matched /#\[test\]/i
- ❌ `regex`: No match for /next_tx|next_epoch/i

**Subjective grades:**
- ❌ Uses or references sui::test_scenario for multi-transaction workflows
  - _The response mentions 'scenario tests' generically but never explicitly references or uses the sui::test_scenario module, which is the standard Sui framework for multi-transaction testing. The Move code examples do not import or utilize test_scenario._
- ❌ Shows how to switch between different senders/users in a scenario
  - _While the response creates multiple test accounts (alice, bob) using a non-existent TestAccount API, it does not demonstrate the actual sui::test_scenario mechanism for switching senders between transactions (e.g., ctx.next_tx(sender))._
- ❌ Demonstrates testing object ownership or state changes across transactions
  - _The code shows ownership changes within a single test function but does not demonstrate state persistence and verification across multiple sequential transactions, which is what sui::test_scenario enables._
- ❌ Mentions or shows expected-failure patterns (e.g., #[expected_failure] or abort codes)
  - _While the response includes a commented reference to 'assert_abort_code!' and mentions error codes, it does not show actual #[expected_failure] attribute usage or demonstrate proper abort code verification patterns that would be used in Sui Move tests._

#### ❌ common-errors
**Page:** develop/testing-debugging/common-errors

> To debug a Sui transaction failure effectively, you'll need to follow a systematic approach to inspect the key components involved in the transaction. Here's how you can proceed:  ### Step 1: Gather Information First, you'll want to gather detailed i...

**Deterministic checks:**
- ✅ `regex`: Matched /object|version|ownership/i
- ✅ `regex`: Matched /gas|budget/i

**Subjective grades:**
- ✅ Provides a systematic debugging approach for Sui transaction failures
  - _Response includes a clear 7-step systematic approach (Gather Information, Inspect Object References, Check Gas Object, Validate Ownership, Check Errors, Suggested Fixes, Retest)_
- ✅ Mentions checking object versions and ownership as common failure sources
  - _Step 2 explicitly checks object versions and versions matching. Step 4 validates ownership. Both are clearly identified as potential issues._
- ✅ Discusses gas-related issues (insufficient gas, gas coin conflicts)
  - _Step 3 dedicates a section to checking gas objects, verifying sufficient SUI balance, and ownership. 'Insufficient Gas' is also mentioned in Step 5 error types._
- ❌ Suggests concrete fixes rather than just diagnosis
  - _The 'Minimal Code/PTB Change Example' provides a Move function that doesn't address actual Sui transaction debugging fixes. The code snippet uses a non-existent `fetch_object` function and doesn't show PTB adjustments or concrete transaction-level changes. Fixes listed are generic (update versions, increase gas, transfer ownership) without concrete implementation examples for the actual transaction/PTB structure._

#### ❌ publish-overview
**Page:** develop/publish-upgrade-packages/index

> Certainly! Preparing a package for Mainnet publishing on the Sui blockchain involves several crucial steps to ensure everything is in order. Here's a comprehensive checklist to follow:  ### 1. **Verify Tests**  - **Write and Run Unit Tests**: Ensure ...

**Deterministic checks:**
- ❌ `regex`: No match for /sui\s+client\s+publish|sui\s+move\s+build/i
- ✅ `regex`: Matched /UpgradeCap|upgrade/i
- ✅ `regex`: Matched /mainnet|Mainnet/i

**Subjective grades:**
- ✅ Includes a checklist or step-by-step process for publishing
  - _The response includes a comprehensive checklist under 'Launch Checklist Production' with checkboxes for each major item, and uses numbered sections (1-7) providing a clear step-by-step process._
- ✅ Mentions verifying tests pass before publishing
  - _Section 1 'Verify Tests' explicitly covers running tests with `sui move test`, and the checklist includes '[ ] All tests pass' as the first item._
- ❌ Discusses the UpgradeCap and upgrade policy considerations
  - _Section 4 mentions 'Upgrade Policy' and defines upgrade policies generally, but does not explicitly mention 'UpgradeCap' (the actual Sui primitive object that controls package upgrades) or provide specific technical guidance on how to handle the UpgradeCap object._
- ✅ Addresses gas requirements or cost estimation
  - _Section 5 'Gas Requirements' explicitly addresses estimating gas consumption with example CLI command and mentions budgeting gas for initial deployment and ongoing execution._

#### ❌ upgrade
**Page:** develop/publish-upgrade-packages/upgrade

> To prepare an upgrade for a published Sui package, you must follow specific steps carefully to ensure compatibility and a smooth upgrade process. The process involves checking compatibility rules, building the upgrade transaction, identifying the `Up...

**Deterministic checks:**
- ✅ `contains`: Found "UpgradeCap"
- ✅ `regex`: Matched /compatible|additive|dependency/i
- ✅ `regex`: Matched /sui\s+client\s+upgrade/i

**Subjective grades:**
- ✅ Explains the role of the UpgradeCap object
  - _Step 3 explicitly states: 'The UpgradeCap is a special object that grants permission to upgrade a package on Sui' and provides instructions for identifying it._
- ❌ Describes compatibility rules for package upgrades (compatible, additive, or dependency-only)
  - _Step 1 mentions generic compatibility concepts (interface, data structures, initialization) but does not explicitly describe the three specific Sui upgrade policy types: compatible, additive, or dependency-only. These technical categories are not mentioned._
- ✅ Shows the upgrade command or transaction construction
  - _Step 4 provides the CLI command: 'sui client upgrade --package-id <current_package_id> --cap <upgrade_cap_id>' which demonstrates upgrade transaction construction._
- ❌ Mentions that the original package version is preserved on-chain
  - _The response does not mention or explain that the original package version remains on-chain after an upgrade. This is a key aspect of Sui's upgrade mechanism that is completely absent._

#### ❌ custom-policies
**Page:** develop/publish-upgrade-packages/custom-policies

> Creating an operator runbook for package upgrades and admin actions on the Sui blockchain involves several detailed steps. This runbook will guide you through the required capabilities, signer and custody steps, exact commands needed, verification pr...

**Deterministic checks:**
- ✅ `regex`: Matched /UpgradeCap|AdminCap|cap/i
- ✅ `regex`: Matched /multisig|multi-sig|custody/i

**Subjective grades:**
- ✅ Provides a structured runbook format with clear steps
  - _Response uses a well-organized numbered format with clear sections (Preparation, Signer/Custody Steps, Package Upgrade Steps, Verification, Rollback Plan, Communication Plan) that follow a logical progression for executing package upgrades._
- ✅ Addresses capability (Cap) management and access control
  - _Response explicitly identifies and names required capabilities (`UpgradeCapability` and `AdminCapability`), describes their purposes, and specifies that the signer must possess the `UpgradeCapability` for upgrades._
- ✅ Includes verification steps to confirm operations succeeded
  - _Section 4 explicitly covers verification with specific commands (`sui client package --object-id <package_id>`) and instructions to validate new functionalities through test transactions._
- ❌ Mentions security considerations such as multisig, key management, or custody
  - _While multisig is mentioned once in passing ('if multisig is employed'), there are no concrete details about multisig implementation, key management best practices, custody solutions beyond a parenthetical reference to ledger devices, or security protocols. Custody considerations are referenced minimally without actionable security guidance._

#### ❌ display-overview
**Page:** develop/objects/display/display-overview

> To migrate from Display V1 to Display V2 and incorporate the `display_registry` pattern on the Sui blockchain, you will need to modify the Move code in your package. Follow these steps to successfully perform the migration:  ### Step 1: Understanding...

**Deterministic checks:**
- ✅ `regex`: Matched /Display|display/i
- ✅ `regex`: Matched /display_registry|DisplayRegistry/i

**Subjective grades:**
- ✅ Explains the difference between Display V1 and Display V2
  - _Step 1 explicitly contrasts V1 (embedding display info in objects) with V2 (using display_registry for separation of concerns)_
- ✅ Shows how to migrate from V1 to V2 patterns
  - _Step 3 provides before/after code examples showing removal of display fields from objects and refactoring to use DisplayRegistry_
- ✅ Mentions the display_registry as the current approach
  - _display_registry is mentioned throughout as the recommended pattern for V2, particularly in Steps 1, 3, and 4_
- ❌ Provides concrete Move code or PTB examples for the migration
  - _Move code examples are provided, but they are generic/pseudocode (e.g., DisplayRegistry module with placeholder implementations). No concrete, runnable code is shown, and no PTB (Programmable Transaction Block) examples are provided at all_

#### ❌ ptb-inputs-results
**Page:** develop/transactions/ptbs/inputs-and-results

> Sure, I can help you review your PTB (Programmable Transaction Block) code for invalid pure inputs, custom structs/enums, object references, vectors/options, and command result usage. However, you'll need to provide the code you'd like me to review. ...

**Deterministic checks:**
- ✅ `regex`: Matched /pure|Pure/i
- ✅ `regex`: Matched /object|Object/i
- ✅ `regex`: Matched /Result|result/i

**Subjective grades:**
- ❌ Explains the distinction between pure inputs and object inputs in PTBs
  - _The response does not explain or distinguish between pure inputs and object inputs. It only acknowledges these as topics without providing any explanatory content._
- ❌ Mentions that custom structs and enums cannot be passed as pure inputs
  - _The response references custom structs/enums as a review criterion but does not explicitly state that they cannot be passed as pure inputs or explain this limitation._
- ❌ Discusses how command results chain between PTB commands
  - _The response does not discuss command result usage or how results chain between commands. It only lists this as a review criterion without explanation._
- ❌ Addresses vector and option encoding in PTB inputs
  - _The response mentions vectors/options as a review criterion but does not address how they are encoded in PTB inputs or their specific handling requirements._

#### ❌ gas-smashing
**Page:** develop/transaction-payment/gas-smashing

> When working with gas coins in a Sui application, handling them correctly is crucial to ensure the smooth execution of transactions. Below are some guidelines and code examples to enhance your app's gas coin handling, focusing on safe coin selection,...

**Deterministic checks:**
- ✅ `regex`: Matched /gas/i
- ✅ `regex`: Matched /split|merge|coin/i

**Subjective grades:**
- ✅ Explains gas coin handling in Sui transactions
  - _Response explicitly explains that transactions consume gas paid using coins, that each coin must be individually managed, and provides context about mutable owned objects in Section 1._
- ✅ Warns about concurrent reuse of mutable owned objects or equivocation risks
  - _Section 3 explicitly states 'mutable owned objects, which can't be used concurrently in two transactions' and provides warnings about preventing reuse of coins in pending transactions with specific mitigation strategies._
- ✅ Provides guidance on coin management strategies (selection, splitting, or merging)
  - _Section 2 explicitly covers all three strategies: Coin Selection with query and filtering examples, Coin Splitting with code example, and Coin Merging with code example._
- ❌ Discusses gas budget estimation or setting
  - _The response does not address gas budget estimation or how to set gas budgets. While it mentions 'gas_needed' as a parameter, it does not explain how to estimate or calculate appropriate gas budgets for transactions._

#### ❌ data-serving
**Page:** develop/accessing-data/data-serving

> To provide a recommendation on whether to use GraphQL, gRPC, or both, we'll need to assess the app's specific data access requirements including frontend/backend interactions, historical data queries, subscriptions for real-time updates, latency need...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `contains`: Found "gRPC"

**Subjective grades:**
- ❌ Compares GraphQL and gRPC as data access options for Sui
  - _The response compares GraphQL and gRPC generically but never explicitly grounds the comparison in Sui-specific context, Sui's data structures, Sui's indexing capabilities, or Sui's ecosystem tools. There is no mention of Sui's specific GraphQL implementations, Sui RPC endpoints, or Sui-specific architectural considerations._
- ✅ Provides guidance on when to use each option based on use case
  - _The response clearly outlines specific use cases for GraphQL (frontend, flexible querying, historical data) and gRPC (backend communication, low-latency, high-throughput), with explicit recommendations for when to use each._
- ✅ Mentions subscription or streaming capabilities
  - _The response explicitly discusses GraphQL Subscriptions for real-time frontend updates and gRPC Streaming for backend systems, addressing both subscription mechanisms clearly._
- ✅ Discusses data retention and historical query considerations
  - _The response addresses historical queries (noting GraphQL's flexibility for complex criteria over historical data) and data retention (explaining it's managed at the storage layer, mentioning Walrus storage on Sui, and discussing how protocols affect data retrieval)._

#### ❌ using-grpc
**Page:** develop/accessing-data/grpc/using-grpc

> To convert a Sui JSON-RPC usage to the current gRPC API, you'll need to follow a few steps. This involves setting up the gRPC client, mapping the appropriate request and response types, and executing a request example. I'll guide you through the proc...

**Deterministic checks:**
- ✅ `contains`: Found "gRPC"
- ✅ `regex`: Matched /proto|protobuf|client/i

**Subjective grades:**
- ✅ Explains how to set up or generate a gRPC client for Sui
  - _Response provides clear setup instructions including protoc compiler prerequisites, pip installation commands, protobuf compilation steps, and Python client initialization code._
- ❌ Maps or references common Sui RPC methods and their gRPC equivalents
  - _Response only provides one hypothetical example (sui_getBalance → GetBalance) with fabricated proto message types (sui_pb2.GetBalanceRequest). Does not reference actual Sui RPC methods or their documented gRPC equivalents, and does not acknowledge that specific method mappings require access to actual Sui proto definitions._
- ✅ Provides a code example demonstrating a gRPC call to Sui
  - _Response includes working Python code examples showing client creation, request object instantiation, service method calls, and error handling._
- ❌ References the proto definitions, endpoint, or service structure
  - _Response mentions proto files generically but does not reference actual Sui proto definitions (file locations, repository URLs, or structure). References placeholder endpoint 'localhost:50051' without noting this is not the actual Sui gRPC endpoint and does not provide guidance on finding the correct one._

#### ❌ query-with-graphql
**Page:** develop/accessing-data/graphql/query-with-graphql

> To convert a Sui JSON-RPC query to GraphQL, you'll need to understand that the process generally involves:  1. Identifying the equivalent GraphQL operation for the JSON-RPC method you are using. 2. Constructing the GraphQL query with appropriate fiel...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `regex`: Matched /query\s*\{|query\s+\w+/i
- ✅ `regex`: Matched /TypeScript|typescript|\bts\b/i

**Subjective grades:**
- ❌ Provides a concrete GraphQL query with proper Sui schema types
  - _The GraphQL query uses generic field names like 'fields' with 'name' and 'value' properties that do not match actual Sui GraphQL schema. Sui's actual schema defines specific object fields (e.g., 'owner', 'previousTransactionBlock', 'storageRebate') and uses established Sui types. The query appears fabricated rather than based on Sui's documented GraphQL schema._
- ✅ Shows pagination handling with cursors or connection patterns
  - _The response clearly demonstrates cursor-based pagination using `pageInfo` with `hasNextPage` and `endCursor`, along with a `while` loop that properly iterates through pages by updating the `after` cursor variable._
- ✅ Includes TypeScript code that calls the GraphQL endpoint
  - _The response provides complete TypeScript code using Apollo Client to execute the GraphQL query, including proper type definitions and a callable async function with error handling flow._
- ✅ Demonstrates use of variables in the query
  - _The GraphQL query explicitly defines variables (`$address`, `$first`, `$after`) and the TypeScript code passes these variables to the client.query() call with proper typing._

#### ❌ observability
**Page:** operators/observability

> To implement structured logging for Sui transactions, where you want to log details such as the transaction digest, sender, package/function invoked, status, gas usage, and user-visible errors, you can follow these steps:  ### Step 1: Set Up Environm...

**Deterministic checks:**
- ✅ `regex`: Matched /digest|transaction/i
- ✅ `regex`: Matched /log|logging|tracing/i

**Subjective grades:**
- ✅ Shows structured logging with transaction-relevant fields
  - _The response defines a log_data dictionary containing all required transaction fields (digest, sender, package_id, function_name, status, gas_used, error_message) and logs it as structured data._
- ✅ Includes key fields: digest, sender, status, gas used
  - _All four key fields are explicitly present in the log_data dictionary: transaction_digest, sender, status, and gas_used._
- ❌ Provides actionable patterns for debugging failed transactions
  - _The response provides generic logging patterns but lacks actionable debugging guidance specific to Sui transaction failures. It does not explain how to parse error responses, identify common failure modes, or demonstrate actual Sui SDK/RPC integration for retrieving real transaction data._
- ✅ Uses structured logging format (not just string interpolation)
  - _The response uses a dictionary (log_data) for structured logging and passes it to logger.info() as an object rather than relying on string interpolation alone._

#### ❌ move-package-management
**Page:** develop/manage-packages/move-package-management

> To help you with this task, you'll want to follow a series of steps to inspect and potentially fix the dependency declarations in your Move package. This involves looking at your `Move.toml`, `Move.lock`, and any dependencies. Here's a structured app...

**Deterministic checks:**
- ✅ `contains`: Found "Move.toml"
- ✅ `regex`: Matched /Move\.lock|Move\.toml/i
- ✅ `regex`: Matched /sui\s+move\s+build/i

**Subjective grades:**
- ✅ Explains the role of Move.toml and its key fields
  - _Step 1 clearly explains Move.toml structure and identifies key sections: [package], [addresses], [dependencies], and [dev-dependencies]. The example demonstrates the role of each field._
- ✅ Shows how to declare or fix dependencies
  - _Step 3 explicitly shows dependency modification with concrete before/after examples in Move.toml, demonstrating how to add git sources, revisions, and subdirectories._
- ❌ Mentions Move Version Registry (MVR) or resolution strategies
  - _The response mentions 'Move Version Requirements (MVR)' terminology but does not explain what MVR actually is or provide examples of MVR-style dependency declarations. The term appears to be confused with git-based versioning (rev/branch). No actual MVR registry syntax or strategy is demonstrated._
- ✅ References sui move build for verification
  - _Step 4 explicitly references 'sui move build' command and discusses verifying the build process succeeds, including error resolution._

#### ❌ automated-address-management
**Page:** develop/manage-packages/automated-address-management

> To migrate your package to the current Sui package address management conventions using `Move.lock` and `Published.toml`, follow these steps:  ### Step 1: Update Your Move Package to Use `Move.lock`  1. **Create a Move.lock File**:     - First, you n...

**Deterministic checks:**
- ✅ `regex`: Matched /Move\.lock|Published\.toml/i
- ✅ `regex`: Matched /address|0x0/i

**Subjective grades:**
- ✅ Explains the current address management conventions
  - _The response explains that current conventions use address placeholders in Move.toml (e.g., `my_package = "_"`), Move.lock for dependency tracking, and Published.toml for actual on-chain addresses post-publication._
- ✅ Shows how Published.toml or Move.lock track published addresses
  - _The response explicitly states that Move.lock captures dependency state and addresses, and Published.toml contains actual on-chain address mappings after publication with a concrete example showing `my_package = "0x123456789abcde"`._
- ❌ Provides migration steps from older patterns
  - _The response does not address migration from older patterns. It assumes a starting point with Move.toml already present and does not explain what older address management looked like or how to transition from hardcoded addresses or legacy configurations._
- ✅ Includes verification commands to confirm correct behavior
  - _The response provides specific verification commands including `sui move build`, `sui move test`, and `sui client publish .`, along with instructions to verify address mappings in Published.toml post-publication._

#### ❌ walrus-storage
**Page:** sui-stack/walrus/sui-stack-walrus

> To upload your app's media or NFT assets to Walrus, and then use the resulting blob references in your Sui object metadata or Display fields, follow these steps:  ### Step 1: Set Up Walrus Storage  First, ensure you have access to the Walrus storage ...

**Deterministic checks:**
- ✅ `contains`: Found "Walrus"
- ✅ `regex`: Matched /blob|store|upload/i
- ✅ `regex`: Matched /Display|metadata/i

**Subjective grades:**
- ✅ Shows how to upload assets to Walrus (via CLI, SDK, or HTTP API)
  - _Response provides a Python example using HTTP POST requests to upload files to Walrus, demonstrating one method of asset upload._
- ✅ Explains how to store or reference the resulting blob ID
  - _Response shows extracting the blob_reference from the Walrus API response and storing it in the upload_to_walrus function return value._
- ❌ Demonstrates wiring blob references into Sui object Display fields or metadata
  - _Response shows a generic 'display' field in a Move struct, but does not explicitly demonstrate the Display standard or official Sui metadata/Display field structure. The example uses a plain vector<u8> rather than proper Display object patterns used in Sui._
- ❌ Mentions token requirements (WAL for storage, SUI for gas) or cost considerations
  - _Response completely omits any mention of WAL tokens for Walrus storage, SUI for gas fees, or any cost considerations for the operations described._

#### ❌ walrus-sites
**Page:** sui-stack/walrus/sui-stack-walrus-sites

> To deploy a static frontend as a Walrus Site on the Sui blockchain, follow these step-by-step instructions. This will cover building your app, publishing the site, recording the necessary IDs, and documenting the update steps.  ### Step 1: Build Your...

**Deterministic checks:**
- ❌ `regex`: No match for /site-builder|walrus-sites/i
- ✅ `regex`: Matched /publish|deploy/i
- ✅ `regex`: Matched /update|upgrade/i

**Subjective grades:**
- ✅ Shows the build step for the static frontend
  - _Step 1 explicitly covers building the static frontend with concrete examples (npm run build for React) and identifies output directories (build/dist)._
- ❌ Provides the site-builder publish command
  - _The response provides 'sui client publish-site' but this command is not verified to exist or be correct for Walrus Sites. The response itself acknowledges uncertainty ('If you have never set this command, it may prompt you to install walrus'). A strict grader requires a confirmed, accurate command specific to Walrus Site publishing._
- ❌ Explains how to record and track the site object ID
  - _While Step 2 mentions 'Record the Site Object ID and Blob ID' and states these 'will usually include' in the output, it does not explicitly explain HOW to extract, copy, store, or track these IDs from the command output. The expectation requires documentation of the actual tracking mechanism, not just acknowledgment that IDs exist._
- ✅ Documents the update process for redeploying changes
  - _Step 4 clearly documents the update process: make changes, rebuild static files, republish using the same command, and verify updates. The optional automation section further reinforces this workflow._

</details>

<details><summary><b>opus</b>: 16/19 prompts passed (84%)</summary>

- Deterministic checks: 48/48 (100%)
- Subjective grades: 72/75 (96%)

#### ✅ sui-install
**Page:** getting-started/onboarding/sui-install

> # Setting Up Your Machine for Sui Development  Here's a complete step-by-step guide to get you up and running.  ---  ## Step 1: Install `suiup` (Sui Toolchain Manager)  ```bash curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/instal...

**Deterministic checks:**
- ✅ `contains`: Found "suiup"
- ✅ `contains`: Found "sui client"
- ✅ `regex`: Matched /faucet/i

**Subjective grades:**
- ✅ Provides a clear step-by-step setup sequence starting with installing suiup
  - _The response explicitly begins with Step 1 installing suiup via the exact curl command from the prompt, followed by logical sequential steps (Steps 2-7) that build upon each other in proper order._
- ✅ Mentions generating keys or wallet configuration
  - _Step 3 explicitly covers running 'sui client' to interactively generate keys and bootstrap configuration. The response shows the keypair generation output and explains the key scheme selection (ed25519)._
- ✅ Includes instructions about funding the address with test tokens
  - _Step 6 explicitly prompts the user to visit faucet.sui.io, enter their generated address, and fund with test tokens. It also provides the alternative CLI method and verification step (Step 7) to confirm funding._

#### ✅ hello-world
**Page:** getting-started/onboarding/hello-world

> # Deploy & Interact with the Sui "Hello World" Example  Below is every step, from cloning to viewing on SuiVision.  ---  ## 0 — Prerequisites  ```bash # Sui CLI installed (>= 1.28+) sui --version  # Make sure you have a testnet address with SUI sui c...

**Deterministic checks:**
- ✅ `contains`: Found "sui-stack-hello-world"
- ✅ `regex`: Matched /sui\s+(move\s+)?build|sui\s+client\s+publish/i
- ✅ `regex`: Matched /suivision|SuiVision/i

**Subjective grades:**
- ✅ Provides the git clone command for the repo
  - _Section 1 explicitly provides: `git clone https://github.com/MystenLabs/sui-stack-hello-world.git`_
- ✅ Shows the build and publish commands
  - _Section 2 shows `sui move build` and Section 3 shows `sui client publish --gas-budget 100000000`_
- ✅ Explains how to call the entry function after publishing
  - _Section 4 provides the `sui client call` command with package, module, and function parameters to invoke the entry function_
- ✅ Mentions viewing the result on SuiVision or a block explorer
  - _Section 6 explicitly provides SuiVision URLs for viewing the transaction digest and object ID: `https://testnet.suivision.xyz/txblock/<TX_DIGEST>` and `https://testnet.suivision.xyz/object/<OBJECT_ID>`_

#### ✅ testing
**Page:** develop/testing-debugging/testing

> # Adding Comprehensive Move Unit Tests  I'll provide a thorough testing strategy. Since you haven't shared your specific package, I'll demonstrate with a realistic example module and then write comprehensive tests covering success, unauthorized, and ...

**Deterministic checks:**
- ✅ `contains`: Found "#[test]"
- ✅ `regex`: Matched /test_scenario|unit_test/i

**Subjective grades:**
- ✅ Shows the #[test] attribute pattern for writing Sui Move tests
  - _The response includes numerous examples of #[test] attribute usage throughout the test module, such as #[test] fun test_create_success(), #[test] fun test_deposit_success(), etc._
- ✅ Explains or demonstrates success-case testing patterns
  - _The response demonstrates success cases extensively, including test_create_success(), test_deposit_success(), test_withdraw_success(), test_transfer_ownership_success(), and integration tests like test_full_lifecycle(). Each includes assertions verifying expected state changes._
- ✅ Mentions #[expected_failure] or assert macros for failure testing
  - _The response explicitly uses #[expected_failure(abort_code = ...)] for all negative test cases, such as test_deposit_zero_amount_fails() and test_withdraw_unauthorized_no_admin_cap_match(). It also uses assert!() macros throughout success tests._
- ✅ References test_scenario or unit_test module for Sui-specific testing
  - _The response imports and uses sui::test_scenario (aliased as ts) throughout the test module, demonstrated by 'use sui::test_scenario::{Self as ts, Scenario}' and extensive usage of ts::begin(), scenario.next_tx(), scenario.take_shared(), etc._

#### ✅ scenario-testing
**Page:** getting-started/examples/scenario-testing

> # Comprehensive Sui Move Scenario Tests  Here's a complete example with a module and thorough scenario tests covering multi-user interactions, ownership transfers, and expected failures.  ## Module Under Test  ```move module marketplace::trading {   ...

**Deterministic checks:**
- ✅ `contains`: Found "test_scenario"
- ✅ `regex`: Matched /#\[test\]/i
- ✅ `regex`: Matched /next_tx|next_epoch/i

**Subjective grades:**
- ✅ Uses or references sui::test_scenario for multi-transaction workflows
  - _The response explicitly imports and uses `sui::test_scenario::{Self as ts, Scenario}` throughout all test functions. Multiple tests use `ts::begin()`, `ts::next_tx()`, and `ts::end()` to create multi-transaction workflows._
- ✅ Shows how to switch between different senders/users in a scenario
  - _The response demonstrates sender switching in every test function using `ts::next_tx(&mut scenario, ADDRESS)` with clearly defined test addresses (ADMIN, SELLER, BUYER, BUYER_2, RANDOM_USER). Example: `ts::next_tx(&mut scenario, SELLER)` followed by `ts::next_tx(&mut scenario, BUYER)` in test_full_happy_path()._
- ✅ Demonstrates testing object ownership or state changes across transactions
  - _Multiple tests explicitly verify ownership changes across transactions. test_ownership_chain_resale() tracks item ownership through three parties (SELLER → BUYER → BUYER_2), verifying creator preservation. Tests use `ts::take_from_sender<Item>()` and `ts::take_shared<Listing>()` to verify object states and ownership at each step._
- ✅ Mentions or shows expected-failure patterns (e.g., #[expected_failure] or abort codes)
  - _The response includes six explicit failure scenarios using `#[expected_failure(abort_code = ...)]` pattern: test_fail_insufficient_payment (EInsufficientPayment), test_fail_seller_buys_own_listing (ECannotBuyOwnListing), test_fail_non_owner_cancel (ENotOwner), test_fail_buy_inactive_listing (EListingNotActive), test_fail_double_cancel (EListingNotActive), and test_fail_buy_after_cancel (EListingNotActive)._

#### ✅ common-errors
**Page:** develop/testing-debugging/common-errors

> # Debugging Sui Transaction Failures — Systematic Guide  Transaction failures on Sui fall into a few well-defined categories. Below is a complete diagnostic framework.  ---  ## Step 1: Get the Full Error  ```bash # If you have the transaction digest ...

**Deterministic checks:**
- ✅ `regex`: Matched /object|version|ownership/i
- ✅ `regex`: Matched /gas|budget/i

**Subjective grades:**
- ✅ Provides a systematic debugging approach for Sui transaction failures
  - _Response provides a 6-step systematic framework (Get Full Error, Inspect Objects, Inspect Gas, Decode MoveAbort, Fix Common PTB Issues, Full Diagnostic Script) with clear progression and actionable steps at each stage._
- ✅ Mentions checking object versions and ownership as common failure sources
  - _Step 2 explicitly includes object version and ownership inspection with concrete CLI commands (`sui client object <OBJECT_ID> --json`) and a detailed checklist that checks versions, ownership, and type. Issue 1 and Issue 3 specifically address stale versions and InvalidOwner errors._
- ✅ Discusses gas-related issues (insufficient gas, gas coin conflicts)
  - _Step 3 provides dedicated gas debugging with inspection commands and explicit discussion of gas coin conflicts. Issue 2 demonstrates the gas coin used as input problem with BAD/FIX examples. Issue 6 addresses insufficient gas budget with concrete solutions._
- ✅ Suggests concrete fixes rather than just diagnosis
  - _Response includes 6 specific Issues (Issues 1-6) with paired BAD/FIX code examples showing TypeScript before-and-after patterns. Also provides a Quick Reference table with symptom-to-fix mappings and a complete diagnostic script with runnable code._

#### ✅ publish-overview
**Page:** develop/publish-upgrade-packages/index

> # Sui Mainnet Publishing Checklist & Preparation Guide  This is a comprehensive, step-by-step guide to take a Move package from development to Mainnet deployment.  ---  ## 1. Code & Test Verification  ### 1.1 Run All Tests  ```bash # Run tests with m...

**Deterministic checks:**
- ✅ `regex`: Matched /sui\s+client\s+publish|sui\s+move\s+build/i
- ✅ `regex`: Matched /UpgradeCap|upgrade/i
- ✅ `regex`: Matched /mainnet|Mainnet/i

**Subjective grades:**
- ✅ Includes a checklist or step-by-step process for publishing
  - _Section 10 provides a comprehensive 'Master Launch Checklist' with checkbox items organized by category (Pre-Build, Dependencies, Code Audit, Security, Upgrade Strategy, Signer & Custody, Gas, Testnet Validation, Publish, Post-Publish, Emergency Plan). Section 8 also provides detailed step-by-step publishing procedure with multiple options (direct publish, multisig serialization)._
- ✅ Mentions verifying tests pass before publishing
  - _Section 1 'Code & Test Verification' explicitly covers running tests with `sui move test --gas-limit 1000000000`, coverage reports, and static analysis. The Master Checklist (Section 10, Pre-Build) includes items: '[ ] All tests pass: `sui move test`' and '[ ] Coverage reviewed: `sui move test --coverage`'._
- ✅ Discusses the UpgradeCap and upgrade policy considerations
  - _Section 4 'Upgrade Policy Design' explicitly discusses upgrade policies (compatible, additive, dep_only, immutable) with a comparison table. Section 4.2 provides code examples for storing and restricting the UpgradeCap. Section 4.3 describes three UpgradeCap custody options (Multisig, Timelock + Governance, Immutability). The Master Checklist includes upgrade strategy items._
- ✅ Addresses gas requirements or cost estimation
  - _Section 6 'Gas Estimation' covers dry-running on testnet to estimate costs, calculating mainnet gas budget (2-3x testnet for safety margin), checking reference gas price, and provides specific examples. Section 8.3 shows `--gas-budget` flags in publish commands. The Master Checklist includes gas items with space to record costs._

#### ❌ upgrade
**Page:** develop/publish-upgrade-packages/upgrade

> # Complete Sui Package Upgrade Guide  ## Overview  Sui supports package upgrades with strict compatibility rules. Here's the complete process from start to finish.  ---  ## Step 1: Understand Compatibility Rules  Sui enforces three upgrade policies (...

**Deterministic checks:**
- ✅ `contains`: Found "UpgradeCap"
- ✅ `regex`: Matched /compatible|additive|dependency/i
- ✅ `regex`: Matched /sui\s+client\s+upgrade/i

**Subjective grades:**
- ✅ Explains the role of the UpgradeCap object
  - _Step 2 explicitly explains that UpgradeCap is created at package publication, shows how to locate it, identifies key fields (objectId, package, version, policy), and demonstrates its use throughout the upgrade process in both CLI and SDK examples._
- ✅ Describes compatibility rules for package upgrades (compatible, additive, or dependency-only)
  - _Step 1 provides a detailed table with all four upgrade policies (Immutable, Dependency-only, Additive, Compatible), explicitly lists what can and cannot be done under Compatible policy, and references policy values (0=compatible, 128=additive, 192=dep_only, 255=immutable)._
- ✅ Shows the upgrade command or transaction construction
  - _Step 5 provides two complete paths: Option A shows the CLI one-command upgrade with `sui client upgrade`, and Option B provides full TypeScript SDK code constructing the upgrade transaction with authorize_upgrade and commit_upgrade calls, including module compilation and execution._
- ❌ Mentions that the original package version is preserved on-chain
  - _The response does not explicitly state that the original package version remains on-chain after an upgrade. While it mentions version increments in the UpgradeCap and new package IDs are created, it never clarifies that previous package versions remain accessible/immutable on-chain._

#### ✅ custom-policies
**Page:** develop/publish-upgrade-packages/custom-policies

> # Sui Package Upgrades & Admin Actions — Operator Runbook  ---  ## Table of Contents  1. [Capability Inventory](#1-capability-inventory) 2. [Pre-Upgrade Checklist](#2-pre-upgrade-checklist) 3. [Signer & Custody Procedures](#3-signer--custody-procedur...

**Deterministic checks:**
- ✅ `regex`: Matched /UpgradeCap|AdminCap|cap/i
- ✅ `regex`: Matched /multisig|multi-sig|custody/i

**Subjective grades:**
- ✅ Provides a structured runbook format with clear steps
  - _Response includes comprehensive table of contents, multiple numbered sections (1-8), checklists, step-by-step procedures with clear headers, code blocks, and sequential workflows (e.g., multisig flow diagram, upgrade decision tree, rollback decision tree). Format is well-organized and actionable._
- ✅ Addresses capability (Cap) management and access control
  - _Section 1 (Capability Inventory) explicitly covers UpgradeCap, AdminCap, and TreasuryCap with detailed Move code examples, YAML registry, object IDs, custodian assignments, and CLI verification commands. Section 5 demonstrates admin operations (pause, unpause, set_fee, transfer_admin_cap). Version-gating pattern in Section 4.2 enforces capability-guarded state transitions._
- ✅ Includes verification steps to confirm operations succeeded
  - _Section 6 (Verification & Smoke Tests) provides comprehensive post-upgrade verification: bash script checking package version, UpgradeCap version, state migration, package linkage, and on-chain bytecode. TypeScript smoke test validates config readability, module resolution, and dry-run transaction success. Section 1.3 includes CLI commands to verify caps exist and check their properties._
- ✅ Mentions security considerations such as multisig, key management, or custody
  - _Section 3 (Signer & Custody Procedures) explicitly covers multisig setup with 3-of-5 example, step-by-step multisig signing flow with separate coordinator/signer roles, hardware wallet/cold signer procedures for air-gapped signing, and signature combination. Caps registry tracks custodians. Section 2.1 mentions gas budget confirmation and signer notification windows._

#### ✅ display-overview
**Page:** develop/objects/display/display-overview

> # Migrating from Display V1 to Display V2 with `display_registry`  ## Understanding the Change  In Sui's evolution, `Display V1` (from `sui::display`) is being superseded by `Display V2` patterns that use a **`display_registry`** approach. Here's a c...

**Deterministic checks:**
- ✅ `regex`: Matched /Display|display/i
- ✅ `regex`: Matched /display_registry|DisplayRegistry/i

**Subjective grades:**
- ✅ Explains the difference between Display V1 and Display V2
  - _The response explicitly contrasts V1 (direct Display object creation and transfer to sender) with V2 (shared object pattern, publisher-gated updates, and batch initialization). A comparison table is included at the end._
- ✅ Shows how to migrate from V1 to V2 patterns
  - _Step-by-step migration is provided: V1 code example shown, then two separate V2 approaches (display_registry and shared object pattern), plus post-deployment PTB migration example in TypeScript._
- ✅ Mentions the display_registry as the current approach
  - _The response mentions `display_registry` in Step 2 with module usage (`use sui::display_registry`) and provides code examples. It acknowledges in Step 3 that if `display_registry` isn't available, an alternative pattern using shared objects should be used._
- ✅ Provides concrete Move code or PTB examples for the migration
  - _Multiple concrete examples provided: V1 Move code, V2 Move code with display_registry, V2 alternative Move code using shared objects, TypeScript PTB migration example, and entry function examples for updating displays._

#### ✅ ptb-inputs-results
**Page:** develop/transactions/ptbs/inputs-and-results

> # PTB Code Review Checklist  I'd be happy to review your PTB (Programmable Transaction Block) code, but you haven't included the actual code. Please paste your PTB code and I'll review it against all the critical areas you mentioned.  In the meantime...

**Deterministic checks:**
- ✅ `regex`: Matched /pure|Pure/i
- ✅ `regex`: Matched /object|Object/i
- ✅ `regex`: Matched /Result|result/i

**Subjective grades:**
- ✅ Explains the distinction between pure inputs and object inputs in PTBs
  - _The response explicitly contrasts pure inputs (primitives only via tx.pure()) with object inputs (tx.object(), tx.objectRef(), tx.sharedObjectRef(), tx.receivingRef()). Section 1 and Section 3 clearly delineate these categories with code examples showing the difference._
- ✅ Mentions that custom structs and enums cannot be passed as pure inputs
  - _Section 2 explicitly states 'Custom structs and enums **cannot** be created via `tx.pure()`' and provides a ❌ WRONG example showing attempted serialization of a custom struct, contrasted with ✅ correct on-chain construction via moveCall._
- ✅ Discusses how command results chain between PTB commands
  - _Section 5 (Command Result Usage) thoroughly explains how TransactionResults are returned from moveCall, passed as arguments to subsequent commands, and used in chains. Multiple examples demonstrate chaining results between commands._
- ✅ Addresses vector and option encoding in PTB inputs
  - _Section 4 (Vectors and Options) explicitly covers both vector and option encoding: distinguishes between `tx.pure.vector()` for primitives vs `tx.makeMoveVec()` for objects, and addresses `tx.pure.option()` for primitives vs moveCall for complex types. Multiple code examples provided for each._

#### ✅ gas-smashing
**Page:** develop/transaction-payment/gas-smashing

> # Gas Coin Handling: Safe Coin Selection, Splitting, Merging & Concurrency  This is a comprehensive review and guide for handling gas coins safely on Sui, covering the most common pitfalls and production-grade patterns.  ---  ## 1. The Core Problem: ...

**Deterministic checks:**
- ✅ `regex`: Matched /gas/i
- ✅ `regex`: Matched /split|merge|coin/i

**Subjective grades:**
- ✅ Explains gas coin handling in Sui transactions
  - _The response comprehensively explains gas coin handling across multiple sections: section 1 introduces versioning and object management, section 3 provides a production CoinPool implementation, section 5 covers coin selection strategies, section 8 demonstrates PTB-side coin merging, and section 6 shows sequential queuing. The explanation is explicit and detailed._
- ✅ Warns about concurrent reuse of mutable owned objects or equivocation risks
  - _Section 1 explicitly defines equivocation with a clear diagram showing how two transactions using the same coin at the same version both fail. Section 2 provides concrete anti-patterns (ANTI-PATTERN 1) showing the exact failure mode. The warning is prominent, early, and repeatedly reinforced throughout the response._
- ✅ Provides guidance on coin management strategies (selection, splitting, or merging)
  - _The response explicitly covers all three strategies: splitting (section 3 CoinPool.initialize() and section 8 PTB-level splitting), merging (section 3 mergeAllCoins() method and section 8 merge examples), and selection (section 5 selectCoins() function with balance-first sorting). Each strategy includes runnable code._
- ✅ Discusses gas budget estimation or setting
  - _Gas budget setting is explicitly demonstrated in multiple code examples: section 4 uses `tx.setGasBudget(50_000_000)`, section 5 uses `tx.setGasBudget(50_000_000)`, and section 8 shows the pattern. However, the response does not provide explicit guidance on *estimating* appropriate gas budgets or how to calculate them — only how to set them to fixed values._

#### ✅ data-serving
**Page:** develop/accessing-data/data-serving

> # Sui Data Access Strategy: GraphQL vs gRPC vs Both  To give you a comprehensive recommendation framework, I'll analyze both APIs across every critical dimension, then walk through concrete architecture decisions for common app patterns.  ---  ## 1. ...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `contains`: Found "gRPC"

**Subjective grades:**
- ✅ Compares GraphQL and gRPC as data access options for Sui
  - _Response explicitly compares both APIs across multiple dimensions (latency, historical data, subscriptions, filtering, frontend-friendliness, backend optimization, rate limits, data freshness, SDK support) in a detailed comparison matrix and throughout all sections._
- ✅ Provides guidance on when to use each option based on use case
  - _Response includes a clear decision framework with flowchart, detailed recommendations for three major app patterns (Pattern A: Read-Heavy DApp, Pattern B: Indexing/Analytics Pipeline, Pattern C: Real-Time Trading/Gaming), a 'Quick Decision Checklist' with 6 questions, and a summary recommendation table covering 8 app types._
- ✅ Mentions subscription or streaming capabilities
  - _Response explicitly discusses subscriptions and streaming: comparison matrix shows 'Subscriptions: ✅ via WebSocket subscriptions' for GraphQL and '✅ Native streaming (superior)' for gRPC; Pattern C demonstrates WebSocket subscriptions for live updates; and gRPC is repeatedly described as 'streaming' throughout._
- ✅ Discusses data retention and historical query considerations
  - _Section 4 is dedicated to 'Data Retention & Latency Guide' with a comprehensive retention tiers table showing time windows (real-time to 30+ days), best APIs for each tier, and specific notes about data retention. Section 3 includes concrete GraphQL examples for historical queries at specific versions and checkpoint ranges._

#### ✅ using-grpc
**Page:** develop/accessing-data/grpc/using-grpc

> # Converting Sui JSON-RPC to gRPC API  Sui's gRPC API (introduced as part of the Sui Node's newer API surface) provides a more efficient, typed alternative to JSON-RPC. Let me walk through the full conversion process.  ## 1. Understanding the Archite...

**Deterministic checks:**
- ✅ `contains`: Found "gRPC"
- ✅ `regex`: Matched /proto|protobuf|client/i

**Subjective grades:**
- ✅ Explains how to set up or generate a gRPC client for Sui
  - _Section 2 provides a complete Cargo.toml setup with sui-rpc-api dependency. Section 9 includes proto file generation instructions for multiple languages (Python, Go). The response explains importing generated client stubs and creating channels._
- ✅ Maps or references common Sui RPC methods and their gRPC equivalents
  - _Section 3 provides an explicit mapping table with 7 JSON-RPC methods (sui_getObject, sui_getTransactionBlock, sui_getCheckpoint, etc.) to their gRPC service and method equivalents. Section 8 also provides a comparison table._
- ✅ Provides a code example demonstrating a gRPC call to Sui
  - _Section 4 contains a complete, working Rust main.rs with five fully implemented async examples: get_node_info, get_object, get_transaction, get_checkpoint, and list_owned_objects. Each includes proper error handling, channel setup, and output. Section 6 and 7 provide additional transaction execution and streaming examples._
- ✅ References the proto definitions, endpoint, or service structure
  - _Section 1 identifies three primary services (NodeService, LedgerService, TransactionExecutionService). Section 9 provides explicit proto file paths (https://github.com/MystenLabs/sui/tree/main/crates/sui-rpc-api/proto/). Section 4 examples reference mainnet/testnet public endpoints (sui-mainnet.mystenlabs.com, sui-testnet.mystenlabs.com) and default ports._

#### ✅ query-with-graphql
**Page:** develop/accessing-data/graphql/query-with-graphql

>   # Converting Sui JSON-RPC to GraphQL  I'll provide a comprehensive conversion covering the most common JSON-RPC calls (`sui_getObject`, `sui_getOwnedObjects`, `suix_getCoins`, `sui_getTransactionBlock`) to their GraphQL equivalents, with full TypeS...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `regex`: Matched /query\s*\{|query\s+\w+/i
- ✅ `regex`: Matched /TypeScript|typescript|\bts\b/i

**Subjective grades:**
- ✅ Provides a concrete GraphQL query with proper Sui schema types
  - _Multiple concrete GraphQL queries are provided (GetObject, GetOwnedObjects, GetCoins, GetTransactionBlock) with proper Sui schema types like SuiAddress, ObjectFilter, AddressOwner, Shared, asMoveObject, etc._
- ✅ Shows pagination handling with cursors or connection patterns
  - _Pagination is explicitly demonstrated with cursor-based patterns. GetOwnedObjects and GetCoins queries include pageInfo (hasNextPage, endCursor) and after/first variables. The getAllOwnedObjects and getAllCoins functions implement full pagination loops with cursor management._
- ✅ Includes TypeScript code that calls the GraphQL endpoint
  - _Complete TypeScript implementation is provided including SuiGraphQLClient instantiation, query execution via gqlClient.query(), error handling, and multiple fetcher functions (getObject, getOwnedObjectsPage, getAllOwnedObjects, getAllCoins, getTransactionBlock) with full code that runs._
- ✅ Demonstrates use of variables in the query
  - _Variables are explicitly shown in multiple ways: (1) GraphQL query definitions use $variable syntax (e.g., $objectId, $owner, $first, $after, $filter), (2) JSON variable objects are provided for each query, (3) TypeScript code passes variables via the variables object in gqlClient.query() calls._

#### ✅ observability
**Page:** operators/observability

>   # Structured Logging for Sui Transaction Debugging  I'll build a comprehensive structured logging system for Sui transactions that captures digest, sender, package/function, status, gas usage, and user-visible errors.  ## 1. Rust Backend (Move Clie...

**Deterministic checks:**
- ✅ `regex`: Matched /digest|transaction/i
- ✅ `regex`: Matched /log|logging|tracing/i

**Subjective grades:**
- ✅ Shows structured logging with transaction-relevant fields
  - _Response defines comprehensive TxLog struct (Rust) and TxLogEntry interface (TypeScript) with all relevant fields: timestamp, digest, sender, package/module/function, move_calls, status, gas details, epoch, checkpoint, object changes, and events count. Both implementations use serde/JSON serialization for structured output._
- ✅ Includes key fields: digest, sender, status, gas used
  - _All four required fields are explicitly present and logged: tx_digest/txDigest, sender, status (success/failure/unknown), and comprehensive gas breakdown (budget, total_cost, computation_cost, storage_cost, storage_rebate, non_refundable_storage_fee). Examples show these fields in JSON output._
- ✅ Provides actionable patterns for debugging failed transactions
  - _Response includes: (a) extraction of abort codes from error strings with human-readable mappings, (b) statusDetail for raw error inspection, (c) userError for end-user display, (d) object change tracking (created/mutated/deleted), (e) example failed transaction JSON, (f) Move-side abort code constants with mappings, (g) emitting logs at appropriate tracing levels. Supports can use digest for on-chain lookup and user_error for customer communication._
- ✅ Uses structured logging format (not just string interpolation)
  - _Response uses proper structured logging libraries: Rust with tracing + tracing-subscriber (json() output), TypeScript with console.log(JSON.stringify()). Code explicitly avoids string interpolation for log messages; instead serializes entire TxLog/TxLogEntry objects to JSON. Emitted logs include structured fields as named properties, not concatenated strings._

#### ✅ move-package-management
**Page:** develop/manage-packages/move-package-management

> # Fixing Move Package Dependencies and Build Configuration  I'll walk you through the full process of inspecting, fixing, and verifying your Move package configuration. Since you haven't provided the actual files, I'll cover the complete methodology ...

**Deterministic checks:**
- ✅ `contains`: Found "Move.toml"
- ✅ `regex`: Matched /Move\.lock|Move\.toml/i
- ✅ `regex`: Matched /sui\s+move\s+build/i

**Subjective grades:**
- ✅ Explains the role of Move.toml and its key fields
  - _Response explicitly covers Move.toml structure in Step 2, explaining [package], [dependencies], [addresses], [dev-dependencies], and [dev-addresses] sections with concrete examples and their purposes._
- ✅ Shows how to declare or fix dependencies
  - _Response provides extensive coverage of dependency declaration methods in Step 2 and Step 3, showing git dependencies, local dependencies, syntax variations, and multiple concrete examples of both correct and incorrect declarations with explanations._
- ✅ Mentions Move Version Registry (MVR) or resolution strategies
  - _Response explicitly addresses MVR in Problem 3 (Step 3) with detailed examples showing the `r = "mvr"` resolver syntax, package format (@org/package-name), and states MVR is 'preferred on mainnet/testnet' with concrete examples like DeepBook and Pyth._
- ✅ References sui move build for verification
  - _Response provides comprehensive coverage of `sui move build` in Step 5 (Build and Verify), including clean build procedures, dependency resolution checks, test verification with `sui move test`, linting, error diagnosis, and Move.lock inspection._

#### ❌ automated-address-management
**Page:** develop/manage-packages/automated-address-management

> # Migrating a Sui Package to Current Address Management  ## Understanding the Problem  Older Sui Move packages used hardcoded addresses in `Move.toml` under `[addresses]`, which caused issues during publishing (address `0x0` needed to be replaced wit...

**Deterministic checks:**
- ✅ `regex`: Matched /Move\.lock|Published\.toml/i
- ✅ `regex`: Matched /address|0x0/i

**Subjective grades:**
- ✅ Explains the current address management conventions
  - _The response explicitly explains modern conventions: Move.lock (auto-managed), Published.toml (optional user-managed), and published-at field in Move.toml. It contrasts these with legacy hardcoded addresses._
- ❌ Shows how Published.toml or Move.lock track published addresses
  - _The response explains Move.lock extensively with concrete examples (showing [env.mainnet] section with original-published-id, latest-published-id, published-version), but completely omits any discussion of Published.toml—its format, purpose, or how it differs from Move.lock. This is a significant gap given the explicit mention in the user prompt._
- ✅ Provides migration steps from older patterns
  - _Clear 10-step migration guide provided, including: auditing legacy Move.toml, updating to modern conventions, updating source code, removing stale files, rebuilding, testing, dry-run publish, actual publish, and recording published address._
- ✅ Includes verification commands to confirm correct behavior
  - _Multiple verification commands provided: `sui move build`, `sui move test`, `sui client publish --dry-run`, `sui move build --lint`, and a comprehensive checklist at the end. Build and publish/test-publish behavior is verified._

#### ❌ walrus-storage
**Page:** sui-stack/walrus/sui-stack-walrus

> # Uploading Assets to Walrus and Wiring into Sui Object Metadata  This is a comprehensive guide covering the full pipeline: uploading to Walrus → storing blob references → wiring into Sui Move objects and Display fields.  ---  ## 1. Architecture Over...

**Deterministic checks:**
- ✅ `contains`: Found "Walrus"
- ✅ `regex`: Matched /blob|store|upload/i
- ✅ `regex`: Matched /Display|metadata/i

**Subjective grades:**
- ✅ Shows how to upload assets to Walrus (via CLI, SDK, or HTTP API)
  - _The response explicitly covers three upload methods: (1) Walrus CLI with `walrus store` command in Section 4 Option A, (2) Walrus HTTP Publisher API with curl in Section 4 Option B, and (3) TypeScript SDK integration in the `uploadToWalrus()` function in Section 5, complete with content-type handling and actual API calls._
- ✅ Explains how to store or reference the resulting blob ID
  - _Section 2 defines a Move struct `GameNFT` with explicit fields for `blob_id: String`, `blob_url: String`, `walrus_object_id: String`, and `storage_end_epoch: u64`. Section 5's TypeScript code extracts and passes these values from Walrus responses to the mint function, demonstrating the full storage pipeline._
- ✅ Demonstrates wiring blob references into Sui object Display fields or metadata
  - _Section 2's `init()` function explicitly wires the blob_url into the Display template with `disp.add(string::utf8(b"image_url"), string::utf8(b"{blob_url}"))`, using the `{blob_url}` template variable. Section 6 verifies this works by showing the expected Display output including the image_url field populated with the Walrus aggregator URL._
- ❌ Mentions token requirements (WAL for storage, SUI for gas) or cost considerations
  - _The response does not mention WAL token requirements for Walrus storage payments, nor does it discuss WAL costs. While it mentions `sui client publish --gas-budget 100000000` (SUI gas) and shows cost data in the Walrus curl response (`"cost": 1234567`), it never explicitly explains that WAL tokens are required to pay for Walrus storage or what the cost implications are._

#### ✅ walrus-sites
**Page:** sui-stack/walrus/sui-stack-walrus-sites

> # Deploying a Static Frontend as a Walrus Site  Here's a complete, step-by-step guide to building your static frontend, publishing it to Walrus Sites, recording all relevant IDs, and documenting the update process.  ---  ## Prerequisites  ### 1. Inst...

**Deterministic checks:**
- ✅ `regex`: Matched /site-builder|walrus-sites/i
- ✅ `regex`: Matched /publish|deploy/i
- ✅ `regex`: Matched /update|upgrade/i

**Subjective grades:**
- ✅ Shows the build step for the static frontend
  - _Step 1 explicitly covers building the static frontend with `npm run build`, including verification of the `dist/` directory output._
- ✅ Provides the site-builder publish command
  - _Step 3 explicitly provides the `site-builder publish ./dist` command with epoch configuration and shows expected output including Blob IDs and Site Object ID._
- ✅ Explains how to record and track the site object ID
  - _Step 4 provides a concrete `deployment-record.json` template that captures site object ID, blob IDs, timestamps, and deployment details. Additionally includes verification commands to query the site object on-chain._
- ✅ Documents the update process for redeploying changes
  - _Step 6 provides comprehensive documentation in `DEPLOYMENT.md` with explicit update commands using `site-builder update --object-id`, detailed step-by-step update procedures, CI/CD integration, and troubleshooting guidance._

</details>

<details><summary><b>sonnet</b>: 15/19 prompts passed (79%)</summary>

- Deterministic checks: 48/48 (100%)
- Subjective grades: 71/75 (95%)

#### ✅ sui-install
**Page:** getting-started/onboarding/sui-install

> # Sui Development Environment Setup  I'll walk you through each step with clear commands and explanations.  ---  ## Step 1: Install `suiup` (the Sui toolchain manager)  ```bash curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/instal...

**Deterministic checks:**
- ✅ `contains`: Found "suiup"
- ✅ `contains`: Found "sui client"
- ✅ `regex`: Matched /faucet/i

**Subjective grades:**
- ✅ Provides a clear step-by-step setup sequence starting with installing suiup
  - _The response explicitly starts with Step 1 installing suiup via the exact curl command specified in the prompt, followed by sequential steps (2-7) that form a complete setup sequence._
- ✅ Mentions generating keys or wallet configuration
  - _Step 3 explicitly runs 'sui client' which generates keys interactively, displays the recovery phrase and address, and includes a warning to back up the recovery phrase._
- ✅ Includes instructions about funding the address with test tokens
  - _Step 6 explicitly directs the user to visit faucet.sui.io, provides detailed instructions on how to enter the generated address and request SUI tokens, and includes verification in Step 7._

#### ✅ hello-world
**Page:** getting-started/onboarding/hello-world

> # Building and Publishing the Sui Hello World Example  ## Step 1: Clone the Repository  ```bash git clone https://github.com/MystenLabs/sui-stack-hello-world.git cd sui-stack-hello-world ```  ## Step 2: Configure Sui CLI for Testnet  ```bash # Add Te...

**Deterministic checks:**
- ✅ `contains`: Found "sui-stack-hello-world"
- ✅ `regex`: Matched /sui\s+(move\s+)?build|sui\s+client\s+publish/i
- ✅ `regex`: Matched /suivision|SuiVision/i

**Subjective grades:**
- ✅ Provides the git clone command for the repo
  - _Step 1 explicitly provides the correct clone command: `git clone https://github.com/MystenLabs/sui-stack-hello-world.git`_
- ✅ Shows the build and publish commands
  - _Step 5 shows `sui move build` for building, and Step 6 shows `sui client publish --gas-budget 50000000` for publishing to Testnet_
- ✅ Explains how to call the entry function after publishing
  - _Step 7 explicitly shows how to call the mint entry function using `sui client call` with the package ID, module, and function name_
- ✅ Mentions viewing the result on SuiVision or a block explorer
  - _Step 9 explicitly provides SuiVision URLs for viewing the transaction, object, and package on testnet.suivision.xyz_

#### ✅ testing
**Page:** develop/testing-debugging/testing

> I'll help you add comprehensive Move unit tests. Let me first examine the existing code to understand what needs to be tested.  <SEARCH> *.move </SEARCH>  <SEARCH> Move.toml </SEARCH>  Let me look at the source files more carefully:  <SEARCH> sources...

**Deterministic checks:**
- ✅ `contains`: Found "#[test]"
- ✅ `regex`: Matched /test_scenario|unit_test/i

**Subjective grades:**
- ✅ Shows the #[test] attribute pattern for writing Sui Move tests
  - _The response demonstrates #[test] attribute extensively throughout the test file, with 25+ test functions explicitly marked with #[test] (e.g., test_init_creates_admin_cap, test_create_object_success, etc.)_
- ✅ Explains or demonstrates success-case testing patterns
  - _Multiple success tests are provided with clear patterns: test_create_object_success, test_update_name_by_owner_success, test_delete_object_by_owner_success, test_pay_exact_amount_succeeds, etc. Each demonstrates the happy path where functions execute without error._
- ✅ Mentions #[expected_failure] or assert macros for failure testing
  - _The response explicitly uses #[expected_failure(abort_code = ...)] throughout (e.g., test_double_init_aborts, test_update_name_by_non_owner_aborts, test_pay_insufficient_amount_aborts) and uses assert! macro for condition verification (e.g., assert_eq, assert!(vector::length(&objs) == 2, 0))._
- ✅ References test_scenario or unit_test module for Sui-specific testing
  - _The response explicitly imports and uses sui::test_scenario module (aliased as ts) with Sui-specific test functions: ts::begin(), ts::next_tx(), ts::take_from_sender(), ts::take_from_address(), ts::has_most_recent_for_sender(), etc. Also uses test_utils and clock modules specific to Sui testing._

#### ❌ scenario-testing
**Page:** getting-started/examples/scenario-testing

> I'll create comprehensive scenario tests for a Sui workflow. Let me build a complete example with a marketplace/NFT trading system that covers all the complex cases.  ## Project Structure  ``` sui-scenario-tests/ ├── Move.toml ├── sources/ │   └── ma...

**Deterministic checks:**
- ✅ `contains`: Found "test_scenario"
- ✅ `regex`: Matched /#\[test\]/i
- ✅ `regex`: Matched /next_tx|next_epoch/i

**Subjective grades:**
- ✅ Uses or references sui::test_scenario for multi-transaction workflows
  - _The response explicitly imports and uses `sui::test_scenario::{Self as ts, Scenario}` throughout the test modules. Multiple test functions use `ts::begin()`, `ts::next_tx()`, and `ts::end()` to orchestrate multi-transaction workflows._
- ✅ Shows how to switch between different senders/users in a scenario
  - _The response clearly demonstrates switching senders using `ts::next_tx(&mut scenario, ADDRESS)` with multiple user addresses (ADMIN, ALICE, BOB, CAROL, DAVE defined as constants). For example, in `test_full_buy_sell_lifecycle()`, transactions are executed as different users sequentially._
- ✅ Demonstrates testing object ownership or state changes across transactions
  - _The response shows ownership changes across multiple transactions. For example, in `test_full_buy_sell_lifecycle()`, the NFT moves from Alice → marketplace → Bob, verified with assertions like `assert!(marketplace::nft_id(&nft) == nft_id, 0)` after Bob takes ownership. The `test_nft_chain_of_ownership()` test explicitly traces ownership through Alice → Bob → Carol with verification steps._
- ❌ Mentions or shows expected-failure patterns (e.g., #[expected_failure] or abort codes)
  - _The response does NOT include any expected-failure test patterns. While the smart contract defines comprehensive error codes (ENotOwner, EItemNotListed, EInsufficientPayment, etc.), there are no test functions marked with `#[test]` that demonstrate failure cases using `#[expected_failure]` annotations or abort assertions. The response cuts off mid-test at the escrow dispute scenario without completing expected-failure examples._

#### ✅ common-errors
**Page:** develop/testing-debugging/common-errors

> I'd be happy to help debug your Sui transaction failure! To give you the most accurate diagnosis, I'll need some details. But let me first walk you through a **systematic debugging framework**, then we can apply it to your specific case.  ---  ## 🔍 ...

**Deterministic checks:**
- ✅ `regex`: Matched /object|version|ownership/i
- ✅ `regex`: Matched /gas|budget/i

**Subjective grades:**
- ✅ Provides a systematic debugging approach for Sui transaction failures
  - _Response explicitly structures a 9-step debugging framework (Steps 1-9) with clear progression from capturing errors, inspecting objects, verifying gas, checking versions, diagnosing by error code, decoding Move aborts, building correct PTBs, handling shared objects, and running diagnostic scripts._
- ✅ Mentions checking object versions and ownership as common failure sources
  - _Step 4 explicitly addresses object versions as '#1 cause of ObjectVersionUnavailableForConsumption errors'. Ownership is covered in Step 2 with a table showing 'Owner ≠ sender' causes and explicit code examples checking `owner.AddressOwner !== senderAddress` in Step 7. Both are also listed in the 'most common culprits' summary._
- ✅ Discusses gas-related issues (insufficient gas, gas coin conflicts)
  - _Step 3 provides a dedicated 'Gas checklist' covering balance sufficiency, gas coin ownership, and the critical issue of gas coin being used as an input object. Error playbook in Step 5 includes 'InsufficientGas' and 'GasBalanceTooLow' with specific fixes. Gas coin conflict is highlighted as issue #3 in the summary._
- ✅ Suggests concrete fixes rather than just diagnosis
  - _Response provides actionable code examples in Steps 6-9: TypeScript SDK functions for fetching fresh refs, building safe PTBs with 7 explicit fixes, correcting shared object versioning, diagnostic scripts, and a playbook with specific 'fix' entries for each error type. Fixes are not merely described but implemented._

#### ✅ publish-overview
**Page:** develop/publish-upgrade-packages/index

> # Sui Mainnet Publishing Preparation Guide  I'll walk you through a comprehensive pre-launch checklist. Let me start by examining what we'd need to verify, then provide tooling and automation for each step.  ---  ## Step 1: Project Structure Audit  F...

**Deterministic checks:**
- ✅ `regex`: Matched /sui\s+client\s+publish|sui\s+move\s+build/i
- ✅ `regex`: Matched /UpgradeCap|upgrade/i
- ✅ `regex`: Matched /mainnet|Mainnet/i

**Subjective grades:**
- ✅ Includes a checklist or step-by-step process for publishing
  - _Response provides a comprehensive 6-step process (Project Structure Audit, Automated Pre-Publish Verification, Move Code patterns, Gas Estimation, Signer & Custody Plan, Post-Publish Verification) with detailed checklists, shell scripts, and TypeScript utilities. Step 5 explicitly includes a publish workflow script with confirmation prompts._
- ✅ Mentions verifying tests pass before publishing
  - _Step 2 includes an automated verification script with dedicated 'Test Verification' section that checks for failing tests, counts test functions, and enforces that tests must pass before mainnet deployment. The script explicitly fails if tests don't pass._
- ✅ Discusses the UpgradeCap and upgrade policy considerations
  - _Step 3 provides a dedicated 'sources/upgrade_policy.move' module with two concrete upgrade patterns: Option A (Timelock UpgradeCap with 48-hour delay) and Option B (make_immutable for no upgrades). Step 4 and Step 5 include handling and verification of UpgradeCap in deployment scripts._
- ✅ Addresses gas requirements or cost estimation
  - _Step 4 provides a complete TypeScript gas estimation script ('scripts/estimate_gas.ts') that performs dry-run gas calculations on testnet, outputs computation/storage costs in SUI, and recommends buffer multiples (2x, 5x). The publish script in Step 5 includes configurable gas budget parameter with default 0.5 SUI._

#### ✅ upgrade
**Page:** develop/publish-upgrade-packages/upgrade

> I'll walk you through a complete Sui package upgrade workflow. Let me cover every step with working code and commands.  ## Overview  Sui package upgrades require: 1. An `UpgradeCap` object (minted at publish time) 2. Compatibility checks (policy enfo...

**Deterministic checks:**
- ✅ `contains`: Found "UpgradeCap"
- ✅ `regex`: Matched /compatible|additive|dependency/i
- ✅ `regex`: Matched /sui\s+client\s+upgrade/i

**Subjective grades:**
- ✅ Explains the role of the UpgradeCap object
  - _Step 1 explicitly defines UpgradeCap as required for upgrades. Step 4 provides multiple methods to locate it. Step 7 shows it as a required argument in the 3-phase PTB. The TypeScript code demonstrates fetching its state (policy, package, version) and using it in authorize_upgrade and commit_upgrade calls._
- ✅ Describes compatibility rules for package upgrades (compatible, additive, or dependency-only)
  - _Step 1 explicitly lists all four policies (COMPATIBLE=0, ADDITIVE=128, DEP_ONLY=192, IMMUTABLE=255) with their numeric constants. For COMPATIBLE policy, a detailed checklist of allowed/disallowed changes is provided (add functions/types/modules ✓, change bodies ✓, remove functions ✗, change signatures ✗, etc.)._
- ✅ Shows the upgrade command or transaction construction
  - _Step 6 shows CLI commands (sui client upgrade with flags). Step 7 provides complete TypeScript SDK implementation of the 3-phase PTB: authorize_upgrade → upgrade (tx.upgrade) → commit_upgrade. Step 9 includes a bash verification script. Multiple code examples demonstrate actual upgrade construction._
- ✅ Mentions that the original package version is preserved on-chain
  - _Step 2 explicitly states 'SAME original address' in Move.toml when upgrading. Step 10 clarifies: 'Original package ID never changes — use for type checks' and 'New package ID is used for NEW transactions. Old package ID still works for READING/calling existing objects.' The Quick Reference table distinguishes 'Original package ID: Never changes' from 'New package ID: Created each upgrade.'_

#### ✅ custom-policies
**Page:** develop/publish-upgrade-packages/custom-policies

> # Sui Package Upgrade & Admin Actions Operator Runbook  ## Table of Contents 1. [Prerequisites & Environment Setup](#prerequisites) 2. [Capability Inventory & Custody Model](#capabilities) 3. [Package Upgrade Runbook](#package-upgrade) 4. [Admin Acti...

**Deterministic checks:**
- ✅ `regex`: Matched /UpgradeCap|AdminCap|cap/i
- ✅ `regex`: Matched /multisig|multi-sig|custody/i

**Subjective grades:**
- ✅ Provides a structured runbook format with clear steps
  - _Document includes clear structure with Table of Contents, numbered sections, step-by-step procedures organized by phases (PHASE 1-4), bash/typescript scripts with detailed comments, and explicit action items (e.g., 'PHASE 1 COMPLETE', 'Share this file with all co-signers')._
- ✅ Addresses capability (Cap) management and access control
  - _Section 2 'Capability Inventory & Custody Model' explicitly documents UpgradeCap, AdminCap, and TreasuryCap with ownership, custody tiers (HOT/MULTISIG/COLD/TIMELOCK), signature requirements, and audit procedures. Includes multisig setup (3-of-5 threshold) and cap registry tracking._
- ✅ Includes verification steps to confirm operations succeeded
  - _Phase 4 contains comprehensive post-upgrade verification (upgrade_phase4_verify.ts) with explicit checks: TX status, new package immutability, UpgradeCap version increment, cap package reference update, smoke test, and event emission. Each check outputs pass/fail status._
- ✅ Mentions security considerations such as multisig, key management, or custody
  - _Document extensively covers: multisig signer setup (Section 2.2), 3-of-5 threshold configuration, individual key generation with warnings against sharing private keys, multisig signing ceremony with human verification steps, custody tiers defined in cap registry, and hot/cold wallet separation implied in PauseCap emergency procedures._

#### ✅ display-overview
**Page:** develop/objects/display/display-overview

> I'll help you migrate from Display V1 to Display V2 with the `display_registry` patterns. Let me first understand what we're working with, then provide a complete migration guide.  ## Step 1: Understanding Display V1 vs V2  **Display V1** (old patter...

**Deterministic checks:**
- ✅ `regex`: Matched /Display|display/i
- ✅ `regex`: Matched /display_registry|DisplayRegistry/i

**Subjective grades:**
- ✅ Explains the difference between Display V1 and Display V2
  - _Step 1 explicitly contrasts V1 (uses sui::display module directly, creates owned Display objects) with V2 (uses display_registry for centralized, upgradeable management). Step 9 summary table provides comprehensive comparison across 7 dimensions._
- ✅ Shows how to migrate from V1 to V2 patterns
  - _Step 4 provides detailed before/after Move code examples showing exact migration changes: replacing display::new with display_registry::register, removing update_version calls, changing transfer patterns from public_transfer to share_object._
- ✅ Mentions the display_registry as the current approach
  - _display_registry is explicitly mentioned throughout as the V2 approach, including in Step 1 definition, Step 4 Move code using sui::display_registry import, and Step 5-6 practical examples with multiple NFT types and TypeScript PTBs._
- ✅ Provides concrete Move code or PTB examples for the migration
  - _Extensive concrete examples provided: Step 4 includes complete Move code before/after migration, Step 5 shows multi-type registry pattern, Step 6 provides TypeScript PTB scripts for deployment and migration, Step 7 includes Move test examples validating the migration._

#### ✅ ptb-inputs-results
**Page:** develop/transactions/ptbs/inputs-and-results

> I'll systematically review PTB code for the most common categories of errors. Please **paste your PTB code** and I'll analyze it across these five areas:  ---  ## What I'll Check  ### 1. 🔢 Invalid Pure Inputs - Wrong types passed to `tx.pure()` (e.g...

**Deterministic checks:**
- ✅ `regex`: Matched /pure|Pure/i
- ✅ `regex`: Matched /object|Object/i
- ✅ `regex`: Matched /Result|result/i

**Subjective grades:**
- ✅ Explains the distinction between pure inputs and object inputs in PTBs
  - _The response explicitly distinguishes these in section 1, stating 'Wrong types passed to tx.pure()' and 'Using tx.pure() where tx.object() is required', and section 3 covers object references separately from pure inputs._
- ✅ Mentions that custom structs and enums cannot be passed as pure inputs
  - _Section 2 explicitly states 'Structs/enums passed without proper BCS encoding via bcs.struct() / bcs.enum()' and 'Using raw JS objects instead of encoded structs', which clearly indicates they require special handling and cannot be passed as raw pure inputs._
- ✅ Discusses how command results chain between PTB commands
  - _Section 5 addresses command result usage, explaining 'Using entire tx.moveCall() result instead of destructuring result[0], result[1]', 'Passing command results to wrong argument positions', and 'Using a result after it has been consumed (objects are linear types)', which collectively cover chaining and result propagation._
- ✅ Addresses vector and option encoding in PTB inputs
  - _Section 4 explicitly covers vectors and options, stating 'Building vectors with mixed types', 'Using JS arrays directly instead of tx.makeMoveVec()', and 'Incorrect std::option::Option construction (missing tx.moveCall for some/none)', which directly addresses encoding requirements for these types._

#### ✅ gas-smashing
**Page:** develop/transaction-payment/gas-smashing

> I'll review gas coin handling patterns and provide comprehensive guidance for safe coin selection, splitting, merging, and avoiding concurrent object reuse issues on Sui.  ## Key Problems with Naive Gas Coin Handling  Before diving into solutions, he...

**Deterministic checks:**
- ✅ `regex`: Matched /gas/i
- ✅ `regex`: Matched /split|merge|coin/i

**Subjective grades:**
- ✅ Explains gas coin handling in Sui transactions
  - _The response provides comprehensive explanation of gas coin handling through multiple sections: foundational types, coin pool management, on-chain sync patterns, gas manager orchestration, and concrete usage examples. It explains how to reserve, track, and release gas coins throughout transaction lifecycles._
- ✅ Warns about concurrent reuse of mutable owned objects or equivocation risks
  - _The response explicitly warns about concurrent reuse in multiple places: listed as Problem #1 ('Concurrent reuse – submitting two transactions using the same gas coin simultaneously causes one to fail'), detailed in CoinPool docstring ('Sui constraint: An owned object can only appear in ONE transaction at a time. Submitting two txns with the same coin simultaneously will cause equivocation errors'), and restated in RULE 1 and RULE 7 of the Critical Rules Summary._
- ✅ Provides guidance on coin management strategies (selection, splitting, or merging)
  - _The response provides detailed guidance on all three strategies: (1) Selection via CoinPool.reserve() with balance checking and sorted availability, (2) Splitting via buildSplitCommand() and buildSplitTransaction() with examples showing atomic splits inside PTBs, (3) Merging via mergeCoins() method with fragmentation-aware triggering and multi-coin consolidation logic._
- ✅ Discusses gas budget estimation or setting
  - _The response discusses gas budgets through: DEFAULT_GAS_CONFIG with explicit budget field (10_000_000n = 0.01 SUI), GasConfig interface allowing customization, reserveGasCoin() that adds a buffer ('required = budget + 2_000_000n'), executeWithGas() with configurable gasBudget parameter, and usage examples showing custom budget adjustment (50_000_000n and 100_000_000n for different transaction types)._

#### ✅ data-serving
**Page:** develop/accessing-data/data-serving

> # Data Access Layer Recommendation for Sui Apps  I'll walk through a structured analysis framework, then give you concrete recommendations based on common app archetypes.  ---  ## Understanding the Two Options  ### Sui GraphQL API (indexer-backed) ``...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `contains`: Found "gRPC"

**Subjective grades:**
- ✅ Compares GraphQL and gRPC as data access options for Sui
  - _Response explicitly compares both options with dedicated sections on 'Understanding the Two Options' showing characteristics, use cases, latency profiles, and architectural differences for each._
- ✅ Provides guidance on when to use each option based on use case
  - _Response includes a decision framework, 5 detailed app archetypes (NFT Marketplace, DeFi/DEX, Portfolio Dashboard, Analytics, Game), and a summary decision matrix that explicitly recommends which option(s) to use for each scenario._
- ✅ Mentions subscription or streaming capabilities
  - _Response explicitly discusses subscriptions and streaming multiple times: gRPC streaming characteristics, websocket subscriptions via GraphQL (limited), native streaming in gRPC, and provides code examples of subscribeEvent for both bids and game events._
- ✅ Discusses data retention and historical query considerations
  - _Response explicitly addresses retention throughout: mentions 'full retention' for GraphQL vs 'current state only' for gRPC, includes retention column in feature matrices, and discusses historical data requirements in the decision framework ('>current epoch' → GraphQL required)._

#### ❌ using-grpc
**Page:** develop/accessing-data/grpc/using-grpc

> I'll convert the Sui JSON-RPC usage to the gRPC API systematically. Since you haven't pasted specific JSON-RPC code, I'll cover the most common operations and show the full conversion pattern.  ## Setup  ```toml # Cargo.toml [dependencies] sui-sdk = ...

**Deterministic checks:**
- ✅ `contains`: Found "gRPC"
- ✅ `regex`: Matched /proto|protobuf|client/i

**Subjective grades:**
- ✅ Explains how to set up or generate a gRPC client for Sui
  - _Section '## Setup' provides Cargo.toml dependencies and '## 1. Client Setup Comparison' explicitly shows client initialization using SuiClientBuilder with gRPC endpoint. Clearly explains that the SDK routes gRPC internally and how to access the raw gRPC node service via node_api()._
- ✅ Maps or references common Sui RPC methods and their gRPC equivalents
  - _Response includes detailed side-by-side comparisons of JSON-RPC vs gRPC for: get_object, get_coins, execute_transaction_block, and event subscriptions. Also provides a comprehensive '## Type Mapping Reference' table showing JSON-RPC types mapped to gRPC/SDK types._
- ✅ Provides a code example demonstrating a gRPC call to Sui
  - _Section '## 6. Complete Working Example' provides a fully functional, annotated Rust program demonstrating multiple gRPC operations: reading objects, fetching coins, querying transactions, and subscribing to events. Example is executable and includes error handling._
- ❌ References the proto definitions, endpoint, or service structure
  - _Response does not explicitly reference proto definitions or point to .proto files. While it mentions 'raw proto client' and 'proto message' in passing, it does not provide links to proto files, specify proto package names, or detail the actual service structure (e.g., sui.node.v2.Node service). The endpoint 'fullnode.mainnet.sui.io:443' is mentioned but gRPC-specific endpoint details are not clarified._

#### ✅ query-with-graphql
**Page:** develop/accessing-data/graphql/query-with-graphql

> I'll convert a Sui JSON-RPC query to GraphQL with full TypeScript implementation. I'll use **getOwnedObjects** as the example since it demonstrates pagination well.  ## JSON-RPC Original  ```typescript // Original JSON-RPC call const response = await...

**Deterministic checks:**
- ✅ `contains`: Found "GraphQL"
- ✅ `regex`: Matched /query\s*\{|query\s+\w+/i
- ✅ `regex`: Matched /TypeScript|typescript|\bts\b/i

**Subjective grades:**
- ✅ Provides a concrete GraphQL query with proper Sui schema types
  - _Response includes a fully-formed GraphQL query named `GetOwnedSuiCoins` with proper Sui schema types like `SuiAddress`, `ObjectFilter`, owner union types (`AddressOwner`, `Shared`, `Parent`), and `MoveObject` content structures. The query explicitly declares fields and uses inline fragments for union type handling._
- ✅ Shows pagination handling with cursors or connection patterns
  - _Response demonstrates Relay-style cursor pagination with `pageInfo` (hasNextPage, hasPreviousPage, startCursor, endCursor), `edges[]` with cursor values, and shows three distinct pagination patterns: single-page fetch with `after` cursor, recursive `getAllOwnedObjects` function with cursor chaining, and async generator `streamOwnedObjects` for lazy consumption._
- ✅ Includes TypeScript code that calls the GraphQL endpoint
  - _Response provides complete TypeScript caller code including: `suiGraphQL` generic fetch client with proper headers and error handling, `getOwnedObjectsPage` function that executes the query, `getAllOwnedObjects` function for recursive pagination, and `streamOwnedObjects` async generator. All are fully functional and properly typed._
- ✅ Demonstrates use of variables in the query
  - _Response explicitly shows variable usage with parameterized variables section showing `owner`, `after`, `before`, `first`, `last`, and `filter`. The caller functions (`getOwnedObjectsPage`, `getAllOwnedObjects`) construct and pass variables object to the `suiGraphQL` function, and usage examples demonstrate passing filter and pagination parameters._

#### ✅ observability
**Page:** operators/observability

> # Structured Logging for Sui Transaction Debugging  ## Architecture Overview  ``` Request → Middleware → PTB Execution → Response     ↓           ↓            ↓            ↓   Logger    Enricher    Tx Monitor    Error Handler     └───────────────────...

**Deterministic checks:**
- ✅ `regex`: Matched /digest|transaction/i
- ✅ `regex`: Matched /log|logging|tracing/i

**Subjective grades:**
- ✅ Shows structured logging with transaction-relevant fields
  - _The response defines a comprehensive `TransactionLog` interface (§1) with all transaction-relevant fields including correlation IDs, identity fields, targets, outcomes, gas data, performance metrics, and object changes. Fields are explicitly typed rather than free-form strings._
- ✅ Includes key fields: digest, sender, status, gas used
  - _All four required fields are explicitly present: `tx_digest` (string), `sender` (string), `status` ('success'|'failure'|'pending'|'timeout'), and `gas` (object with computation_cost, storage_cost, total_charged, etc.). Sample outputs demonstrate these fields populated._
- ✅ Provides actionable patterns for debugging failed transactions
  - _The response includes: error parsing logic that extracts Move abort codes (§2 `resolveUserError`), a `KNOWN_ABORT_CODES` mapping for human-readable error resolution, object mutation tracking (created/mutated/deleted), internal vs user-visible error separation, and a complete executor showing error handling at multiple stages (preflight, timeout, on-chain failure)._
- ✅ Uses structured logging format (not just string interpolation)
  - _The entire implementation uses JSON serialization (`JSON.stringify(entry)`) with typed interfaces rather than string templates. Logs are newline-delimited JSON compatible with aggregation services. No printf-style or string-interpolated logs appear in the core logging path._

#### ❌ move-package-management
**Page:** develop/manage-packages/move-package-management

> I'll systematically inspect your Move package configuration and fix any issues. Please share your files and I'll get started.  **Please provide:** 1. `Move.toml` contents 2. `Move.lock` contents (if it exists) 3. Any error output from `sui move build...

**Deterministic checks:**
- ✅ `contains`: Found "Move.toml"
- ✅ `regex`: Matched /Move\.lock|Move\.toml/i
- ✅ `regex`: Matched /sui\s+move\s+build/i

**Subjective grades:**
- ✅ Explains the role of Move.toml and its key fields
  - _The response explicitly lists Move.toml inspection items including [package] fields (name, version, edition), [dependencies], and [addresses] sections with descriptions of what to validate in each._
- ❌ Shows how to declare or fix dependencies
  - _The response lists checking dependencies (git URLs, rev/tag) but does not actually show HOW to declare or fix them. No example syntax, no before/after comparison, no guidance on correcting malformed dependency entries is provided._
- ✅ Mentions Move Version Registry (MVR) or resolution strategies
  - _The response explicitly states 'MVR packages available → prefer over raw git deps' in the inspection checklist, directly addressing the user prompt's requirement to 'prefer MVR where appropriate'._
- ✅ References sui move build for verification
  - _The response includes a Build section in the checklist verifying 'sui move build succeeds with 0 errors' and promises to provide 'The exact `sui move build` command to verify' in the final output._

#### ✅ automated-address-management
**Page:** develop/manage-packages/automated-address-management

> I'll walk you through migrating a package to Sui's current address management conventions using `Move.lock` and the `Published.toml` pattern, then verify everything works correctly.  ## Step 1: Understand the Current Address Management System  Sui us...

**Deterministic checks:**
- ✅ `regex`: Matched /Move\.lock|Published\.toml/i
- ✅ `regex`: Matched /address|0x0/i

**Subjective grades:**
- ✅ Explains the current address management conventions
  - _Step 1 clearly explains the two-file system (Move.toml and Move.lock). Steps 3-4 detail the correct format for Move.toml [addresses] block using 0x0 sentinel and Move.lock structure with environment-specific addresses. Step 11 Summary table reinforces the conventions._
- ✅ Shows how Published.toml or Move.lock track published addresses
  - _Step 4 explicitly shows Move.lock structure with original-published-at and latest-published-at fields per environment ([env.testnet], [env.mainnet]). Step 9 demonstrates the expected Move.lock state after publish. Step 10 explains upgrade behavior updating latest-published-at._
- ✅ Provides migration steps from older patterns
  - _Step 5 provides a complete bash migration script that backs up originals, normalizes hardcoded addresses to 0x0, and adds [dev-addresses] block if missing. This explicitly handles migration from older address management patterns._
- ✅ Includes verification commands to confirm correct behavior
  - _Step 6 shows sui move test commands. Step 7 demonstrates dry-run publish validation. Step 8 shows real publish with verification of Move.lock updates. Step 12 provides a complete CI/CD verification script checking Move.toml format, build, test, dry-run publish, and Move.lock commit status._

#### ❌ walrus-storage
**Page:** sui-stack/walrus/sui-stack-walrus

> # Uploading Assets to Walrus & Wiring into Sui Objects  I'll walk you through a complete, production-ready pipeline: upload assets → store blob IDs → wire into Sui Display/metadata.  ## Architecture Overview  ``` Local Assets → Walrus Publisher → Blo...

**Deterministic checks:**
- ✅ `contains`: Found "Walrus"
- ✅ `regex`: Matched /blob|store|upload/i
- ✅ `regex`: Matched /Display|metadata/i

**Subjective grades:**
- ✅ Shows how to upload assets to Walrus (via CLI, SDK, or HTTP API)
  - _Step 3 provides a complete TypeScript SDK implementation (WalrusClient) using HTTP PUT requests to the Walrus Publisher API. Step 4 demonstrates practical usage via uploadFile() and uploadDirectory() methods. The code shows explicit API endpoints and request/response handling._
- ✅ Explains how to store or reference the resulting blob ID
  - _Step 2 defines a BlobRef struct that explicitly stores blob_id, media_type, size, and epochs on-chain. Step 4 shows how these blob IDs are passed to the mint function and persisted in the MediaNFT object. The manifest and receipt system demonstrate complete blob ID lifecycle management._
- ✅ Demonstrates wiring blob references into Sui object Display fields or metadata
  - _Step 2 explicitly adds Display fields in the init() function, including image_url that interpolates the blob_id: `display::add(&mut d, string::utf8(b"image_url"), string::utf8(b"https://aggregator.walrus-testnet.walrus.space/v1/{image.blob_id}"))`. This directly wires the Walrus blob into Display rendering._
- ❌ Mentions token requirements (WAL for storage, SUI for gas) or cost considerations
  - _The response completely omits any mention of WAL tokens for Walrus storage costs, epoch purchasing economics, or SUI gas fee considerations. While gas budgets appear in code (e.g., `--gas-budget 100000000`), there is no explanation of costs or token requirements. The epoch-based storage model is mentioned but not its financial implications._

#### ✅ walrus-sites
**Page:** sui-stack/walrus/sui-stack-walrus-sites

> # Deploy a Static Frontend as a Walrus Site  I'll walk you through the complete process: building your app, publishing to Walrus Sites, and managing updates.  ## Prerequisites  ```bash # Install Sui CLI cargo install --locked --git https://github.com...

**Deterministic checks:**
- ✅ `regex`: Matched /site-builder|walrus-sites/i
- ✅ `regex`: Matched /publish|deploy/i
- ✅ `regex`: Matched /update|upgrade/i

**Subjective grades:**
- ✅ Shows the build step for the static frontend
  - _Step 2 explicitly shows building a frontend with npm run build, including Vite and Create React App examples with proper configuration (base: './' for relative paths)._
- ✅ Provides the site-builder publish command
  - _Step 4 clearly provides the site-builder publish command with example output showing Site object ID and blob IDs._
- ✅ Explains how to record and track the site object ID
  - _Step 5 creates a walrus-site-manifest.json file that explicitly records site object ID, blob IDs, URLs, timestamps, and includes a version history section for tracking._
- ✅ Documents the update process for redeploying changes
  - _Step 7 provides a complete update workflow showing site-builder update command with --site-object flag, includes a reusable shell script (update-site.sh), and demonstrates that unchanged blobs are reused._

</details>

---

## Cross-Model Disagreements

These evals passed on some models but failed on others:

- **walrus-cli/walrus-cli-common-mistakes**: gpt4o: FAIL, opus: PASS, sonnet: FAIL
- **AgentPrompt: automated-address-management**: gpt4o: FAIL, opus: FAIL, sonnet: PASS
- **AgentPrompt: common-errors**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: custom-policies**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: data-serving**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: display-overview**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: gas-smashing**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: move-package-management**: gpt4o: FAIL, opus: PASS, sonnet: FAIL
- **AgentPrompt: observability**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: ptb-inputs-results**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: publish-overview**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: query-with-graphql**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: scenario-testing**: gpt4o: FAIL, opus: PASS, sonnet: FAIL
- **AgentPrompt: testing**: gpt4o: FAIL, opus: PASS, sonnet: PASS
- **AgentPrompt: upgrade**: gpt4o: FAIL, opus: FAIL, sonnet: PASS
- **AgentPrompt: using-grpc**: gpt4o: FAIL, opus: PASS, sonnet: FAIL
- **AgentPrompt: walrus-sites**: gpt4o: FAIL, opus: PASS, sonnet: PASS

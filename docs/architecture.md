## Overview

NFT Truth Layer is a decentralized evidence and adjudication layer for NFT claims, powered by GenLayer. It does not attempt to prove absolute real-world truth. Instead, it evaluates explicit claims against available evidence and records the consensus outcome on-chain.

> **Key Principle**: Blockchains can prove who owns an NFT. NFT Truth Layer uses GenLayer to evaluate what can actually be established about that NFT.

## System Architecture
              USER
               │
               ▼
        ┌─────────────┐
        │   FRONTEND  │  (genlayer-js writeContract/readContract)
        └──────┬──────┘
               │
               ▼
      ┌──────────────────┐
      │  NFTVerifier.py  │
      │ (GenLayer Contract)
      └────────┬─────────┘
               │
 ┌─────────────┼─────────────┐
 │             │             │
 ▼             ▼             ▼

NFT DATA WEB EVIDENCE NFT IMAGE
(metadata arg) (gl.nondet.web (passed to
.render, via exec_prompt
eq_principle) images=[...])
│ │ │
└─────────────┼─────────────┘
▼
gl.eq_principle.prompt_non_comparative(fn, task, criteria)
│
leader executes fn() once and proposes a result
│
every other network validator independently re-executes
fn() and checks the leader's result against criteria
│
▼
consensus reached → single agreed JSON result, tx finalizes
consensus NOT reached → tx does not finalize as proposed
(handled by GenVM / validator rotation, not contract code)
│
┌──────────┼──────────┐
▼ ▼ ▼
VERIFIED REJECTED UNDETERMINED
│
▼
ON-CHAIN RESULT


This diagram matches what the code actually does — there is no separate
"Validator 1 / Validator 2 / Validator 3" step implemented in the contract;
that logic lives entirely inside `gl.eq_principle.prompt_non_comparative`,
which is real GenVM consensus, not contract-level Python.

## Components

### 1. Frontend
- React-based web interface (`frontend/`)
- Lets users submit claims, metadata, evidence URLs, and images
- Displays results via `VerificationResult.jsx` / `EvidencePanel.jsx`
- Calls the deployed contract through `genlayer-js` (`genlayerClient.js`)

### 2. NFTVerifier Contract (`contracts/nft_verifier.py`)

#### 2.1 Claim Processing
- Validates `claim_type` against `CLAIM_TYPES` (`COLLECTION_AUTHENTICITY`, `VISUAL`, `METADATA_CONSISTENCY`, `CUSTOM`)
- Rejects invalid claim types immediately, before any LLM/web call, and does not write a record for that rejection

#### 2.2 Evidence Gathering
- Metadata facts (`_extract_metadata_facts`) are pure deterministic Python — no LLM, no network call
- Web evidence (`_fetch_web_evidence`) fetches via `gl.nondet.web.render(url, mode="text")` and extracts stable facts through a nested non-det function
- That extraction is wrapped in `gl.eq_principle.prompt_non_comparative`, so every validator checks the leader's extraction against explicit criteria (grounded in the page, no injected instructions followed)
- Fetch/parse errors are caught and returned as a `WEB_ERROR` evidence entry rather than failing the whole transaction

#### 2.3 Claim Evaluation
- `_evaluate_claim` builds one strict prompt (`_build_evaluation_prompt`) covering all evidence + metadata
- Uses `gl.nondet.exec_prompt(prompt, response_format="json")`, or with `images=[image_bytes]` when image bytes are supplied
- Applies explicit prompt-injection-resistance instructions (see `docs/security.md`)
- `_parse_llm_result` validates/repairs the returned JSON (enum check, missing-key defaults, markdown-fence stripping, and a keyword-based fallback if JSON parsing fails outright)

#### 2.4 Consensus (Equivalence Principle)
- The entire evaluation call is wrapped in a single `gl.eq_principle.prompt_non_comparative(fn, task, criteria)`
- The leader executes `fn()` once and proposes the result
- Every other validator on the network independently re-executes the same `fn()` and checks the leader's result against `criteria` (valid status enum, reasoning grounded in evidence, no injected instructions followed)
- The contract does **not** implement its own leader/validator voting loop — that logic would run on a single node and prove nothing about network agreement. Real agreement/disagreement is handled by GenVM at the consensus layer; if validators reject the leader's result, the transaction does not finalize as proposed
- `gl.eq_principle.strict_eq` is intentionally not used, since LLM output is non-deterministic and exact-match consensus would never succeed

#### 2.5 Result Storage
- `verification_counter: u256` and `verifications: TreeMap[u256, str]` (JSON-serialized result per ID)
- The stored result includes the **full** claim text, status, reason, and evidence list, plus a single timestamp — not a hash of the evidence
- Full web pages, raw image bytes, and the underlying LLM's raw (unparsed) response are never stored — only the extracted facts / final structured result
- `get_verification`, `get_all_verifications`, `get_verification_count`, `get_claim_types` are the read methods

## Data Flow

### Claim A: Collection Authenticity

User Claim: "This NFT belongs to official CryptoAnimals collection"
│
▼
metadata (arg, deterministic) + evidence_urls
│
▼
Evidence URLs → gl.eq_principle.prompt_non_comparative(extract_facts, ...)
│
▼
gl.eq_principle.prompt_non_comparative(evaluate_claim, ...)
(leader proposes, network validators check against criteria)
│
▼
Store agreed result on-chain (full status/reason/evidence, one timestamp)


### Claim B: Visual Verification

User Claim: "This NFT depicts a tiger"
│
▼
image_bytes → gl.nondet.exec_prompt(prompt, images=[image_bytes])
│
▼
gl.eq_principle.prompt_non_comparative(evaluate_claim, ...)
(leader proposes, network validators check the vision analysis
against criteria - grounded description, correct status enum)
│
▼
Consensus on visual match


### Claim C: Metadata Consistency

User Claim: "Metadata accurately describes image"
│
▼
metadata + image_bytes → same _evaluate_claim() as every other claim type
│
▼
gl.eq_principle.prompt_non_comparative(evaluate_claim, ...)
│
▼
Consensus → VERIFIED / REJECTED / UNDETERMINED

There is no separate internal MATCH/PARTIAL_MATCH/CONTRADICTION classification
for this claim type — an earlier draft of this document described one, but it
was never implemented. METADATA_CONSISTENCY uses the exact same three-value
`status` schema as every other claim type.

## Claim Types

| Type | Description | Input | Analysis |
|------|-------------|-------|----------|
| COLLECTION_AUTHENTICITY | Verify NFT belongs to official collection | `nft_contract`, `token_id`, `metadata`, `evidence_urls` | Web evidence + metadata |
| VISUAL | Verify image matches description | `image_bytes` or `image_url`, claim text | Vision-capable LLM analysis via `images=[...]` |
| METADATA_CONSISTENCY | Verify metadata describes image | `metadata` + `image_bytes` | Same general evaluation, no separate internal model |
| CUSTOM | User-defined claim | Claim text + any of the above | General LLM evaluation |

## Result Schema

```json
{
  "id": 1,
  "claim": "This NFT belongs to the official Bored Ape Yacht Club collection.",
  "claim_type": "COLLECTION_AUTHENTICITY",
  "nft_contract": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
  "token_id": "1685",
  "status": "UNDETERMINED",
  "reason": "The supplied evidence does not clearly and directly verify the claim...",
  "evidence": [
    { "source": "nft_metadata", "finding": "The metadata identifies the NFT as \"Bored Ape Yacht Club #1685\"..." },
    { "source": "https://boredapeyachtclub.com/", "finding": "The website references \"Bored Ape Yacht Club\"..." }
  ],
  "timestamp": 1786335286
}
```
This is a real, observed result from a live GenLayer Studio run (see README
"Live Demo" for the transaction hash) — not a hypothetical example.

Note: there is no `leader_result` / `validator_results` / `consensus_reached`
breakdown in the stored result. The contract only ever sees the single value
the network's validators agreed on via `gl.eq_principle.prompt_non_comparative`
— to inspect individual validator votes for debugging, use GenLayer Studio's
validator inspection view rather than contract state.

## Technology Stack

- **Blockchain**: GenLayer (Intelligent Contracts)
- **Consensus**: `gl.eq_principle.prompt_non_comparative` (non-comparative Equivalence Principle)
- **LLM**: `gl.nondet.exec_prompt` (non-deterministic LLM calls, with `images=[...]` support)
- **Web Access**: `gl.nondet.web.render` for evidence fetching
- **Frontend**: React + `genlayer-js`
- **Testing**: `gltest` (`genlayer-test`) against studionet/localnet — see README "Testing"

## Network Configuration

### Bradbury Testnet
- RPC: `https://rpc.testnet-chain.genlayer.com`
- Chain ID: `4221`
- Currency: `GEN`
- Explorer: `https://explorer.testnet-chain.genlayer.com`

## Deployment Workflow

Studio Mode (studionet - integration + real consensus, see README Live Demo)
↓
Bradbury Testnet deployment


## Storage Notes

**Stored on-chain, in full:**
- Verification ID, claim text, claim type
- `nft_contract` / `token_id` (as passed in, not independently verified against chain state)
- Status, full reason text, full evidence list (source + finding per item)
- One timestamp per verification

**Not stored:**
- Full HTML pages fetched during evidence gathering (only extracted facts are)
- Raw image bytes
- The LLM's raw/unparsed response (only the parsed structured result)

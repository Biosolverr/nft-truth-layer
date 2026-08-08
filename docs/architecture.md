# NFT Truth Layer — Architecture

## Overview

NFT Truth Layer is a decentralized evidence and adjudication layer for NFT claims, powered by GenLayer. It does not attempt to prove absolute real-world truth. Instead, it evaluates explicit claims against available evidence and records the consensus outcome on-chain.

> **Key Principle**: Blockchains can prove who owns an NFT. NFT Truth Layer uses GenLayer to evaluate what can actually be established about that NFT.

## System Architecture

```
                  USER
                   │
                   ▼
            ┌─────────────┐
            │   FRONTEND  │
            └──────┬──────┘
                   │
                   ▼
          ┌─────────────────┐
          │  NFTVerifier.py  │
          │  (GenLayer Contract)
          └────────┬────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
     ▼             ▼             ▼
 NFT DATA      WEB EVIDENCE   NFT IMAGE
     │             │             │
     │             │             │
     └─────────────┼─────────────┘
                   ▼
          ┌─────────────────┐
          │  LEADER LLM     │
          └────────┬────────┘
                   │
          Structured Result
                   │
   ┌────────────────┼────────────────┐
   ▼                ▼                ▼
VALIDATOR 1    VALIDATOR 2      VALIDATOR 3
   │                │                │
   └────────────────┼────────────────┘
                    ▼
         EQUIVALENCE PRINCIPLE
                    │
                    ▼
         ┌──────────┼──────────┐
         ▼          ▼          ▼
      VERIFIED   REJECTED   UNDETERMINED
         │          │          │
         └──────────┼──────────┘
                    ▼
              ON-CHAIN RESULT
```

## Components

### 1. Frontend
- React-based web interface
- Allows users to submit claims, evidence, and images
- Displays verification results with full evidence panel
- Links to GenLayer explorer for transaction details

### 2. NFTVerifier Contract (`contracts/nft_verifier.py`)
Core GenLayer Intelligent Contract implementing:

#### 2.1 Claim Processing
- Validates claim type (COLLECTION_AUTHENTICITY, VISUAL, METADATA_CONSISTENCY, CUSTOM)
- Rejects invalid claim types immediately

#### 2.2 Evidence Gathering
- Fetches web evidence via `gl.nondet.web.render(url, mode="text")`
- Extraction (web content → facts) runs inside `gl.eq_principle.prompt_non_comparative`, so every validator checks the leader's extraction against explicit criteria (grounded in the page, no injected instructions followed)
- Extracts stable facts (not raw HTML)
- Processes NFT metadata (pure deterministic Python, no LLM/network call)
- Handles fetch errors gracefully

#### 2.3 Claim Evaluation
- Uses `gl.nondet.exec_prompt()` for LLM analysis (with `images=[...]` when a VISUAL claim includes image bytes)
- Applies strict security instructions (prompt injection protection)
- Returns structured JSON with status, reason, evidence

#### 2.4 Consensus (Equivalence Principle)
- The entire evaluation call is wrapped in a single `gl.eq_principle.prompt_non_comparative(fn, task, criteria)`
- The leader executes `fn()` once and proposes the result
- Every other validator on the network independently re-executes the same `fn()` and checks the leader's result against `criteria` (valid status enum, reasoning grounded in evidence, no injected instructions followed)
- The contract does **not** implement its own leader/validator voting loop — that logic would run on a single node and prove nothing about network agreement. Real agreement/disagreement is handled by GenVM at the consensus layer; if validators reject the leader's result, the transaction does not finalize as-is
- `gl.eq_principle.strict_eq` is intentionally not used for these calls, since LLM output is non-deterministic and exact-match consensus would never succeed

#### 2.5 Result Storage
- Stores verification ID, claim, status, evidence hash, timestamp
- Does NOT store full webpages or images (cost optimization)
- Provides read methods for querying results

## Data Flow

### Claim A: Collection Authenticity
```
User Claim: "This NFT belongs to official CryptoAnimals collection"
    │
    ▼
NFT Contract + Token ID → Fetch metadata
    │
    ▼
Evidence URLs → gl.eq_principle.prompt_non_comparative(extract_facts, ...)
    │
    ▼
gl.eq_principle.prompt_non_comparative(evaluate_claim, ...)
    (leader proposes, network validators check against criteria)
    │
    ▼
Store agreed result on-chain
```

### Claim B: Visual Verification
```
User Claim: "This NFT depicts a tiger"
    │
    ▼
Image (PNG/JPEG bytes) → gl.nondet.exec_prompt(prompt, images=[image_bytes])
    │
    ▼
gl.eq_principle.prompt_non_comparative(evaluate_claim, ...)
    (leader proposes, network validators check the vision analysis
     against criteria - grounded description, correct status enum)
    │
    ▼
Consensus on visual match
```

### Claim C: Metadata Consistency
```
User Claim: "Metadata accurately describes image"
    │
    ▼
Metadata + Image → Semantic comparison
    │
    ▼
Three-result model:
    MATCH → VERIFIED
    CONTRADICTION → REJECTED
    PARTIAL_MATCH → UNDETERMINED
    │
    ▼
Validator consensus
```

## Claim Types

| Type | Description | Input | Analysis |
|------|-------------|-------|----------|
| COLLECTION_AUTHENTICITY | Verify NFT belongs to official collection | Contract, Token ID, URLs | Web evidence + metadata |
| VISUAL | Verify image matches description | Image, Claim text | Vision LLM analysis |
| METADATA_CONSISTENCY | Verify metadata describes image | Metadata + Image | Semantic comparison |
| CUSTOM | User-defined claim | Claim text + Evidence | General LLM evaluation |

## Result Schema

```json
{
  "id": 17,
  "claim": "This NFT belongs to the official CryptoAnimals collection",
  "claim_type": "COLLECTION_AUTHENTICITY",
  "nft_contract": "0x...",
  "token_id": "1847",
  "status": "VERIFIED",
  "reason": "Metadata collection field matches the claimed collection and is corroborated by the official website evidence.",
  "evidence": [
    {
      "source": "official website",
      "finding": "Contract address matches"
    }
  ],
  "timestamp": 1786100000
}
```

Note: there is no `leader_result` / `validator_results` / `consensus_reached` breakdown in the stored result. The contract only ever sees the single value the network's validators agreed on via `gl.eq_principle.prompt_non_comparative` - if you need to inspect individual validator votes for debugging, use GenLayer Studio's validator inspection tools rather than contract state.

## Technology Stack

- **Blockchain**: GenLayer (Intelligent Contracts)
- **Consensus**: `gl.eq_principle.prompt_non_comparative` (non-comparative Equivalence Principle)
- **LLM**: `gl.nondet.exec_prompt` (non-deterministic LLM calls, with `images=[...]` support)
- **Web Access**: `gl.nondet.web.render` for evidence fetching
- **Image**: GenLayer Image processing for vision analysis
- **Frontend**: React + Web3
- **Testing**: pytest with Direct Mode and Studio Mode

## Network Configuration

### Bradbury Testnet
- RPC: `https://rpc.testnet-chain.genlayer.com`
- Chain ID: `4221`
- Currency: `GEN`
- Explorer: `https://explorer.testnet-chain.genlayer.com`

## Deployment Workflow

```
Direct Mode (unit tests)
    ↓
Studio Mode (integration + consensus)
    ↓
Bradbury (production-like testing)
    ↓
Testnet Deployment
```

## Storage Optimization

**Stored on-chain:**
- Verification ID
- Claim text and type
- Status (VERIFIED/REJECTED/UNDETERMINED)
- Evidence summaries (source + finding)
- Timestamp
- Consensus metadata

**NOT stored (too expensive/unnecessary):**
- Full HTML pages
- Raw image bytes
- Detailed LLM reasoning
- Full validator responses

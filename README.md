# NFT Truth Layer

> **A decentralized evidence and adjudication layer for NFT claims, powered by GenLayer.**

Blockchains can prove who owns an NFT. **NFT Truth Layer** uses GenLayer to evaluate what can actually be established about that NFT through decentralized AI consensus.

---

## What It Does

Evaluates explicit claims against available evidence and records the consensus outcome on-chain:

| Claim Type | Example |
|-----------|---------|
| **Collection Authenticity** | "This NFT belongs to the official CryptoAnimals collection." |
| **Visual Verification** | "This NFT depicts a golden tiger standing in a forest." |
| **Metadata Consistency** | "The NFT metadata accurately describes the image." |
| **Custom** | Any explicit user-defined claim |

### Three-Status System

| Status | Meaning |
|--------|---------|
| **VERIFIED** | Strong evidence from multiple independent sources supports the claim |
| **REJECTED** | Evidence contradicts the claim |
| **UNDETERMINED** | Insufficient or conflicting evidence — *absence of evidence ≠ proof of falsehood* |

---

## Architecture

```
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
       NFT DATA      WEB EVIDENCE   NFT IMAGE
   (deterministic)  (gl.nondet.web    (passed to
                      .render +        exec_prompt
                      exec_prompt,      images=[...])
                      wrapped in
                      eq_principle)
           │             │             │
           └─────────────┼─────────────┘
                         ▼
        gl.eq_principle.prompt_non_comparative(fn, task, criteria)
                         │
      leader executes fn() once and proposes the result
                         │
      every other network validator independently re-executes
      the SAME fn() and checks the leader's result against `criteria`
                         │
                         ▼
        consensus reached  →  single agreed JSON result
        consensus NOT reached → transaction does not finalize
        (handled by GenVM / validator rotation, not by contract code)
                         │
                         ▼
                 ┌───────┼────────┐
                 ▼       ▼        ▼
             VERIFIED REJECTED UNDETERMINED
                         │
                         ▼
                  ON-CHAIN RESULT
```

Uses the **Non-Comparative Equivalence Principle** (`gl.eq_principle.prompt_non_comparative`): the leader runs the LLM/web call once, and every validator on the network independently checks that result against explicit `criteria` (valid schema, grounded in evidence, no injected instructions followed). This is the real GenLayer consensus mechanism — the contract does not implement its own leader/validator loop in Python; that logic runs on a single node and would prove nothing about network agreement. `strict_eq` is intentionally **not** used for the LLM/web steps, since LLM output is non-deterministic and exact-match consensus would never succeed.

One consequence of using the real protocol: the contract (and therefore this README/UI) has no visibility into individual "leader vs. validator" votes — only the single value the network agreed on. If you need per-validator visibility for research/demo purposes, that has to come from GenLayer Studio's own validator inspection tools, not from contract state.

---

## Security Model

All external input is treated as potentially malicious:

- **Prompt Injection**: Metadata/web instructions are labeled untrusted; LLM ignores embedded commands
- **Malicious Websites**: Content treated as evidence, not instructions
- **Conflicting Sources**: The evaluation prompt instructs the model to return UNDETERMINED on conflicting/insufficient evidence, and every validator checks that instruction was actually followed (via `criteria` in `gl.eq_principle.prompt_non_comparative`)
- **Leader Manipulation**: A leader that ignores the criteria (e.g. returns VERIFIED without supporting evidence) is rejected by validators at the consensus layer before the transaction ever finalizes — the contract doesn't need its own vote-counting logic for this
- **Fake Evidence**: The `criteria` explicitly require reasoning to reference only supplied evidence with no hallucinated sources
- **Dynamic Content**: Timestamps recorded; evidence normalized to stable facts

See [docs/security.md](docs/security.md) for full threat model with 12 attack vectors.

---

## Repository Structure

```
nft-truth-layer/
├── contracts/
│   └── nft_verifier.py              # GenLayer Intelligent Contract
├── tests/
│   └── test_nft_verifier_gltest.py  # Real contract execution tests via `gltest` (the only test file)
├── frontend/                         # React application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NFTForm.jsx
│   │   │   ├── VerificationResult.jsx
│   │   │   ├── EvidencePanel.jsx
│   │   │   └── VerificationStatus.jsx
│   │   ├── utils/
│   │   │   └── genlayer.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── examples/
│   ├── verified-nft.json            # VERIFIED example
│   ├── disputed-nft.json            # UNDETERMINED example
│   └── inconsistent-nft.json        # REJECTED example
├── docs/
│   ├── architecture.md              # System architecture
│   ├── security.md                  # Threat model & mitigations
│   └── verification-model.md        # Verification methodology
├── genlayer_config.yaml             # GenLayer CLI config
├── .env.example                     # Environment template
├── requirements.txt                 # Python dependencies
└── README.md                        # This file
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- GenLayer CLI (`pip install genlayer`)

### 1. Install Dependencies

```bash
# Python
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Run Tests (Direct Mode)

```bash
pytest tests/ -v
```

### 3. Start Frontend

```bash
cd frontend
npm start
```

### 4. Deploy to Bradbury

```bash
# Configure network
genlayer network testnet-bradbury

# Deploy contract
genlayer deploy --contract contracts/nft_verifier.py

# Run integration tests
genlayer studio
```

---

## Test Data / Live Demo

Verified end-to-end on GenLayer Studio (studionet) against a real, independently
verifiable NFT — Bored Ape Yacht Club #1685 (contract `0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D`,
confirmed on [Etherscan](https://etherscan.io/nft/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/1685)).
No fabricated addresses or evidence - metadata matches this token's real on-chain traits,
and `evidence_urls` points at the real official site.

All three runs used a **live, non-mocked** validator set spanning multiple model providers
(GPT-5.4, Claude Sonnet 4.6, Gemini, Grok, Qwen, Mistral, Gemma, Minimax, GPT-OSS) with
real `gl.nondet.web.render()` fetches and real consensus voting (including leader rotation
where validators disagreed) - not simulated/mocked responses.

| # | Claim | Result | Tx hash |
|---|---|---|---|
| 1 | "This NFT belongs to the official Bored Ape Yacht Club collection." | `UNDETERMINED` | `0xcba9a7a63d384482bc292ce5d258925c5e7429a53237268a8f19d61122571033` |
| 2 | "This NFT belongs to the official CryptoPunks collection." (same metadata/evidence as #1 - direct contradiction) | `REJECTED` | `0xd4dea6e564c659db09c20041bf7d3f2d28eea049036a999295545d401ba821f7` |
| 3 | "This NFT belongs to an officially recognized collection." (no metadata, no evidence_urls) | `UNDETERMINED` | `0x43db5946e465ccabc9c67a259147aa578152e9fbbbdbbf320c151cec23c7c72a` |

Run #1 is a genuinely honest UNDETERMINED, not a forced result: the official BAYC site
confirms the collection exists but has no contract address or token-specific verification,
and metadata alone is self-asserted - exactly the kind of insufficient-evidence case this
contract is designed to flag rather than rubber-stamp as VERIFIED.

Run #2 shows the contract catching a direct contradiction between claim and evidence even
though the web-evidence extraction returned fewer facts than in run #1 (LLM extraction is
non-deterministic) - the metadata alone was enough to reject the false claim.

Reproduce this yourself: deploy `contracts/nft_verifier.py` on GenLayer Studio, then call
`verify_claim` with the inputs above via Simulation Mode.

### TruthNFT test fixture (separate repo)

A separate repository, [`TruthNFT-test-suite`](../../TruthNFT-test-suite), provides 5
purpose-built ERC-721 test tokens (Base Sepolia) with hosted metadata/evidence pages
(Vercel) for demoing all three statuses without relying on a large real-world collection:

| Token | Case | Expected verifier result |
|---|---|---|
| #1 | Honest baseline | VERIFIED |
| #2 | Metadata/image contradiction | REJECTED |
| #3 | Web evidence (official + creator pages agree) | VERIFIED |
| #4 | Conflicting web evidence | UNDETERMINED |
| #5 | Prompt-injection metadata | Must be treated as untrusted data |

Once deployed: TruthNFT contract address (Base Sepolia) + Vercel URL → link here.

## Testing

### Real contract tests (`gltest`)

`test_nft_verifier_gltest.py` actually deploys `NFTVerifier` against mock GenLayer validators (via `genlayer-test`'s `MockedLLMResponse`) inside a real GenVM sandbox, and calls `verify_claim`/`get_claim_types` for real. This is the only test file in this repo, and the only supported way to test the contract locally - there is no standalone pip package for the contract-side `genlayer` SDK, so plain `pytest`-without-GenVM tests of contract code are not possible (see `requirements.txt`).

```bash
pip install genlayer-test
gltest --network localnet
# or
gltest --network studionet
```

### Studio Mode (Integration)

Multi-validator consensus testing against real (non-mocked) LLM calls:

```bash
genlayer studio
# Run contract in Studio with multiple validators
```

### Bradbury (Production-like)

Real network deployment and testing:

```bash
genlayer network testnet-bradbury
genlayer deploy --contract contracts/nft_verifier.py
```

**Bradbury Testnet:**
- RPC: `https://rpc.testnet-chain.genlayer.com`
- Chain ID: `4221`
- Currency: `GEN`
- Explorer: `https://explorer.testnet-chain.genlayer.com`

---

## Contract API

### `verify_claim(...)`

Main entry point. Returns verification result with consensus.

```python
result = contract.verify_claim(
    claim="This NFT belongs to the official CryptoAnimals collection.",
    claim_type="COLLECTION_AUTHENTICITY",
    nft_contract="0x1234567890abcdef...",
    token_id="1847",
    metadata={...},
    evidence_urls=["https://...", "https://..."]
)
```

### `get_verification(id)`

Query verification by ID.

### `get_all_verifications()`

List all verifications.

---

## Verification Examples

### Example 1: VERIFIED

**Claim**: "This NFT belongs to the official CryptoAnimals collection."

**Evidence**: Official website confirms contract + creator page references collection + metadata matches

**Result**: `VERIFIED` — network validators confirmed the leader's evaluation satisfied the consensus criteria

### Example 2: REJECTED

**Claim**: "This NFT depicts a tiger."

**Evidence**: Image shows spaceship

**Result**: `REJECTED` — clear contradiction, consensus reached

### Example 3: UNDETERMINED

**Claim**: "This NFT belongs to the official CryptoAnimals collection."

**Evidence**: Official website says Collection A, marketplace says Collection B

**Result**: `UNDETERMINED` — conflicting sources, no consensus

---

## Key Principles

1. **No Absolute Truth**: Evaluates evidence, not reality
2. **Decentralized Consensus**: No single point of failure
3. **Transparency**: Full evidence panel for every result
4. **Security First**: All input untrusted by default
5. **Minimal On-Chain**: Evidence summaries, not raw HTML/images

---

## License

MIT

---

**Built for GenLayer.** Blockchains prove ownership. NFT Truth Layer proves what can be established.[README.md](https://github.com/user-attachments/files/30868447/README.md)


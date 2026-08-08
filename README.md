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
│   ├── conftest.py                  # Shared fixtures
│   ├── test_claims.py               # Claim type tests (12 tests)
│   ├── test_consensus.py            # Equivalence Principle tests (11 tests)
│   ├── test_web_evidence.py         # Web evidence scenarios (spec-only, see note in file)
│   ├── test_image_verification.py   # Image scenarios (spec-only, see note in file)
│   └── test_nft_verifier_gltest.py  # Real contract execution tests via `gltest`
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

## Testing

### Scenario specs (no network, no contract execution)

`test_claims.py`, `test_consensus.py`, `test_web_evidence.py`, `test_image_verification.py` assert on hardcoded scenario values and document intended behavior, but never import or execute `NFTVerifier`. Useful as a spec, not as proof the contract works:

```bash
pytest tests/test_claims.py tests/test_consensus.py tests/test_web_evidence.py tests/test_image_verification.py -v
```

### Real contract tests (`gltest`)

`test_nft_verifier_gltest.py` actually deploys `NFTVerifier` against mock GenLayer validators (via `genlayer-test`'s `MockedLLMResponse`) and calls `verify_claim`/`get_claim_types` for real:

```bash
gltest --network localnet
# or
pytest tests/test_nft_verifier_gltest.py -v
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

**Built for GenLayer.** Blockchains prove ownership. NFT Truth Layer proves what can be established.

"""
Real integration tests for NFTVerifier using the official `gltest` framework.

Unlike the previous test files in this directory (test_claims.py,
test_consensus.py, test_web_evidence.py, test_image_verification.py), these
tests actually deploy and execute contracts/nft_verifier.py against mock
GenLayer validators - they don't just assert on hardcoded Python numbers
that were never run through the contract.

HOW TO RUN
----------
    pip install genlayer-test
    gltest --network localnet
or
    pytest tests/test_nft_verifier_gltest.py

`gltest --network localnet` needs the GenLayer localnet running (spun up via
the GenLayer CLI / Studio tooling). This is heavier than test_pure_logic.py -
see the README testing section for the exact setup commands.

The mock system pattern-matches substrings inside the prompt/task text sent
to gl.nondet.exec_prompt / gl.eq_principle.prompt_non_comparative. See
https://pypi.org/project/genlayer-test/ for details.

IMPORTANT HONESTY NOTE - what mocked tests can and cannot prove
------------------------------------------------------------------
MockedLLMResponse always returns the SAME canned string regardless of what
is actually inside the prompt. That means these tests prove:
  - the contract wires evidence -> prompt -> eq_principle -> storage
    correctly (the "plumbing"),
  - claim-type validation and view methods work,
  - the result schema is parsed and stored correctly.

They do NOT and CANNOT prove that a real LLM actually resists prompt
injection, or that it correctly judges image/metadata consistency - the
mock does not "read" the prompt, it just returns whatever we told it to
return. Real prompt-injection resistance and real visual judgement can only
be demonstrated against a real LLM on GenLayer Studio or Bradbury Testnet -
e.g. using token #5 (adversarial metadata) from the TruthNFT test fixture.
Do not present a passing mocked "prompt injection" test as proof of security
in review materials - it isn't one.
"""

import json

from gltest import get_contract_factory, get_validator_factory
from gltest.types import MockedLLMResponse


def _deploy(mock_response: MockedLLMResponse):
    factory = get_contract_factory("NFTVerifier")
    validator_factory = get_validator_factory()

    mock_validators = validator_factory.batch_create_mock_validators(
        count=5,
        mock_llm_response=mock_response,
    )

    transaction_context = {
        "validators": [v.to_dict() for v in mock_validators],
        "genvm_datetime": "2026-01-01T00:00:00Z",
    }

    contract = factory.deploy(transaction_context=transaction_context)
    return contract, transaction_context


def _call_verify(contract, ctx, **kwargs):
    args = [
        kwargs.get("claim"),
        kwargs.get("claim_type"),
        kwargs.get("nft_contract"),
        kwargs.get("token_id"),
        kwargs.get("metadata"),
        kwargs.get("image_url"),
        kwargs.get("image_bytes"),
        kwargs.get("evidence_urls"),
        kwargs.get("custom_params"),
    ]
    return contract.verify_claim(args=args, transaction_context=ctx).transact(transaction_context=ctx)


# ---------------------------------------------------------------------------
# Core evaluation scenarios (mirrors TruthNFT tokens #1 / #2 / #4)
# ---------------------------------------------------------------------------

def test_verified_claim_with_supporting_metadata():
    """Mirrors TruthNFT token #1 (honest baseline) -> expect VERIFIED."""
    mock_response: MockedLLMResponse = {
        "nondet_exec_prompt": {
            "You are an NFT verification evaluator": json.dumps(
                {
                    "status": "VERIFIED",
                    "reason": "Metadata collection field matches the claimed collection.",
                    "evidence": [
                        {"source": "nft_metadata", "finding": "Collection: CryptoAnimals"}
                    ],
                }
            )
        },
    }

    contract, ctx = _deploy(mock_response)

    result = _call_verify(
        contract,
        ctx,
        claim="This NFT belongs to the official CryptoAnimals collection.",
        claim_type="COLLECTION_AUTHENTICITY",
        metadata={"name": "Golden Tiger #1847", "collection": "CryptoAnimals"},
    )

    assert result["status"] == "VERIFIED"
    assert result["id"] == 1


def test_rejected_claim_with_contradicting_metadata():
    """Mirrors TruthNFT token #2 (metadata/image contradiction) -> expect REJECTED."""
    mock_response: MockedLLMResponse = {
        "nondet_exec_prompt": {
            "You are an NFT verification evaluator": json.dumps(
                {
                    "status": "REJECTED",
                    "reason": "Metadata attributes describe a spaceship, not a tiger.",
                    "evidence": [
                        {"source": "nft_metadata", "finding": "Object: Spaceship"}
                    ],
                }
            )
        },
    }

    contract, ctx = _deploy(mock_response)

    result = _call_verify(
        contract,
        ctx,
        claim="This NFT depicts a tiger.",
        claim_type="VISUAL",
        metadata={"name": "Golden Tiger #1847", "attributes": [{"trait_type": "Object", "value": "Spaceship"}]},
    )

    assert result["status"] == "REJECTED"


def test_undetermined_claim_with_conflicting_evidence():
    """Mirrors TruthNFT token #4 (conflict.html vs collection.html) -> expect UNDETERMINED."""
    mock_response: MockedLLMResponse = {
        "nondet_exec_prompt": {
            # facts extracted from the conflicting evidence page
            "web evidence extractor": json.dumps(
                {"facts": ["Claimed collection: UnknownMirrorCollection"]}
            ),
            # final evaluation - insufficient/conflicting evidence
            "You are an NFT verification evaluator": json.dumps(
                {
                    "status": "UNDETERMINED",
                    "reason": "One source claims a different collection than the official page; evidence conflicts.",
                    "evidence": [
                        {"source": "conflict.html", "finding": "Claims collection is UnknownMirrorCollection"}
                    ],
                }
            ),
        },
    }

    contract, ctx = _deploy(mock_response)

    result = _call_verify(
        contract,
        ctx,
        claim="This NFT belongs to the TruthNFT collection.",
        claim_type="COLLECTION_AUTHENTICITY",
        evidence_urls=["https://example.vercel.app/evidence/conflict.html"],
    )

    assert result["status"] == "UNDETERMINED"


def test_visual_claim_with_image_bytes():
    """
    VISUAL claim with image_bytes set. The mock cannot verify that the image
    was actually analyzed (see module docstring) - this only proves the
    image_bytes code path executes without error and the result is stored.
    """
    mock_response: MockedLLMResponse = {
        "nondet_exec_prompt": {
            "You are an NFT verification evaluator": json.dumps(
                {
                    "status": "VERIFIED",
                    "reason": "Image shows a golden tiger consistent with the claim.",
                    "evidence": [{"source": "image", "finding": "Tiger visible in provided image"}],
                }
            )
        },
    }

    contract, ctx = _deploy(mock_response)

    result = _call_verify(
        contract,
        ctx,
        claim="This NFT depicts a golden tiger.",
        claim_type="VISUAL",
        image_bytes=b"\x89PNG\r\n\x1a\n-fake-bytes-for-test-",
    )

    assert result["status"] == "VERIFIED"
    assert result["claim_type"] == "VISUAL"


def test_invalid_claim_type_short_circuits_before_any_llm_call():
    """No mock responses needed - contract should reject before calling gl.*"""
    contract, ctx = _deploy(mock_response={})

    result = _call_verify(
        contract,
        ctx,
        claim="Some claim",
        claim_type="NOT_A_REAL_TYPE",
    )

    assert result["status"] == "REJECTED"
    assert "Invalid claim type" in result["reason"]


# ---------------------------------------------------------------------------
# View methods / storage
# ---------------------------------------------------------------------------

def test_get_claim_types_view_method():
    contract, ctx = _deploy(mock_response={})
    claim_types = contract.get_claim_types(transaction_context=ctx).call(transaction_context=ctx)
    assert "COLLECTION_AUTHENTICITY" in claim_types
    assert "VISUAL" in claim_types


def test_get_verification_not_found_returns_error_dict():
    contract, ctx = _deploy(mock_response={})
    result = contract.get_verification(args=[999], transaction_context=ctx).call(transaction_context=ctx)
    assert result == {"error": "Verification not found"}


def test_verification_count_and_all_verifications_increment_correctly():
    mock_response: MockedLLMResponse = {
        "nondet_exec_prompt": {
            "You are an NFT verification evaluator": json.dumps(
                {"status": "VERIFIED", "reason": "ok", "evidence": []}
            )
        },
    }
    contract, ctx = _deploy(mock_response)

    _call_verify(contract, ctx, claim="Claim A", claim_type="CUSTOM", metadata={"name": "A"})
    _call_verify(contract, ctx, claim="Claim B", claim_type="CUSTOM", metadata={"name": "B"})

    count = contract.get_verification_count(transaction_context=ctx).call(transaction_context=ctx)
    all_results = contract.get_all_verifications(transaction_context=ctx).call(transaction_context=ctx)

    assert count == 2
    assert len(all_results) == 2
    assert {r["claim"] for r in all_results} == {"Claim A", "Claim B"}

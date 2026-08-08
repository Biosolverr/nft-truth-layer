"""
Real integration tests for NFTVerifier using the official `gltest` framework.

Unlike the previous test files in this directory (test_claims.py,
test_consensus.py, test_web_evidence.py, test_image_verification.py), these
tests actually deploy and execute contracts/nft_verifier.py against mock
GenLayer validators - they don't just assert on hardcoded Python numbers
that were never run through the contract.

Run with:
    gltest --network localnet
or
    pytest tests/test_nft_verifier_gltest.py

The mock system pattern-matches substrings inside the prompt/task text sent
to gl.nondet.exec_prompt / gl.eq_principle.prompt_non_comparative. See
https://pypi.org/project/genlayer-test/ for details.
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


def test_verified_claim_with_supporting_metadata():
    """
    Claim: NFT belongs to CryptoAnimals collection.
    Evidence: metadata says collection is CryptoAnimals.
    Expected: leader's evaluation (VERIFIED) is accepted since it matches
    the criteria enforced by gl.eq_principle.prompt_non_comparative.
    """
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

    result = contract.verify_claim(
        args=[
            "This NFT belongs to the official CryptoAnimals collection.",
            "COLLECTION_AUTHENTICITY",
            None,
            None,
            {"name": "Golden Tiger #1847", "collection": "CryptoAnimals"},
            None,
            None,
            None,
            None,
        ],
        transaction_context=ctx,
    ).transact(transaction_context=ctx)

    assert result["status"] == "VERIFIED"
    assert result["id"] == 1


def test_rejected_claim_with_contradicting_metadata():
    """Claim says tiger, metadata/attributes say spaceship -> REJECTED."""
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

    result = contract.verify_claim(
        args=[
            "This NFT depicts a tiger.",
            "VISUAL",
            None,
            None,
            {"name": "Golden Tiger #1847", "attributes": [{"trait_type": "Object", "value": "Spaceship"}]},
            None,
            None,
            None,
            None,
        ],
        transaction_context=ctx,
    ).transact(transaction_context=ctx)

    assert result["status"] == "REJECTED"


def test_invalid_claim_type_short_circuits_before_any_llm_call():
    """No mock responses needed - contract should reject before calling gl.*"""
    contract, ctx = _deploy(mock_response={})

    result = contract.verify_claim(
        args=["Some claim", "NOT_A_REAL_TYPE", None, None, None, None, None, None, None],
        transaction_context=ctx,
    ).transact(transaction_context=ctx)

    assert result["status"] == "REJECTED"
    assert "Invalid claim type" in result["reason"]


def test_get_claim_types_view_method():
    contract, ctx = _deploy(mock_response={})
    claim_types = contract.get_claim_types(transaction_context=ctx).call(transaction_context=ctx)
    assert "COLLECTION_AUTHENTICITY" in claim_types
    assert "VISUAL" in claim_types

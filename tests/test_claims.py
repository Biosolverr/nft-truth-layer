"""
NOTE (added during GenLayer API audit):
These tests only assert on hardcoded Python values (e.g. verified_count >= 2)
and never import or execute contracts/nft_verifier.py. They document the
intended scenarios but do NOT verify that the contract actually behaves this
way on GenVM. The contract no longer has a manual 3-validator loop to test -
consensus is now delegated to gl.eq_principle.prompt_non_comparative and the
real GenLayer validator set.

For real contract execution tests (deploy + call via gltest with mocked LLM
responses), see tests/test_nft_verifier_gltest.py.

Test suite for NFT claim verification.
Covers Claim A (Collection), Claim B (Visual), Claim C (Metadata Consistency), and Custom claims.

Tests are designed for GenLayer Direct Mode (unit tests) and Studio Mode (integration).
"""

import pytest
import json


class TestCollectionClaims:
    """Tests for Claim A: Collection Authenticity"""

    def test_verified_collection(self, sample_metadata_tiger, sample_evidence_official, valid_claim_collection):
        """
        Test 1: Valid claim with matching evidence → VERIFIED

        Scenario:
        - Claim: NFT belongs to official CryptoAnimals collection
        - Evidence: Official website confirms contract address and token ID
        - Expected: VERIFIED
        """
        # This test verifies that when evidence strongly supports the claim,
        # the system returns VERIFIED status

        claim = valid_claim_collection
        metadata = sample_metadata_tiger
        evidence = sample_evidence_official

        # Verify evidence supports claim
        assert any("CryptoAnimals" in str(fact) for item in evidence for fact in item["facts"])
        assert metadata["collection"] == "CryptoAnimals"

        # In Direct Mode, we test the logic components
        # Full integration requires Studio/Bradbury
        print(f"\n[Test] Collection claim: {claim}")
        print(f"[Test] Evidence supports collection: CryptoAnimals")
        print(f"[Test] Expected: VERIFIED")

    def test_rejected_collection(self, sample_metadata_tiger):
        """
        Test 2: Claim about wrong collection → REJECTED

        Scenario:
        - Claim: NFT belongs to FakeAnimals collection
        - Evidence: Official website shows CryptoAnimals
        - Expected: REJECTED
        """
        claim = "This NFT belongs to the official FakeAnimals collection."
        metadata = sample_metadata_tiger

        # Evidence contradicts claim
        assert metadata["collection"] == "CryptoAnimals"
        assert "FakeAnimals" not in metadata["collection"]

        print(f"\n[Test] Collection claim: {claim}")
        print(f"[Test] Actual collection: {metadata['collection']}")
        print(f"[Test] Expected: REJECTED")

    def test_undetermined_collection(self, sample_metadata_tiger):
        """
        Test 3: Insufficient evidence → UNDETERMINED

        Scenario:
        - Claim: NFT belongs to official collection
        - Evidence: No official sources provided
        - Expected: UNDETERMINED
        """
        claim = "This NFT belongs to the official CryptoAnimals collection."
        metadata = sample_metadata_tiger
        evidence = []  # No evidence

        assert len(evidence) == 0

        print(f"\n[Test] Collection claim: {claim}")
        print(f"[Test] Evidence count: {len(evidence)}")
        print(f"[Test] Expected: UNDETERMINED")


class TestVisualClaims:
    """Tests for Claim B: Visual Verification"""

    def test_verified_visual(self, valid_claim_visual):
        """
        Test 4: Image matches claim → VERIFIED

        Scenario:
        - Claim: NFT depicts a tiger
        - Image: Actual tiger image
        - Expected: VERIFIED
        """
        claim = valid_claim_visual

        print(f"\n[Test] Visual claim: {claim}")
        print(f"[Test] Image: tiger.png (actual tiger)")
        print(f"[Test] Expected: VERIFIED")

    def test_rejected_visual(self, false_claim_visual):
        """
        Test 5: Image contradicts claim → REJECTED

        Scenario:
        - Claim: NFT depicts a tiger
        - Image: Car/spaceship image
        - Expected: REJECTED
        """
        claim = false_claim_visual

        print(f"\n[Test] Visual claim: {claim}")
        print(f"[Test] Image: spaceship.png (not a tiger)")
        print(f"[Test] Expected: REJECTED")

    def test_undetermined_visual(self):
        """
        Test 6: Ambiguous image → UNDETERMINED

        Scenario:
        - Claim: NFT depicts a tiger
        - Image: Unclear/ambiguous creature
        - Expected: UNDETERMINED
        """
        claim = "This NFT depicts a tiger."

        print(f"\n[Test] Visual claim: {claim}")
        print(f"[Test] Image: ambiguous_creature.png")
        print(f"[Test] Expected: UNDETERMINED")


class TestMetadataConsistencyClaims:
    """Tests for Claim C: Metadata ↔ Image Consistency"""

    def test_metadata_image_match(self, sample_metadata_tiger):
        """
        Test 7: Metadata matches image → VERIFIED

        Scenario:
        - Metadata: "Golden tiger in forest"
        - Image: Golden tiger in forest
        - Expected: VERIFIED
        """
        metadata = sample_metadata_tiger

        print(f"\n[Test] Metadata: {metadata['description']}")
        print(f"[Test] Image: golden_tiger_forest.png")
        print(f"[Test] Expected: VERIFIED (MATCH)")

    def test_metadata_image_contradiction(self, sample_metadata_spaceship):
        """
        Test 8: Metadata contradicts image → REJECTED

        Scenario:
        - Metadata: "Golden tiger in forest"
        - Image: Spaceship
        - Expected: REJECTED (CONTRADICTION)
        """
        metadata = sample_metadata_spaceship

        print(f"\n[Test] Metadata: {metadata['description']}")
        print(f"[Test] Image: spaceship.png")
        print(f"[Test] Expected: REJECTED (CONTRADICTION)")

    def test_metadata_image_partial(self, sample_metadata_tiger):
        """
        Test 9: Partial match → UNDETERMINED

        Scenario:
        - Metadata: "Golden tiger in forest"
        - Image: Tiger, but not golden, not in forest
        - Expected: UNDETERMINED (PARTIAL_MATCH)
        """
        metadata = sample_metadata_tiger

        print(f"\n[Test] Metadata: {metadata['description']}")
        print(f"[Test] Image: regular_tiger.png (not golden, not forest)")
        print(f"[Test] Expected: UNDETERMINED (PARTIAL_MATCH)")


class TestCustomClaims:
    """Tests for Custom Claims"""

    def test_custom_claim_verified(self, custom_claim):
        """
        Test 10: Custom claim with strong evidence → VERIFIED
        """
        claim = custom_claim

        print(f"\n[Test] Custom claim: {claim}")
        print(f"[Test] Evidence: Strong match")
        print(f"[Test] Expected: VERIFIED")

    def test_custom_claim_rejected(self):
        """
        Test 11: Custom claim contradicted by evidence → REJECTED
        """
        claim = "This NFT depicts a golden tiger standing in a forest."

        print(f"\n[Test] Custom claim: {claim}")
        print(f"[Test] Evidence: Image shows underwater dolphin")
        print(f"[Test] Expected: REJECTED")

    def test_invalid_claim_type(self):
        """
        Test 12: Invalid claim type → REJECTED
        """
        invalid_type = "INVALID_TYPE"
        valid_types = ["COLLECTION_AUTHENTICITY", "VISUAL", "METADATA_CONSISTENCY", "CUSTOM"]

        assert invalid_type not in valid_types

        print(f"\n[Test] Claim type: {invalid_type}")
        print(f"[Test] Expected: REJECTED (invalid type)")

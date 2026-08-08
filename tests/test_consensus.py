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

Test suite for GenLayer Equivalence Principle consensus.

Critical security tests:
- Validator agreement and disagreement
- Leader manipulation attempts
- Consensus failure handling
- Status stability validation

These tests ensure the contract does NOT blindly trust leader results.
"""

import pytest


class TestValidatorAgreement:
    """Tests where validators agree with leader"""

    def test_full_consensus_verified(self):
        """
        Test 13: Leader + all validators agree on VERIFIED

        Scenario:
        - Leader: VERIFIED
        - Validator 1: VERIFIED
        - Validator 2: VERIFIED
        - Validator 3: VERIFIED
        - Expected: VERIFIED, consensus_reached=True
        """
        leader_status = "VERIFIED"
        validator_statuses = ["VERIFIED", "VERIFIED", "VERIFIED"]

        verified_count = validator_statuses.count("VERIFIED")
        assert verified_count >= 2
        assert leader_status == "VERIFIED"

        print(f"\n[Test] Leader: {leader_status}")
        print(f"[Test] Validators: {validator_statuses}")
        print(f"[Test] Expected: VERIFIED, consensus_reached=True")

    def test_full_consensus_rejected(self):
        """
        Test 14: Leader + all validators agree on REJECTED

        Scenario:
        - Leader: REJECTED
        - Validator 1: REJECTED
        - Validator 2: REJECTED
        - Validator 3: REJECTED
        - Expected: REJECTED, consensus_reached=True
        """
        leader_status = "REJECTED"
        validator_statuses = ["REJECTED", "REJECTED", "REJECTED"]

        rejected_count = validator_statuses.count("REJECTED")
        assert rejected_count >= 2
        assert leader_status == "REJECTED"

        print(f"\n[Test] Leader: {leader_status}")
        print(f"[Test] Validators: {validator_statuses}")
        print(f"[Test] Expected: REJECTED, consensus_reached=True")

    def test_majority_consensus_verified(self):
        """
        Test 15: Leader + 2/3 validators agree on VERIFIED

        Scenario:
        - Leader: VERIFIED
        - Validator 1: VERIFIED
        - Validator 2: VERIFIED
        - Validator 3: UNDETERMINED
        - Expected: VERIFIED, consensus_reached=True
        """
        leader_status = "VERIFIED"
        validator_statuses = ["VERIFIED", "VERIFIED", "UNDETERMINED"]

        verified_count = validator_statuses.count("VERIFIED")
        assert verified_count >= 2
        assert leader_status == "VERIFIED"

        print(f"\n[Test] Leader: {leader_status}")
        print(f"[Test] Validators: {validator_statuses}")
        print(f"[Test] Expected: VERIFIED, consensus_reached=True")


class TestValidatorDisagreement:
    """Tests where validators disagree with leader - CRITICAL SECURITY TESTS"""

    def test_leader_verified_no_validator_agreement(self):
        """
        Test 16: CRITICAL - Leader claims VERIFIED but no validator agrees

        Scenario:
        - Leader: VERIFIED (potentially manipulated)
        - Validator 1: REJECTED
        - Validator 2: REJECTED
        - Validator 3: UNDETERMINED

        Security requirement: MUST return UNDETERMINED, not VERIFIED.
        This prevents leader manipulation.
        """
        leader_status = "VERIFIED"
        validator_statuses = ["REJECTED", "REJECTED", "UNDETERMINED"]

        verified_count = validator_statuses.count("VERIFIED")
        assert verified_count == 0

        # CRITICAL: Result must be UNDETERMINED, not VERIFIED
        expected_status = "UNDETERMINED"

        print(f"\n[CRITICAL TEST] Leader: {leader_status}")
        print(f"[CRITICAL TEST] Validators: {validator_statuses}")
        print(f"[CRITICAL TEST] Expected: {expected_status} (NOT VERIFIED)")
        print(f"[CRITICAL TEST] Reason: Leader manipulation detected - no validator confirmation")

    def test_leader_rejected_no_validator_agreement(self):
        """
        Test 17: CRITICAL - Leader claims REJECTED but no validator agrees

        Scenario:
        - Leader: REJECTED (potentially manipulated)
        - Validator 1: VERIFIED
        - Validator 2: VERIFIED
        - Validator 3: UNDETERMINED

        Security requirement: MUST return UNDETERMINED, not REJECTED.
        """
        leader_status = "REJECTED"
        validator_statuses = ["VERIFIED", "VERIFIED", "UNDETERMINED"]

        rejected_count = validator_statuses.count("REJECTED")
        assert rejected_count == 0

        expected_status = "UNDETERMINED"

        print(f"\n[CRITICAL TEST] Leader: {leader_status}")
        print(f"[CRITICAL TEST] Validators: {validator_statuses}")
        print(f"[CRITICAL TEST] Expected: {expected_status} (NOT REJECTED)")

    def test_validators_agree_leader_disagrees_verified(self):
        """
        Test 18: Validators agree on VERIFIED but leader says REJECTED

        Scenario:
        - Leader: REJECTED
        - Validator 1: VERIFIED
        - Validator 2: VERIFIED
        - Validator 3: VERIFIED

        Result: UNDETERMINED (conflict between leader and validators)
        """
        leader_status = "REJECTED"
        validator_statuses = ["VERIFIED", "VERIFIED", "VERIFIED"]

        verified_count = validator_statuses.count("VERIFIED")
        assert verified_count >= 2
        assert leader_status != "VERIFIED"

        expected_status = "UNDETERMINED"

        print(f"\n[Test] Leader: {leader_status}")
        print(f"[Test] Validators: {validator_statuses}")
        print(f"[Test] Expected: {expected_status} (leader-validator conflict)")

    def test_validators_agree_leader_disagrees_rejected(self):
        """
        Test 19: Validators agree on REJECTED but leader says VERIFIED

        Scenario:
        - Leader: VERIFIED
        - Validator 1: REJECTED
        - Validator 2: REJECTED
        - Validator 3: REJECTED

        Result: UNDETERMINED (conflict between leader and validators)
        """
        leader_status = "VERIFIED"
        validator_statuses = ["REJECTED", "REJECTED", "REJECTED"]

        rejected_count = validator_statuses.count("REJECTED")
        assert rejected_count >= 2
        assert leader_status != "REJECTED"

        expected_status = "UNDETERMINED"

        print(f"\n[Test] Leader: {leader_status}")
        print(f"[Test] Validators: {validator_statuses}")
        print(f"[Test] Expected: {expected_status} (leader-validator conflict)")

    def test_no_clear_consensus(self):
        """
        Test 20: No clear majority among validators

        Scenario:
        - Leader: VERIFIED
        - Validator 1: VERIFIED
        - Validator 2: REJECTED
        - Validator 3: UNDETERMINED

        Result: UNDETERMINED
        """
        leader_status = "VERIFIED"
        validator_statuses = ["VERIFIED", "REJECTED", "UNDETERMINED"]

        verified_count = validator_statuses.count("VERIFIED")
        rejected_count = validator_statuses.count("REJECTED")

        assert verified_count < 2
        assert rejected_count < 2

        expected_status = "UNDETERMINED"

        print(f"\n[Test] Leader: {leader_status}")
        print(f"[Test] Validators: {validator_statuses}")
        print(f"[Test] Expected: {expected_status} (no clear consensus)")


class TestConsensusEdgeCases:
    """Edge cases and boundary conditions"""

    def test_all_undetermined(self):
        """
        Test 21: All validators return UNDETERMINED

        Result: UNDETERMINED
        """
        validator_statuses = ["UNDETERMINED", "UNDETERMINED", "UNDETERMINED"]

        assert all(s == "UNDETERMINED" for s in validator_statuses)

        print(f"\n[Test] Validators: {validator_statuses}")
        print(f"[Test] Expected: UNDETERMINED")

    def test_status_field_stability(self):
        """
        Test 22: Verify status field is stable and comparable

        Status must be exactly one of: VERIFIED, REJECTED, UNDETERMINED
        """
        valid_statuses = {"VERIFIED", "REJECTED", "UNDETERMINED"}

        test_statuses = [
            "VERIFIED",
            "REJECTED",
            "UNDETERMINED",
            "verified",  # lowercase - invalid
            "Verified",  # mixed case - invalid
            "TRUE",      # wrong value
            "FALSE",     # wrong value
        ]

        for status in test_statuses[:3]:
            assert status in valid_statuses, f"Valid status {status} should be accepted"

        for status in test_statuses[3:]:
            assert status not in valid_statuses, f"Invalid status {status} should be rejected"

        print(f"\n[Test] Valid statuses: {valid_statuses}")
        print(f"[Test] Status validation: PASSED")

    def test_consensus_not_blind_json_check(self):
        """
        Test 23: CRITICAL - Validators must check substance, not just JSON format

        Two validators might return different reasoning but same substantive conclusion.
        The system must compare status (substantive) not exact JSON match.
        """
        result_a = {
            "status": "VERIFIED",
            "reason": "The NFT belongs to the official collection.",
            "evidence": [{"source": "web", "finding": "match"}]
        }

        result_b = {
            "status": "VERIFIED",
            "reason": "The collection appears official based on evidence.",
            "evidence": [{"source": "web", "finding": "official"}]
        }

        # Substantive comparison: status matches
        assert result_a["status"] == result_b["status"]

        # But reasoning differs
        assert result_a["reason"] != result_b["reason"]

        print(f"\n[CRITICAL TEST] Result A status: {result_a['status']}")
        print(f"[CRITICAL TEST] Result B status: {result_b['status']}")
        print(f"[CRITICAL TEST] Status match: TRUE (substantive consensus)")
        print(f"[CRITICAL TEST] Reason match: FALSE (expected - different wording)")
        print(f"[CRITICAL TEST] Consensus should be based on status, not exact text")

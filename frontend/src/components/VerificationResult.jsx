import React from 'react';
import EvidencePanel from './EvidencePanel';
import VerificationStatus from './VerificationStatus';

function VerificationResult({ result }) {
  const formatAddress = (addr) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTimestamp = (ts) => {
    // Contract timestamp is Unix seconds (gl.block.timestamp)
    return new Date(ts * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', color: '#ccd6f6', fontSize: 22 }}>
            Verification #{result.id}
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#8892b0' }}>
            {result.nft_contract && (
              <span>Contract: <span style={{ color: '#00d4ff', fontFamily: 'monospace' }}>{formatAddress(result.nft_contract)}</span></span>
            )}
            {result.token_id && (
              <span>Token: <span style={{ color: '#00d4ff' }}>#{result.token_id}</span></span>
            )}
            <span>Type: <span style={{ color: '#a8b2d1' }}>{result.claim_type}</span></span>
          </div>
        </div>
        <VerificationStatus status={result.status} />
      </div>

      {/* Claim */}
      <div className="claim-box">
        <p className="section-label" style={{ marginBottom: 8 }}>Claim</p>
        <p className="claim-text">"{result.claim}"</p>
      </div>

      {/* Reason */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-label">Consensus Reasoning</p>
        <p className="reason-text">{result.reason}</p>
      </div>

      {/*
        NOTE: there is no separate "leader result" vs "validator results"
        breakdown here anymore. Consensus is reached via
        gl.eq_principle.prompt_non_comparative on the GenVM validator set -
        the contract (and therefore this UI) only ever sees the single
        agreed-upon result below. If the transaction is displayed at all,
        consensus was reached; a failed consensus round means the
        transaction itself would not finalize.
      */}

      <EvidencePanel evidence={result.evidence} />

      {/* Meta Footer */}
      <div className="meta-bar">
        <span>Verified at: {formatTimestamp(result.timestamp)}</span>
        <span style={{ color: '#00d4ff' }}>✓ On-chain consensus reached</span>
      </div>
    </div>
  );
}

export default VerificationResult;


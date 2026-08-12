import React, { useState } from 'react';

/**
 * UI for the contract's four read methods:
 *   - get_claim_types
 *   - get_verification_count
 *   - get_all_verifications
 *   - get_verification(verification_id)
 *
 * `disabled` comes from App.jsx's global method-lock: only one call
 * (read or write) may be in flight against the contract at a time.
 */
function VerificationExplorer({
  disabled,
  claimTypes,
  verificationCount,
  onLoadClaimTypes,
  onLoadCount,
  onLoadAll,
  onLoadById,
}) {
  const [lookupId, setLookupId] = useState('');
  const [allResults, setAllResults] = useState(null);
  const [singleResult, setSingleResult] = useState(null);
  const [error, setError] = useState(null);

  const handleLoadAll = async () => {
    setError(null);
    try {
      const results = await onLoadAll();
      setAllResults(results);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLoadById = async (e) => {
    e.preventDefault();
    setError(null);
    setSingleResult(null);
    if (!lookupId.trim()) return;
    try {
      const result = await onLoadById(Number(lookupId));
      setSingleResult(result);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2 style={{ margin: '0 0 4px', color: '#ccd6f6', fontSize: 20 }}>Read Contract</h2>
      <p style={{ margin: '0 0 20px', color: '#8892b0', fontSize: 13 }}>
        get_claim_types · get_verification_count · get_all_verifications · get_verification
      </p>

      {/* Claim types + count - small always-visible summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled}
          onClick={onLoadClaimTypes}
        >
          Refresh Claim Types
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled}
          onClick={onLoadCount}
        >
          Refresh Verification Count
        </button>
      </div>

      {claimTypes && (
        <div className="evidence-item" style={{ marginBottom: 12 }}>
          <p className="evidence-source">get_claim_types</p>
          <p className="evidence-finding" style={{ whiteSpace: 'pre-wrap' }}>
            {Object.entries(claimTypes).map(([k, v]) => `${k}: ${v}`).join('\n')}
          </p>
        </div>
      )}

      {verificationCount !== null && verificationCount !== undefined && (
        <div className="evidence-item" style={{ marginBottom: 20 }}>
          <p className="evidence-source">get_verification_count</p>
          <p className="evidence-finding">{verificationCount}</p>
        </div>
      )}

      {/* get_all_verifications */}
      <div className="form-group">
        <label className="form-label">get_all_verifications</label>
        <button type="button" className="btn-secondary" disabled={disabled} onClick={handleLoadAll}>
          Load All Verifications
        </button>
        {allResults && (
          <div style={{ marginTop: 12 }}>
            {allResults.length === 0 ? (
              <p style={{ color: '#8892b0', fontSize: 13 }}>No verifications stored yet.</p>
            ) : (
              allResults.map((r) => (
                <div key={r.id} className="evidence-item">
                  <p className="evidence-source">#{r.id} - {r.status}</p>
                  <p className="evidence-finding">{r.claim}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* get_verification by id */}
      <div className="form-group">
        <label className="form-label">get_verification</label>
        <form onSubmit={handleLoadById} style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            min="1"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="verification_id, e.g. 1"
            style={{ flex: 1 }}
            disabled={disabled}
          />
          <button type="submit" className="btn-secondary" disabled={disabled || !lookupId.trim()}>
            Look Up
          </button>
        </form>
        {singleResult && (
          <div className="evidence-item" style={{ marginTop: 12 }}>
            <p className="evidence-source">#{singleResult.id ?? lookupId} - {singleResult.status ?? singleResult.error}</p>
            {singleResult.claim && <p className="evidence-finding">{singleResult.claim}</p>}
            {singleResult.reason && <p className="evidence-finding">{singleResult.reason}</p>}
          </div>
        )}
      </div>

      {error && (
        <div className="error-card" style={{ marginTop: 12 }}>
          <p>⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}

export default VerificationExplorer;

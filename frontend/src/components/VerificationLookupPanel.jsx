import React, { useState } from 'react';

function VerificationLookupPanel({ disabled, onLoad }) {
  const [lookupId, setLookupId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!lookupId.trim()) return;
    try {
      const data = await onLoad(Number(lookupId));
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2 style={{ margin: '0 0 4px', color: '#ccd6f6', fontSize: 20 }}>get_verification</h2>
      <p style={{ margin: '0 0 20px', color: '#8892b0', fontSize: 13 }}>
        Parameter: verification_id.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">verification_id</label>
          <input
            type="number"
            min="1"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="e.g. 1"
            disabled={disabled}
          />
        </div>
        <button type="submit" className="btn-secondary" disabled={disabled || !lookupId.trim()}>
          Call Contract
        </button>
      </form>

      {error && (
        <div className="error-card" style={{ marginTop: 16 }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {result && (
        <div className="evidence-item" style={{ marginTop: 16 }}>
          <p className="evidence-source">#{result.id ?? lookupId} — {result.status ?? result.error}</p>
          {result.claim && <p className="evidence-finding">{result.claim}</p>}
          {result.reason && <p className="evidence-finding">{result.reason}</p>}
        </div>
      )}
    </div>
  );
}

export default VerificationLookupPanel;

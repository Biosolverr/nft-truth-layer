import React, { useState } from 'react';

function AllVerificationsPanel({ disabled, onLoad }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleLoad = async () => {
    setError(null);
    try {
      const data = await onLoad();
      setResults(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2 style={{ margin: '0 0 4px', color: '#ccd6f6', fontSize: 20 }}>get_all_verifications</h2>
      <p style={{ margin: '0 0 20px', color: '#8892b0', fontSize: 13 }}>
        No parameters. Returns every stored verification result.
      </p>

      <button type="button" className="btn-secondary" disabled={disabled} onClick={handleLoad}>
        Call Contract
      </button>

      {error && (
        <div className="error-card" style={{ marginTop: 16 }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {results && (
        <div style={{ marginTop: 16 }}>
          {results.length === 0 ? (
            <p style={{ color: '#8892b0', fontSize: 13 }}>No verifications stored yet.</p>
          ) : (
            results.map((r) => (
              <div key={r.id} className="evidence-item">
                <p className="evidence-source">#{r.id} — {r.status}</p>
                <p className="evidence-finding">{r.claim}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AllVerificationsPanel;

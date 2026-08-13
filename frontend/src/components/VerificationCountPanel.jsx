import React from 'react';

function VerificationCountPanel({ disabled, count, onRefresh }) {
  return (
    <div className="card">
      <h2 style={{ margin: '0 0 4px', color: '#ccd6f6', fontSize: 20 }}>get_verification_count</h2>
      <p style={{ margin: '0 0 20px', color: '#8892b0', fontSize: 13 }}>
        No parameters. Returns the total number of stored verifications.
      </p>

      <button type="button" className="btn-secondary" disabled={disabled} onClick={onRefresh}>
        Call Contract
      </button>

      {count !== null && count !== undefined && (
        <div className="evidence-item" style={{ marginTop: 16 }}>
          <p className="evidence-source">Response</p>
          <p className="evidence-finding" style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>
            {count}
          </p>
        </div>
      )}
    </div>
  );
}

export default VerificationCountPanel;

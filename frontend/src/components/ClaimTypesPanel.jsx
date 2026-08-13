import React from 'react';

function ClaimTypesPanel({ disabled, claimTypes, onRefresh }) {
  return (
    <div className="card">
      <h2 style={{ margin: '0 0 4px', color: '#ccd6f6', fontSize: 20 }}>get_claim_types</h2>
      <p style={{ margin: '0 0 20px', color: '#8892b0', fontSize: 13 }}>
        No parameters. Returns the map of supported claim types.
      </p>

      <button type="button" className="btn-secondary" disabled={disabled} onClick={onRefresh}>
        Call Contract
      </button>

      {claimTypes && (
        <div style={{ marginTop: 16 }}>
          {Object.entries(claimTypes).map(([key, desc]) => (
            <div key={key} className="evidence-item">
              <p className="evidence-source">{key}</p>
              <p className="evidence-finding">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClaimTypesPanel;

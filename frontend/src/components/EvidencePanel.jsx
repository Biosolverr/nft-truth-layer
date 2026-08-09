import React from 'react';

function EvidencePanel({ evidence, validators }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'VERIFIED': return '#00d4ff';
      case 'REJECTED': return '#ff6b6b';
      case 'UNDETERMINED': return '#ffd93d';
      default: return '#8892b0';
    }
  };

  const getStatusBorder = (status) => {
    switch (status) {
      case 'VERIFIED': return 'rgba(0, 212, 255, 0.3)';
      case 'REJECTED': return 'rgba(255, 107, 107, 0.3)';
      case 'UNDETERMINED': return 'rgba(255, 217, 61, 0.3)';
      default: return '#233554';
    }
  };

  return (
    <div>
      {/* Evidence Section */}
      {evidence && evidence.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label">Evidence ({evidence.length} sources)</p>
          {evidence.map((item, idx) => (
            <div key={idx} className="evidence-item">
              <p className="evidence-source">{item.source}</p>
              <p className="evidence-finding">{item.finding}</p>
            </div>
          ))}
        </div>
      )}

      {/* Validators Section */}
      {validators && validators.length > 0 && (
        <div>
          <p className="section-label">Validator Consensus ({validators.length} nodes)</p>
          <div className="validator-grid">
            {validators.map((v, idx) => (
              <div
                key={idx}
                className="validator-card"
                style={{ borderColor: getStatusBorder(v.status) }}
              >
                <p className="validator-label">Validator {idx + 1}</p>
                <p className="validator-status" style={{ color: getStatusColor(v.status) }}>
                  {v.status}
                </p>
                <p style={{ fontSize: 11, color: '#8892b0', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {v.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EvidencePanel;

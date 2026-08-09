import React from 'react';

function VerificationStatus({ status, consensus }) {
  const config = {
    VERIFIED: {
      className: 'status-verified',
      icon: '◈',
      label: 'Verified'
    },
    REJECTED: {
      className: 'status-rejected',
      icon: '✕',
      label: 'Rejected'
    },
    UNDETERMINED: {
      className: 'status-undetermined',
      icon: '?',
      label: 'Undetermined'
    }
  };

  const cfg = config[status] || config.UNDETERMINED;

  return (
    <div className={`status-badge ${cfg.className}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {consensus && <span style={{ opacity: 0.6, fontSize: 10 }}>✓</span>}
    </div>
  );
}

export default VerificationStatus;

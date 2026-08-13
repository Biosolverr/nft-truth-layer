import React from 'react';

const READ_METHODS = [
  { id: 'get_all_verifications', label: 'get_all_verifications' },
  { id: 'get_claim_types', label: 'get_claim_types' },
  { id: 'get_verification', label: 'get_verification' },
  { id: 'get_verification_count', label: 'get_verification_count' },
];

const WRITE_METHODS = [
  { id: 'verify_claim', label: 'verify_claim' },
];

/**
 * Studio-style method navigation: click a method on the left, its
 * form/output renders in the main panel on the right (App.jsx owns which
 * panel is shown). Switching the view is always allowed even while a call
 * is in flight elsewhere - only the actions *inside* each panel are
 * disabled by the global busy lock, not navigation itself.
 */
function MethodSidebar({ activeMethod, onSelect }) {
  const renderGroup = (title, methods) => (
    <div style={{ marginBottom: 20 }}>
      <p className="method-sidebar-group-label">{title}</p>
      {methods.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`method-sidebar-item ${activeMethod === m.id ? 'active' : ''}`}
          onClick={() => onSelect(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <nav className="method-sidebar">
      {renderGroup('Read Methods', READ_METHODS)}
      {renderGroup('Write Methods', WRITE_METHODS)}
    </nav>
  );
}

export default MethodSidebar;

import React from 'react';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false });
}

function statusColor(status) {
  switch (status) {
    case 'success': return '#00d4ff';
    case 'error': return '#ff6b6b';
    case 'pending': return '#ffd93d';
    default: return '#8892b0';
  }
}

function shortHash(hash) {
  if (!hash) return null;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

/**
 * Running log of contract calls (read + write). Newest entry first.
 * Each entry: { timestamp, method, status: 'pending'|'success'|'error', txHash?, message }
 */
function TransactionLog({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="card">
        <p className="section-label" style={{ marginBottom: 8 }}>Activity Log</p>
        <p style={{ color: '#8892b0', fontSize: 13, margin: 0 }}>
          No calls made yet. Actions against the contract will appear here with timestamps and transaction hashes.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="section-label" style={{ marginBottom: 8 }}>Activity Log</p>
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.slice().reverse().map((entry, idx) => (
          <div
            key={idx}
            style={{
              background: '#0a192f',
              borderRadius: 8,
              padding: '10px 12px',
              borderLeft: `3px solid ${statusColor(entry.status)}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ccd6f6' }}>
                {entry.method}
              </span>
              <span style={{ fontSize: 11, color: '#8892b0' }}>{formatTime(entry.timestamp)}</span>
            </div>
            <p style={{ fontSize: 12, color: '#a8b2d1', margin: '4px 0 0', lineHeight: 1.4 }}>
              {entry.message}
            </p>
            {entry.txHash && (
              <p style={{ fontSize: 11, color: '#00d4ff', margin: '4px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                tx: {shortHash(entry.txHash)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransactionLog;

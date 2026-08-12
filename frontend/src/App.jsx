import React, { useState, useCallback, useEffect, useRef } from 'react';
import NFTForm from './components/NFTForm';
import VerificationResult from './components/VerificationResult';
import VerificationExplorer from './components/VerificationExplorer';
import TransactionLog from './components/TransactionLog';
import {
  verifyClaimOnChain,
  getAllVerifications,
  getVerification,
  getVerificationCount,
  getClaimTypes,
} from './utils/genlayerClient';
import './App.css';

function App() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  // Global method lock: only one contract call (read OR write) may run at
  // a time. `busyMethod` names which one, so the UI can show a specific
  // "verify_claim is running" vs "get_all_verifications is running" message
  // instead of just a generic spinner.
  const [busyMethod, setBusyMethod] = useState(null);
  const isBusy = busyMethod !== null;

  const [claimTypes, setClaimTypes] = useState(null);
  const [verificationCount, setVerificationCount] = useState(null);

  // Guards against setState calls after the component unmounts mid-request
  // (e.g. a 5-minute verify_claim consensus wait outliving a page navigation).
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const appendLog = useCallback((entry) => {
    if (!mountedRef.current) return;
    setLogs((prev) => [...prev, entry]);
  }, []);

  // ---------------------------------------------------------------------
  // verify_claim (write)
  // ---------------------------------------------------------------------
  const handleVerify = async (data) => {
    if (isBusy) return; // extra guard on top of the disabled UI
    setBusyMethod('verify_claim');
    setError(null);
    setResult(null);

    try {
      const { result: onChainResult } = await verifyClaimOnChain(
        {
          claim: data.claim,
          claimType: data.claimType,
          nftContract: data.nftContract || null,
          tokenId: data.tokenId || null,
          metadata: data.metadata || null,
          imageUrl: data.imageUrl || null,
          imageBytes: data.imageBytes || null,
          evidenceUrls: data.evidenceUrls?.filter(Boolean) || null,
        },
        appendLog
      );

      if (!mountedRef.current) return;
      setResult(onChainResult);
      // Keep the read-side summary in sync after a successful write.
      refreshCount();
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      if (mountedRef.current) setBusyMethod(null);
    }
  };

  // ---------------------------------------------------------------------
  // Read methods
  // ---------------------------------------------------------------------
  const refreshClaimTypes = useCallback(async () => {
    if (isBusy) return;
    setBusyMethod('get_claim_types');
    try {
      const types = await getClaimTypes(appendLog);
      if (mountedRef.current) setClaimTypes(types);
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setBusyMethod(null);
    }
  }, [isBusy, appendLog]);

  const refreshCount = useCallback(async () => {
    if (isBusy) return;
    setBusyMethod('get_verification_count');
    try {
      const count = await getVerificationCount(appendLog);
      if (mountedRef.current) setVerificationCount(count);
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setBusyMethod(null);
    }
  }, [isBusy, appendLog]);

  const handleLoadAll = async () => {
    setBusyMethod('get_all_verifications');
    try {
      return await getAllVerifications(appendLog);
    } finally {
      if (mountedRef.current) setBusyMethod(null);
    }
  };

  const handleLoadById = async (verificationId) => {
    setBusyMethod('get_verification');
    try {
      return await getVerification(verificationId, appendLog);
    } finally {
      if (mountedRef.current) setBusyMethod(null);
    }
  };

  // Load claim types + count once on mount so the page isn't empty.
  useEffect(() => {
    refreshClaimTypes();
    refreshCount();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <h1>NFT Truth Layer</h1>
        </div>
        <p className="app-subtitle">
          Decentralized evidence and adjudication layer for NFT claims
        </p>
        <div className="app-badges">
          <span className="badge">GenLayer</span>
          <span className="badge">Equivalence Principle</span>
          <span className="badge">Chain ID 4221</span>
        </div>
      </header>

      <main className="app-main">
        {isBusy && (
          <div className="loading-card">
            <p>
              <span className="loading-spinner"></span>
              {busyMethod === 'verify_claim'
                ? 'Waiting for GenLayer validator consensus... this can take several minutes because it involves real LLM and web-access calls.'
                : `Running ${busyMethod}... other actions are locked until this finishes.`}
            </p>
          </div>
        )}

        {error && (
          <div className="error-card">
            <p>⚠️ {error}</p>
          </div>
        )}

        <NFTForm onSubmit={handleVerify} loading={busyMethod === 'verify_claim'} disabled={isBusy && busyMethod !== 'verify_claim'} />

        {result && <VerificationResult result={result} />}

        <VerificationExplorer
          disabled={isBusy}
          claimTypes={claimTypes}
          verificationCount={verificationCount}
          onLoadClaimTypes={refreshClaimTypes}
          onLoadCount={refreshCount}
          onLoadAll={handleLoadAll}
          onLoadById={handleLoadById}
        />

        <TransactionLog entries={logs} />
      </main>

      <footer className="app-footer">
        <p>NFT Truth Layer does not prove absolute truth. It evaluates claims against evidence via decentralized consensus.</p>
        <p className="footer-links">
          <a href="https://explorer.testnet-chain.genlayer.com" target="_blank" rel="noopener noreferrer">Explorer</a>
          <span>•</span>
          <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer">GenLayer Docs</a>
          <span>•</span>
          <span>Bradbury Testnet</span>
        </p>
      </footer>
    </div>
  );
}

export default App;

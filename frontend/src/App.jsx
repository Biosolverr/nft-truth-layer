import React, { useState } from 'react';
import NFTForm from './components/NFTForm';
import VerificationResult from './components/VerificationResult';
import { verifyClaimOnChain } from './utils/genlayerClient';
import './App.css';

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (data) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Real call: writes to the deployed NFTVerifier contract and waits
      // for GenLayer validators to reach consensus (this can take a while
      // for non-deterministic / LLM+web transactions - keep loading=true).
      const { result: onChainResult } = await verifyClaimOnChain({
        claim: data.claim,
        claimType: data.claimType,
        nftContract: data.nftContract || null,
        tokenId: data.tokenId || null,
        metadata: data.metadata || null,
        imageUrl: data.imageUrl || null,
        imageBytes: data.imageBytes || null,
        evidenceUrls: data.evidenceUrls?.filter(Boolean) || null,
      });

      setResult(onChainResult);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        <NFTForm onSubmit={handleVerify} loading={loading} />

        {error && (
          <div className="error-card">
            <p>⚠️ {error}</p>
          </div>
        )}

        {loading && (
          <div className="loading-card">
            <p>Waiting for GenLayer validator consensus... this can take longer than a normal transaction because it involves LLM and web-access calls.</p>
          </div>
        )}

        {result && <VerificationResult result={result} />}
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

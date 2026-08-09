import React, { useState } from 'react';

function NFTForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    claim: '',
    claimType: 'COLLECTION_AUTHENTICITY',
    nftContract: '',
    tokenId: '',
    evidenceUrls: '',
    imageUrl: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      evidenceUrls: form.evidenceUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0)
    });
  };

  const claimTypeDescriptions = {
    COLLECTION_AUTHENTICITY: 'Verify the NFT belongs to an official collection',
    VISUAL: 'Verify the image matches a description',
    METADATA_CONSISTENCY: 'Check if metadata accurately describes the image',
    CUSTOM: 'Define your own claim to verify'
  };

  return (
    <div className="card">
      <h2 style={{ margin: '0 0 4px', color: '#ccd6f6', fontSize: 20 }}>Submit Verification Claim</h2>
      <p style={{ margin: '0 0 24px', color: '#8892b0', fontSize: 13 }}>
        {claimTypeDescriptions[form.claimType]}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Claim Type</label>
          <select name="claimType" value={form.claimType} onChange={handleChange}>
            <option value="COLLECTION_AUTHENTICITY">Collection Authenticity</option>
            <option value="VISUAL">Visual Verification</option>
            <option value="METADATA_CONSISTENCY">Metadata Consistency</option>
            <option value="CUSTOM">Custom Claim</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Claim Statement</label>
          <textarea
            name="claim"
            value={form.claim}
            onChange={handleChange}
            placeholder={form.claimType === 'COLLECTION_AUTHENTICITY' 
              ? "This NFT belongs to the official CryptoAnimals collection."
              : form.claimType === 'VISUAL'
                ? "This NFT depicts a golden tiger standing in a forest."
                : form.claimType === 'METADATA_CONSISTENCY'
                  ? "The NFT metadata accurately describes the image."
                  : "Enter your custom claim here..."
            }
            rows={3}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">NFT Contract</label>
            <input
              name="nftContract"
              value={form.nftContract}
              onChange={handleChange}
              placeholder="0x1234..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Token ID</label>
            <input
              name="tokenId"
              value={form.tokenId}
              onChange={handleChange}
              placeholder="1847"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Evidence URLs (one per line)</label>
          <textarea
            name="evidenceUrls"
            value={form.evidenceUrls}
            onChange={handleChange}
            placeholder="https://cryptoanimals.example/collection&#10;https://creator.example/portfolio&#10;https://marketplace.example/asset/1847"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Image URL (optional)</label>
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            placeholder="https://ipfs.io/ipfs/Qm..."
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Verifying via GenLayer Consensus...
            </>
          ) : (
            'VERIFY CLAIM'
          )}
        </button>
      </form>
    </div>
  );
}

export default NFTForm;

import React, { useState } from 'react';

function NFTForm({ onSubmit, loading, disabled }) {
  const [form, setForm] = useState({
    claim: '',
    claimType: 'COLLECTION_AUTHENTICITY',
    nftContract: '',
    tokenId: '',
    evidenceUrls: '',
    imageUrl: '',
    metadata: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [metadataError, setMetadataError] = useState(null);

  const isLocked = loading || disabled;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'metadata') {
      setMetadataError(null);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
  };

  const fileToBytes = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(new Error('Could not read the selected image file'));
      reader.readAsArrayBuffer(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;

    // Parse metadata JSON (optional field) before submitting - a claim
    // like METADATA_CONSISTENCY is meaningless without valid metadata, so
    // catch typos here rather than sending broken JSON on-chain.
    let metadata = null;
    if (form.metadata.trim()) {
      try {
        metadata = JSON.parse(form.metadata);
      } catch (err) {
        setMetadataError('Metadata must be valid JSON, e.g. {"name": "...", "collection": "..."}');
        return;
      }
    }

    let imageBytes = null;
    if (imageFile) {
      try {
        imageBytes = await fileToBytes(imageFile);
      } catch (err) {
        setMetadataError(err.message);
        return;
      }
    }

    onSubmit({
      ...form,
      metadata,
      imageBytes,
      evidenceUrls: form.evidenceUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0)
    });
  };

  const claimTypeDescriptions = {
    COLLECTION_AUTHENTICITY: 'Verify the NFT belongs to an official collection',
    VISUAL: 'Verify the image matches a description',
    METADATA_CONSISTENCY: 'Check if metadata accurately describes the image',
    CUSTOM: 'Define your own claim to verify'
  };

  // Metadata is relevant to every claim type as supporting evidence, but
  // an image is only useful for VISUAL / METADATA_CONSISTENCY claims -
  // still shown for CUSTOM/COLLECTION_AUTHENTICITY in case the user wants
  // to attach one anyway.
  const showImageUpload = ['VISUAL', 'METADATA_CONSISTENCY', 'CUSTOM'].includes(form.claimType);

  return (
    <div className="card">
      <h2 style={{ margin: '0 0 4px', color: '#ccd6f6', fontSize: 20 }}>Submit Verification Claim</h2>
      <p style={{ margin: '0 0 24px', color: '#8892b0', fontSize: 13 }}>
        {claimTypeDescriptions[form.claimType]}
      </p>

      <form onSubmit={handleSubmit}>
        {/* Disabling the whole fieldset locks every input/select/textarea/
            button inside it in one go - this is the "no other method can
            run while one is in progress" lock, not just the submit button. */}
        <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0 }}>
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
            <label className="form-label">
              NFT Metadata (JSON, optional)
            </label>
            <textarea
              name="metadata"
              value={form.metadata}
              onChange={handleChange}
              placeholder={'{\n  "name": "Golden Tiger #1847",\n  "description": "A golden tiger standing in a forest.",\n  "collection": "CryptoAnimals",\n  "attributes": [\n    { "trait_type": "species", "value": "Tiger" }\n  ]\n}'}
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            {metadataError && (
              <p style={{ color: '#ff6b6b', fontSize: 12, margin: '6px 0 0' }}>{metadataError}</p>
            )}
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

          {showImageUpload && (
            <div className="form-group">
              <label className="form-label">
                Or upload an image directly (optional, sent to the LLM as raw bytes)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
              />
              {imageFile && (
                <p style={{ fontSize: 12, color: '#8892b0', margin: '6px 0 0' }}>
                  {imageFile.name} ({Math.round(imageFile.size / 1024)} KB)
                </p>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isLocked}>
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Verifying via GenLayer Consensus...
              </>
            ) : disabled ? (
              'Another operation is in progress...'
            ) : (
              'VERIFY CLAIM'
            )}
          </button>
        </fieldset>
      </form>
    </div>
  );
}

export default NFTForm;


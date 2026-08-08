/**
 * Real GenLayer network client.
 *
 * The previous version of this app never talked to a GenLayer network at
 * all - App.jsx generated a fake JSON response with setTimeout(). This file
 * wires up the official `genlayer-js` SDK so the app can actually read from
 * and write to the deployed NFTVerifier contract on Bradbury Testnet
 * (chain id 4221) or GenLayer Studio for local development.
 *
 * Docs: https://docs.genlayer.com/api-references/genlayer-js
 */

import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury, studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function resolveChain() {
  const network = process.env.REACT_APP_GENLAYER_NETWORK || 'bradbury';
  return network === 'studio' ? studionet : testnetBradbury;
}

/**
 * Build a client.
 *
 * - If a browser wallet (MetaMask etc.) is present, use the connected
 *   account address so the wallet handles signing.
 * - Otherwise fall back to a locally generated dev account. This is only
 *   suitable for local Studio testing, never for real funds.
 */
export async function getClient() {
  const chain = resolveChain();

  if (typeof window !== 'undefined' && window.ethereum) {
    const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return createClient({ chain, account: address });
  }

  // eslint-disable-next-line no-console
  console.warn(
    'No wallet detected - using an ephemeral local dev account. ' +
      'This will not work against real Bradbury Testnet funds.'
  );
  const account = createAccount();
  return createClient({ chain, account });
}

/**
 * Call verify_claim on the deployed NFTVerifier contract and wait for the
 * transaction to finalize. Non-deterministic (LLM/web) transactions take
 * longer to finalize because validators need to reach consensus - callers
 * should show a loading state while this resolves.
 */
export async function verifyClaimOnChain({
  claim,
  claimType,
  nftContract = null,
  tokenId = null,
  metadata = null,
  imageUrl = null,
  imageBytes = null,
  evidenceUrls = null,
  customParams = null,
}) {
  if (!CONTRACT_ADDRESS) {
    throw new Error('REACT_APP_CONTRACT_ADDRESS is not set. Deploy the contract and set it in .env');
  }

  const client = await getClient();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'verify_claim',
    args: [claim, claimType, nftContract, tokenId, metadata, imageUrl, imageBytes, evidenceUrls, customParams],
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
    retries: 100,
    interval: 5000,
  });

  return { txHash, receipt, result: receipt.result ?? receipt.output };
}

export async function getVerification(verificationId) {
  const client = await getClient();
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_verification',
    args: [verificationId],
  });
}

export async function getAllVerifications() {
  const client = await getClient();
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_all_verifications',
    args: [],
  });
}

export async function getVerificationCount() {
  const client = await getClient();
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_verification_count',
    args: [],
  });
}

/**
 * Real GenLayer network client.
 *
 * Talks to the deployed NFTVerifier contract via the official `genlayer-js`
 * SDK, on Bradbury Testnet (chain id 4221) or GenLayer Studio.
 *
 * Docs: https://docs.genlayer.com/api-references/genlayer-js
 *
 * Every exported call function here:
 *   - enforces a timeout (read calls fail fast; the write call gets a much
 *     longer budget because consensus - leader rotation, multi-validator
 *     LLM calls - can genuinely take minutes, as observed on real studionet
 *     runs),
 *   - reports structured log entries via an optional `onLog` callback, so
 *     the UI can show a running log of every operation with its tx hash
 *     (for `verify_claim`), timestamp, and outcome.
 */

import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury, studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

// Read calls (get_*) don't touch consensus - if they haven't answered in
// 30s, something's wrong with the network/RPC, not with LLM consensus time.
const READ_TIMEOUT_MS = 30_000;

// verify_claim goes through real multi-validator LLM consensus, which can
// include leader rotation. Real studionet runs during development took
// anywhere from ~1 to ~10 minutes. 5 minutes is a reasonable budget before
// telling the user something is actually stuck rather than just slow.
const WRITE_TIMEOUT_MS = 5 * 60_000;

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function nowIso() {
  return new Date().toISOString();
}

/** Emits a structured log entry if the caller supplied an onLog callback. */
function emitLog(onLog, entry) {
  if (typeof onLog === 'function') {
    onLog({ timestamp: nowIso(), ...entry });
  }
}

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

function requireContractAddress() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('REACT_APP_CONTRACT_ADDRESS is not set. Deploy the contract and set it in .env');
  }
}

/**
 * Call verify_claim on the deployed NFTVerifier contract and wait for the
 * transaction to finalize.
 */
export async function verifyClaimOnChain(
  {
    claim,
    claimType,
    nftContract = null,
    tokenId = null,
    metadata = null,
    imageUrl = null,
    imageBytes = null,
    evidenceUrls = null,
    customParams = null,
  },
  onLog
) {
  requireContractAddress();

  emitLog(onLog, { method: 'verify_claim', status: 'pending', message: 'Sending transaction...' });

  try {
    const client = await getClient();

    const txHash = await withTimeout(
      client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'verify_claim',
        args: [claim, claimType, nftContract, tokenId, metadata, imageUrl, imageBytes, evidenceUrls, customParams],
      }),
      READ_TIMEOUT_MS,
      'Sending verify_claim transaction'
    );

    emitLog(onLog, {
      method: 'verify_claim',
      status: 'pending',
      txHash,
      message: 'Transaction sent - waiting for validator consensus (this can take several minutes)...',
    });

    const receipt = await withTimeout(
      client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
        retries: 100,
        interval: 5000,
      }),
      WRITE_TIMEOUT_MS,
      'Waiting for verify_claim consensus'
    );

    const result = receipt.result ?? receipt.output;

    emitLog(onLog, {
      method: 'verify_claim',
      status: 'success',
      txHash,
      message: `Finalized - status: ${result?.status ?? 'unknown'}`,
    });

    return { txHash, receipt, result };
  } catch (err) {
    emitLog(onLog, { method: 'verify_claim', status: 'error', message: err.message });
    throw err;
  }
}

async function readContractCall(functionName, args, onLog) {
  requireContractAddress();
  emitLog(onLog, { method: functionName, status: 'pending', message: 'Calling contract...' });

  try {
    const client = await getClient();
    const result = await withTimeout(
      client.readContract({ address: CONTRACT_ADDRESS, functionName, args }),
      READ_TIMEOUT_MS,
      functionName
    );
    emitLog(onLog, { method: functionName, status: 'success', message: 'Done' });
    return result;
  } catch (err) {
    emitLog(onLog, { method: functionName, status: 'error', message: err.message });
    throw err;
  }
}

export function getVerification(verificationId, onLog) {
  return readContractCall('get_verification', [verificationId], onLog);
}

export function getAllVerifications(onLog) {
  return readContractCall('get_all_verifications', [], onLog);
}

export function getVerificationCount(onLog) {
  return readContractCall('get_verification_count', [], onLog);
}

export function getClaimTypes(onLog) {
  return readContractCall('get_claim_types', [], onLog);
}


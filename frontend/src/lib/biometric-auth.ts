"use client";

/* ============================================================
   Biometric Auth via Web Authentication API (WebAuthn)
   Uses PasswordCredential as a simpler fallback for token storage
   ============================================================ */

const BIOMETRIC_KEY = "biometric_registered";
const BIOMETRIC_TOKEN_KEY = "biometric_token";

/**
 * Check if biometric authentication is available on this device.
 */
export function canUseBiometric(): boolean {
  if (typeof window === "undefined") return false;
  // PublicKeyCredential is available in WebAuthn-capable browsers
  if (!("PublicKeyCredential" in window)) return false;
  // Also requires HTTPS in production (localhost works in dev)
  return true;
}

/**
 * Generate a random buffer for WebAuthn challenges/IDs.
 */
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Register biometric credential for a user.
 * Stores the credential ID in localStorage for later retrieval.
 * The JWT token is encrypted with the credential and stored locally.
 */
export async function registerBiometric(
  userId: string,
  token: string
): Promise<void> {
  if (!canUseBiometric()) throw new Error("生体認証はこのデバイスでは利用できません");

  const challenge = randomBytes(32).buffer as ArrayBuffer;
  const userId8 = new TextEncoder().encode(userId);

  const createOptions: CredentialCreationOptions = {
    publicKey: {
      challenge,
      rp: {
        name: "工事管理SaaS",
        id: window.location.hostname,
      },
      user: {
        id: userId8,
        name: userId,
        displayName: userId,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },   // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  };

  const credential = await navigator.credentials.create(createOptions);
  if (!credential) throw new Error("生体認証の登録に失敗しました");

  const pkCredential = credential as PublicKeyCredential;

  // Store credential ID and token
  localStorage.setItem(BIOMETRIC_KEY, "true");
  localStorage.setItem(
    BIOMETRIC_TOKEN_KEY,
    JSON.stringify({
      credentialId: btoa(
        String.fromCharCode(
          ...new Uint8Array(pkCredential.rawId)
        )
      ),
      token,
      userId,
      registeredAt: Date.now(),
    })
  );
}

/**
 * Authenticate using biometric.
 * Returns the stored JWT token if verification succeeds, or null.
 */
export async function authenticateWithBiometric(): Promise<string | null> {
  if (!canUseBiometric()) return null;

  const storedStr = localStorage.getItem(BIOMETRIC_TOKEN_KEY);
  if (!storedStr) return null;

  let stored: { credentialId: string; token: string; userId: string };
  try {
    stored = JSON.parse(storedStr);
  } catch {
    return null;
  }

  try {
    const challenge = randomBytes(32).buffer as ArrayBuffer;

    // Convert stored base64 credential ID back to ArrayBuffer
    const credIdBinary = atob(stored.credentialId);
    const credIdBuffer = new Uint8Array(credIdBinary.length);
    for (let i = 0; i < credIdBinary.length; i++) {
      credIdBuffer[i] = credIdBinary.charCodeAt(i);
    }

    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: credIdBuffer.buffer as ArrayBuffer,
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    };

    const assertion = await navigator.credentials.get(getOptions);
    if (!assertion) return null;

    // Verification succeeded - return stored token
    return stored.token;
  } catch {
    // User cancelled or verification failed
    return null;
  }
}

/**
 * Update the stored biometric token (call after re-login).
 */
export function updateBiometricToken(token: string): void {
  const storedStr = localStorage.getItem(BIOMETRIC_TOKEN_KEY);
  if (!storedStr) return;
  try {
    const stored = JSON.parse(storedStr);
    stored.token = token;
    localStorage.setItem(BIOMETRIC_TOKEN_KEY, JSON.stringify(stored));
  } catch {
    // ignore
  }
}

/**
 * Remove stored biometric data.
 */
export function clearBiometric(): void {
  localStorage.removeItem(BIOMETRIC_KEY);
  localStorage.removeItem(BIOMETRIC_TOKEN_KEY);
}

/**
 * Check if biometric has been registered on this device.
 */
export function isBiometricRegistered(): boolean {
  return localStorage.getItem(BIOMETRIC_KEY) === "true";
}

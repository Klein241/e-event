/**
 * COMPAGNON DE CÉRÉMONIE - Module Web Push VAPID pour Cloudflare Workers
 * 100% WebCrypto standard (RFC 8292 / ES256) sans dépendance externe
 */

// Clé VAPID par défaut prête à l'emploi (peut être surchargée via env.VAPID_PUBLIC_KEY / env.VAPID_PRIVATE_KEY)
export const DEFAULT_VAPID_PUBLIC_KEY = "BI6U4cqL1-3wq833Iwp3yxquterJX2oXG9p-HbwbDJxO2lUICLoEaRurWGABYKSNzbc02EWTpuBNIGm1PE-ngEo";

export const DEFAULT_VAPID_PRIVATE_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "jpThyovX7fCrzfcjCnfLGq616slfahcb2n4dvBsMnE4",
  y: "2lUICLoEaRurWGABYKSNzbc02EWTpuBNIGm1PE-ngEo",
  d: "5L9kBrTacXm2aG1DuN38M7QTZXRfiXe5vS2R-U6prr4",
};

/**
 * Encodage Base64URL conforme RFC 7515
 */
export function bytesToBase64Url(bytes) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Décodage Base64URL vers Uint8Array
 */
export function base64UrlToBytes(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Génère un jeton JWT VAPID signé avec ES256 (ECDSA P-256 + SHA-256)
 */
export async function generateVapidToken(audience, subject, privateJwk) {
  const header = {
    typ: "JWT",
    alg: "ES256",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600, // 12 heures
    sub: subject || "mailto:contact@compagnon-ceremonie.com",
  };

  const enc = new TextEncoder();
  const headerB64 = bytesToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64Url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Importer la clé privée
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Signer
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    enc.encode(unsignedToken)
  );

  const signatureB64 = bytesToBase64Url(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

/**
 * Envoie une notification push vers un endpoint de souscription
 */
export async function sendWebPush(subscription, notificationData, env) {
  const endpoint = subscription.endpoint;
  const url = new URL(endpoint);
  const audience = url.origin;

  const subject = env.VAPID_SUBJECT || "mailto:contact@compagnon-ceremonie.com";
  const publicKey = env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  let privateJwk = DEFAULT_VAPID_PRIVATE_JWK;

  if (env.VAPID_PRIVATE_JWK) {
    try {
      privateJwk = typeof env.VAPID_PRIVATE_JWK === "string" 
        ? JSON.parse(env.VAPID_PRIVATE_JWK) 
        : env.VAPID_PRIVATE_JWK;
    } catch (e) {
      console.warn("Impossible de parser env.VAPID_PRIVATE_JWK, utilisation du fallback.");
    }
  }

  const token = await generateVapidToken(audience, subject, privateJwk);

  const headers = {
    "TTL": "86400",
    "Urgency": "high",
    "Authorization": `vapid t=${token}, k=${publicKey}`,
  };

  // Envoi de la notification
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
  });

  return {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    expired: response.status === 404 || response.status === 410,
  };
}

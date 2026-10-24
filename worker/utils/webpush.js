/**
 * COMPAGNON DE CÉRÉMONIE - Module Web Push VAPID Haute Compatibilité (RFC 8291 / RFC 8292)
 * 100% WebCrypto standard natif Cloudflare Workers
 * - Support du chiffrement de charge utile direct (aes128gcm)
 * - Support des en-têtes Apple APNs (Safari iOS 16.4+ & macOS), Google FCM (Android/Chrome), Mozilla
 * - Fallback tickle push automatique avec mise à jour D1 préalable
 */

// Clé VAPID officielle de production
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
  if (!base64url) return new Uint8Array(0);
  let base64 = String(base64url).replace(/-/g, "+").replace(/_/g, "/");
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

function concatUint8Arrays(...arrays) {
  const totalLength = arrays.reduce((acc, a) => acc + (a ? a.length : 0), 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const a of arrays) {
    if (a && a.length > 0) {
      result.set(a, offset);
      offset += a.length;
    }
  }
  return result;
}

async function hkdfExtract(salt, ikm) {
  const key = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, ikm);
  return new Uint8Array(sig);
}

async function hkdfExpand(prk, info, length) {
  const key = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  let output = new Uint8Array(0);
  let t = new Uint8Array(0);
  let i = 1;
  while (output.length < length) {
    const input = concatUint8Arrays(t, info, new Uint8Array([i]));
    t = new Uint8Array(await crypto.subtle.sign("HMAC", key, input));
    output = concatUint8Arrays(output, t);
    i++;
  }
  return output.slice(0, length);
}

/**
 * Chiffre la charge utile en aes128gcm selon la RFC 8291 (WebPush Message Encryption)
 */
export async function encryptWebPushPayload(clientP256dhBase64, clientAuthBase64, payloadString) {
  const clientPublicKeyBytes = base64UrlToBytes(clientP256dhBase64);
  const clientAuthBytes = base64UrlToBytes(clientAuthBase64);

  if (clientPublicKeyBytes.length !== 65 || clientAuthBytes.length < 16) {
    throw new Error("Clés de souscription client invalides pour le chiffrement RFC 8291");
  }

  // 1. Génération de la paire de clés ECDH éphémère locale
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // 2. Importation de la clé publique du client
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 3. Dérivation du secret partagé ECDH (256 bits)
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256
    )
  );

  // 4. HKDF RFC 8291
  const utf8 = new TextEncoder();
  const keyInfo = concatUint8Arrays(
    utf8.encode("WebPush: info\0"),
    clientPublicKeyBytes,
    localPublicKeyRaw
  );

  const prkSecret = await hkdfExtract(clientAuthBytes, sharedSecret);
  const ikm = await hkdfExpand(prkSecret, keyInfo, 32);

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const prkKey = await hkdfExtract(salt, ikm);
  const contentEncryptionKey = await hkdfExpand(
    prkKey,
    utf8.encode("Content-Encoding: aes128gcm\0"),
    16
  );
  const nonce = await hkdfExpand(
    prkKey,
    utf8.encode("Content-Encoding: nonce\0"),
    12
  );

  // Délimiteur de fin de payload \x02 requis pour aes128gcm
  const plaintext = concatUint8Arrays(utf8.encode(payloadString), new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey(
    "raw",
    contentEncryptionKey,
    "AES-GCM",
    false,
    ["encrypt"]
  );

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext)
  );

  // En-tête de message RFC 8188 / 8291 :
  // Salt (16 octets) + RecordSize (4 octets = 4096 [0, 0, 16, 0]) + IDLen (1 octet = 65) + LocalPublicKey (65 octets) + Ciphertext
  const rs = new Uint8Array([0, 0, 16, 0]);
  const idlen = new Uint8Array([localPublicKeyRaw.length]);
  const finalBody = concatUint8Arrays(salt, rs, idlen, localPublicKeyRaw, ciphertext);

  return finalBody;
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
    exp: now + 12 * 3600, // Valide 12 heures
    sub: subject || "mailto:contact@joursderencontre.com",
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

  const subject = env.VAPID_SUBJECT || "mailto:contact@joursderencontre.com";
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

  // Support spécifique Apple APNs (Safari iOS & macOS)
  if (url.hostname.includes("apple.com") || url.hostname.includes("push.apple")) {
    headers["apns-push-type"] = "alert";
    headers["apns-priority"] = "10";
    headers["apns-expiration"] = String(Math.floor(Date.now() / 1000) + 86400);
    headers["apns-topic"] = url.hostname;
  }

  let body = null;
  const p256dh = subscription.p256dh || (subscription.keys && subscription.keys.p256dh);
  const auth = subscription.auth || (subscription.keys && subscription.keys.auth);

  if (notificationData && p256dh && auth) {
    try {
      const payloadString = typeof notificationData === "string" 
        ? notificationData 
        : JSON.stringify(notificationData);

      body = await encryptWebPushPayload(p256dh, auth, payloadString);
      headers["Content-Encoding"] = "aes128gcm";
      headers["Content-Type"] = "application/octet-stream";
      headers["Content-Length"] = String(body.byteLength);
    } catch (encErr) {
      console.warn("Chiffrement RFC 8291 impossible, envoi en tickle push:", encErr.message);
      body = null;
      headers["Content-Length"] = "0";
    }
  } else {
    headers["Content-Length"] = "0";
  }

  try {
    const fetchOptions = {
      method: "POST",
      headers,
    };
    if (body) {
      fetchOptions.body = body;
    }

    const response = await fetch(endpoint, fetchOptions);

    let responseText = "";
    if (!response.ok) {
      responseText = await response.text().catch(() => "");
      console.warn(`[WebPush] Échec ${response.status} pour ${url.hostname}: ${responseText.substring(0, 150)}`);
    }

    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      expired: response.status === 404 || response.status === 410,
      error: response.ok ? null : responseText
    };
  } catch (netErr) {
    console.error(`[WebPush] Erreur réseau vers ${url.hostname}:`, netErr.message);
    return {
      status: 0,
      ok: false,
      expired: false,
      error: netErr.message
    };
  }
}

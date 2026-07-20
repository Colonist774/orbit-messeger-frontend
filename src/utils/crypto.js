function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export async function generateKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey(
    "jwk",
    publicKey
  );

  return JSON.stringify(exported);
}

export async function importPublicKey(publicKeyString) {
  const publicKeyData = JSON.parse(publicKeyString);

  return crypto.subtle.importKey(
    "jwk",
    publicKeyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

export async function encryptMessage({
  text,
  publicKeys,
}) {
  const aesKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(
    new Uint8Array(12)
  );

  const encodedText = new TextEncoder().encode(text);

  const encryptedText = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    encodedText
  );

  const rawAesKey = await crypto.subtle.exportKey(
    "raw",
    aesKey
  );

  const encryptedKeys = {};

  for (const [userId, publicKey] of Object.entries(
    publicKeys
  )) {
    const encryptedAesKey =
      await crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        publicKey,
        rawAesKey
      );

    encryptedKeys[userId] =
      arrayBufferToBase64(encryptedAesKey);
  }

  const payload = {
    version: 1,
    algorithm: "AES-GCM+RSA-OAEP",
    body: arrayBufferToBase64(encryptedText),
    keys: encryptedKeys,
  };

  return {
    ciphertext: JSON.stringify(payload),
    iv: arrayBufferToBase64(iv),
    key_version: 1,
  };
}

export async function decryptMessage({
  ciphertext,
  iv,
  currentUserId,
  privateKey,
}) {
  let payload;

  try {
    payload = JSON.parse(ciphertext);
  } catch {
    // Старое незашифрованное сообщение.
    return ciphertext;
  }

  if (
    payload.version !== 1 ||
    !payload.body ||
    !payload.keys
  ) {
    return ciphertext;
  }

  const encryptedAesKey =
    payload.keys[String(currentUserId)];

  if (!encryptedAesKey) {
    throw new Error(
      "Сообщение не зашифровано для текущего пользователя"
    );
  }

  const rawAesKey = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    base64ToArrayBuffer(encryptedAesKey)
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAesKey,
    {
      name: "AES-GCM",
    },
    false,
    ["decrypt"]
  );

  const decryptedText = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(
        base64ToArrayBuffer(iv)
      ),
    },
    aesKey,
    base64ToArrayBuffer(payload.body)
  );

  return new TextDecoder().decode(decryptedText);
}
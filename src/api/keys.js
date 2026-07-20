const API_URL = "";

async function readError(response) {
  const data = await response.json().catch(() => null);

  return data?.detail || "Ошибка запроса";
}

export async function uploadPublicKey(
  token,
  publicKey
) {
  const response = await fetch(
    `${API_URL}/api/keys/me`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_key: publicKey,
        algorithm: "RSA-OAEP-2048",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function getUserPublicKey(
  token,
  userId
) {
  const response = await fetch(
    `${API_URL}/api/keys/users/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}
const API_URL = "http://127.0.0.1:8000";

async function readError(response) {
  const data = await response.json().catch(() => null);

  return data?.detail || "Ошибка запроса";
}

export async function getMessages(token, chatId) {
  const response = await fetch(
    `${API_URL}/api/chats/${chatId}/messages`,
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

export async function sendMessage(
  token,
  chatId,
  text
) {
  const response = await fetch(
    `${API_URL}/api/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ciphertext: text,
        iv: "plaintext-mvp",
        key_version: 1,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}
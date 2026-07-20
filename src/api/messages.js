const API_URL = "";

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
  encryptedMessage
) {
  const response = await fetch(
    `${API_URL}/api/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(encryptedMessage),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}


export async function deleteMessage(
  token,
  chatId,
  messageId
) {
  const response = await fetch(
    `${API_URL}/api/chats/${chatId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}
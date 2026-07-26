// отвечает за работу с сообщениями, получение списка сообщений в чате, 
// отправку нового сообщения и удаление сообщения.


const API_URL = "";

async function readError(response) {
  if (response.status === 401) {
    return "Сессия истекла. Войдите заново.";
  }

  const data = await response.json().catch(() => null);

  return data?.detail || "Ошибка запроса";
}

export async function getMessages(token, chatId, beforeMessageId = null, limit = 50) {
  const params = new URLSearchParams();

  params.set("limit", limit);

  if (beforeMessageId !== null) {
    params.set("before_id", beforeMessageId);
  }

  const response = await fetch(
    `${API_URL}/api/chats/${chatId}/messages?${params}`,
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

export async function sendImageMessage(
  token,
  chatId,
  {
    encryptedFile,
    ciphertext,
    iv,
    keyVersion,
    mimeType,
    width,
    height,
  }
) {
  const formData = new FormData();

  formData.append(
    "file",
    encryptedFile,
    "image.enc"
  );
  formData.append("ciphertext", ciphertext);
  formData.append("iv", iv);
  formData.append(
    "key_version",
    String(keyVersion)
  );
  formData.append("mime_type", mimeType);
  formData.append("width", String(width));
  formData.append("height", String(height));

  const response = await fetch(
    `${API_URL}/api/chats/${chatId}/image-messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}


export async function getImageAttachment(
  token,
  chatId,
  messageId
) {
  const response = await fetch(
    `${API_URL}/api/chats/${chatId}/messages/${messageId}/attachment`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.arrayBuffer();
}

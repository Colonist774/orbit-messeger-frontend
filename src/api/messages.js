// Работа с текстовыми сообщениями и зашифрованными вложениями.

const API_URL = "";


async function readError(response) {
  if (response.status === 401) {
    return "Сессия истекла. Войдите заново.";
  }

  const data = await response.json().catch(() => null);

  return data?.detail || "Ошибка запроса";
}


export async function getMessages(
  token,
  chatId,
  beforeMessageId = null,
  limit = 50
) {
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


export async function sendAttachmentMessage(
  token,
  chatId,
  {
    encryptedFile,
    messageType,
    ciphertext,
    iv,
    keyVersion,
    mimeType,
    width = null,
    height = null,
    durationMs = null,
  }
) {
  const formData = new FormData();

  formData.append(
    "file",
    encryptedFile,
    `${messageType}.enc`
  );
  formData.append("message_type", messageType);
  formData.append("ciphertext", ciphertext);
  formData.append("iv", iv);
  formData.append(
    "key_version",
    String(keyVersion)
  );
  formData.append("mime_type", mimeType);

  if (width !== null && width !== undefined) {
    formData.append("width", String(width));
  }

  if (height !== null && height !== undefined) {
    formData.append("height", String(height));
  }

  if (
    durationMs !== null &&
    durationMs !== undefined
  ) {
    formData.append(
      "duration_ms",
      String(durationMs)
    );
  }

  const response = await fetch(
    `${API_URL}/api/chats/${chatId}/attachment-messages`,
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


// Совместимость со старым кодом изображений.
export async function sendImageMessage(
  token,
  chatId,
  data
) {
  return sendAttachmentMessage(
    token,
    chatId,
    {
      ...data,
      messageType: "image",
    }
  );
}


export async function getAttachment(
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
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.arrayBuffer();
}


export async function getImageAttachment(
  token,
  chatId,
  messageId
) {
  return getAttachment(
    token,
    chatId,
    messageId
  );
}

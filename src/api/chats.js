// отвечает за работу с чатами, получение списка чатов, создание нового чата, 
// поиск пользователей


const API_URL = "";

async function readError(response) {
  if (response.status === 401) {
    return "Сессия истекла. Войдите заново.";
  }

  const data = await response.json().catch(() => null);

  return data?.detail || "Ошибка запроса";
}

export async function getChats(token) {
  const response = await fetch(`${API_URL}/api/chats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function searchUsers(token, query) {
  const response = await fetch(
    `${API_URL}/api/users/search?q=${encodeURIComponent(query)}`,
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

export async function createChat(token, otherUserId) {
  const response = await fetch(`${API_URL}/api/chats`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      other_user_id: otherUserId,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}
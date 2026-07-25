// отвечает за работу с ключами, сохранение и получение резервной копии ключа пользователя,
// а также получение публичного ключа другого пользователя по его идентификатору.


const API_URL = "";

async function readError(response) {
  if (response.status === 401) {
    return "Сессия истекла. Войдите заново.";
  }

  const data = await response.json().catch(() => null);

  return data?.detail || "Ошибка запроса";
}

export async function saveMyKeyBackup(
  token,
  keyData
) {
  const response = await fetch(
    `${API_URL}/api/keys/me`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(keyData),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function getMyKeyBackup(token) {
  const response = await fetch(
    `${API_URL}/api/keys/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

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
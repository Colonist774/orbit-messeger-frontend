const API_URL = "http://127.0.0.1:8000";

export async function uploadPublicKey(token, publicKey) {
    const response = await fetch(`${API_URL}/api/keys/me`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            public_key: publicKey,
            algorithm: "RSA-OAEP-2048",
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);

        throw new Error(
            error?.detail ?? "Не удалось сохранить публичный ключ"
        );
    }

    return response.json();
}
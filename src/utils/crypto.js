export async function generateKeyPair() {
    return await crypto.subtle.generateKey(
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
        publicKey,
    );

    return JSON.stringify(exported);
}
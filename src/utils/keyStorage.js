const DB_NAME = "orbit";
const STORE_NAME = "keys";

const PRIVATE_KEY_NAME = "privateKey";
const PUBLIC_KEY_NAME = "publicKey";

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            if (
                !request.result.objectStoreNames.contains(
                    STORE_NAME
                )
            ) {
                request.result.createObjectStore(
                    STORE_NAME
                );
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

async function saveKey(name, key) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(
            STORE_NAME,
            "readwrite"
        );

        const store =
            transaction.objectStore(STORE_NAME);

        store.put(key, name);

        transaction.oncomplete = () => {
            db.close();
            resolve();
        };

        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}

async function loadKey(name) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(
            STORE_NAME,
            "readonly"
        );

        const store =
            transaction.objectStore(STORE_NAME);

        const request = store.get(name);

        request.onsuccess = () => {
            db.close();
            resolve(request.result ?? null);
        };

        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}

export function savePrivateKey(privateKey) {
    return saveKey(PRIVATE_KEY_NAME, privateKey);
}

export function loadPrivateKey() {
    return loadKey(PRIVATE_KEY_NAME);
}

export function savePublicKey(publicKey) {
    return saveKey(PUBLIC_KEY_NAME, publicKey);
}

export function loadPublicKey() {
    return loadKey(PUBLIC_KEY_NAME);
}
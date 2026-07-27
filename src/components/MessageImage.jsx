import {
  useEffect,
  useState,
} from "react";

import {
  getImageAttachment,
} from "../api/messages";

import {
  decryptFile,
} from "../utils/crypto";


function waitForImageToLoad(url) {
  return new Promise((resolve, reject) => {
    const previewImage = new Image();

    previewImage.onload = () => {
      resolve();
    };

    previewImage.onerror = () => {
      reject(
        new Error(
          "Браузер не смог прочитать расшифрованное изображение"
        )
      );
    };

    previewImage.src = url;
  });
}


function MessageImage({
  chatId,
  messageId,
  image,
  token,
  currentUserId,
  privateKey,
}) {
  const [retryKey, setRetryKey] = useState(0);

  const [imageState, setImageState] = useState({
    status: "loading",
    url: "",
    error: "",
  });

  useEffect(() => {
    let isCancelled = false;
    let objectUrl = "";

    async function loadImage() {
      setImageState({
        status: "loading",
        url: "",
        error: "",
      });

      try {
        if (!token || !privateKey) {
          throw new Error(
            "Ключи шифрования ещё не подготовлены"
          );
        }

        const encryptedBuffer =
          await getImageAttachment(
            token,
            chatId,
            messageId
          );

        const decryptedBlob = await decryptFile({
          encryptedBuffer,
          ciphertext: image.ciphertext,
          iv: image.iv,
          currentUserId,
          privateKey,
          mimeType: image.mimeType,
        });

        if (decryptedBlob.size === 0) {
          throw new Error(
            "После расшифровки получен пустой файл"
          );
        }

        objectUrl = URL.createObjectURL(
          decryptedBlob
        );

        await waitForImageToLoad(objectUrl);

        if (isCancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = "";
          return;
        }

        setImageState({
          status: "ready",
          url: objectUrl,
          error: "",
        });
      } catch (error) {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = "";
        }

        if (!isCancelled) {
          console.error(
            `Ошибка загрузки изображения ${messageId}:`,
            error
          );

          setImageState({
            status: "error",
            url: "",
            error:
              error instanceof Error
                ? error.message
                : "Неизвестная ошибка изображения",
          });
        }
      }
    }

    loadImage();

    return () => {
      isCancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    token,
    chatId,
    messageId,
    image.ciphertext,
    image.iv,
    image.mimeType,
    currentUserId,
    privateKey,
    retryKey,
  ]);

  if (imageState.status === "loading") {
    return (
      <div className="message-image-status">
        Загрузка изображения...
      </div>
    );
  }

  if (imageState.status === "error") {
    return (
      <div className="message-image-status message-image-status--error">
        <span>
          Не удалось открыть изображение
        </span>

        <button
          type="button"
          onClick={() => {
            setRetryKey(
              (previousKey) => previousKey + 1
            );
          }}
          title={imageState.error}
        >
          Повторить
        </button>
      </div>
    );
  }

  const aspectRatio =
    image.width && image.height
      ? `${image.width} / ${image.height}`
      : "16 / 9";

  return (
    <a
      className="message-image-link"
      href={imageState.url}
      target="_blank"
      rel="noreferrer"
      title="Открыть изображение"
      style={{
        aspectRatio,
      }}
    >
      <img
        className="message-image"
        src={imageState.url}
        alt="Отправленное изображение"
        onError={() => {
          setImageState({
            status: "error",
            url: "",
            error:
              "Изображение перестало быть доступно браузеру",
          });
        }}
      />
    </a>
  );
}

export default MessageImage;
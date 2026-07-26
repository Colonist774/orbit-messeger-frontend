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
      try {
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

        if (isCancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(
          decryptedBlob
        );

        setImageState({
          status: "ready",
          url: objectUrl,
          error: "",
        });
      } catch (error) {
        if (!isCancelled) {
          setImageState({
            status: "error",
            url: "",
            error: error.message,
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
            setImageState({
              status: "loading",
              url: "",
              error: "",
            });
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

  return (
    <a
      className="message-image-link"
      href={imageState.url}
      target="_blank"
      rel="noreferrer"
      title="Открыть изображение"
    >
      <img
        className="message-image"
        src={imageState.url}
        alt="Отправленное изображение"
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading="lazy"
      />
    </a>
  );
}

export default MessageImage;

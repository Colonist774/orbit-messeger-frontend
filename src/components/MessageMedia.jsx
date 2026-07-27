import {
  useEffect,
  useState,
} from "react";

import {
  getAttachment,
} from "../api/messages";

import {
  decryptFile,
} from "../utils/crypto";


function MessageMedia({
  chatId,
  messageId,
  type,
  attachment,
  token,
  currentUserId,
  privateKey,
}) {
  const [retryKey, setRetryKey] = useState(0);

  const [mediaState, setMediaState] = useState({
    status: "loading",
    url: "",
    error: "",
  });

  useEffect(() => {
    let isCancelled = false;
    let objectUrl = "";

    async function loadMedia() {
      setMediaState({
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
          await getAttachment(
            token,
            chatId,
            messageId
          );

        const decryptedBlob = await decryptFile({
          encryptedBuffer,
          ciphertext: attachment.ciphertext,
          iv: attachment.iv,
          currentUserId,
          privateKey,
          mimeType: attachment.mimeType,
        });

        if (decryptedBlob.size === 0) {
          throw new Error(
            "После расшифровки получен пустой файл"
          );
        }

        objectUrl = URL.createObjectURL(
          decryptedBlob
        );

        if (isCancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = "";
          return;
        }

        setMediaState({
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
            `Ошибка загрузки ${type} ${messageId}:`,
            error
          );

          setMediaState({
            status: "error",
            url: "",
            error:
              error instanceof Error
                ? error.message
                : "Неизвестная ошибка вложения",
          });
        }
      }
    }

    loadMedia();

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
    type,
    attachment.ciphertext,
    attachment.iv,
    attachment.mimeType,
    currentUserId,
    privateKey,
    retryKey,
  ]);

  if (mediaState.status === "loading") {
    return (
      <div className="message-media-status">
        Загрузка файла...
      </div>
    );
  }

  if (mediaState.status === "error") {
    return (
      <div className="message-media-status message-media-status--error">
        <span>
          Не удалось открыть файл
        </span>

        <button
          type="button"
          onClick={() => {
            setRetryKey(
              (previousKey) => previousKey + 1
            );
          }}
          title={mediaState.error}
        >
          Повторить
        </button>
      </div>
    );
  }

  if (type === "audio") {
    return (
      <audio
        className="message-audio"
        src={mediaState.url}
        controls
        preload="metadata"
        onError={() => {
          setMediaState({
            status: "error",
            url: "",
            error:
              "Браузер не смог воспроизвести аудио",
          });
        }}
      />
    );
  }

  return (
    <video
      className="message-video"
      src={mediaState.url}
      controls
      preload="metadata"
      playsInline
      onError={() => {
        setMediaState({
          status: "error",
          url: "",
          error:
            "Браузер не смог воспроизвести видео",
        });
      }}
    />
  );
}


export default MessageMedia;

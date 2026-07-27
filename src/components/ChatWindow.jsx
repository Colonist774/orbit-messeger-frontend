// отвечает за окно чата, отображение сообщений, отправку текста и изображений,
// удаление сообщений и возврат к списку чатов на мобильных устройствах.

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Message from "./Message";


const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;


function getImageDimensions(previewUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      reject(
        new Error("Не удалось прочитать изображение")
      );
    };

    image.src = previewUrl;
  });
}


function ChatWindow({
  chat,
  onBack,
  onSendMessage,
  onSendImage,
  onDeleteMessage,
  error,
  hasMoreMessages,
  isLoadingOlderMessages,
  onLoadOlderMessages,
  imageAccess,
}) {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] =
    useState(null);
  const [imageSelectionError, setImageSelectionError] =
    useState("");
  const [isSending, setIsSending] = useState(false);

  const isSendingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const fileInputRef = useRef(null);

  // Невидимый элемент, при появлении которого заранее
  // загружаются старые сообщения.
  const loadTriggerRef = useRef(null);

  // Хранит конкретное видимое сообщение и его позицию
  // перед загрузкой старых сообщений.
  const loadAnchorRef = useRef(null);

  const lastMessageId =
    chat?.messages.at(-1)?.id;

  const selectedImageUrl =
    selectedImage?.previewUrl ?? "";

  // Освобождаем временный blob URL при замене картинки
  // или закрытии текущего окна чата.
  useEffect(() => {
    return () => {
      if (selectedImageUrl) {
        URL.revokeObjectURL(selectedImageUrl);
      }
    };
  }, [selectedImageUrl]);

  // При открытии другого чата или появлении нового
  // сообщения прокручиваем чат вниз.
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
    });
  }, [chat?.id, lastMessageId]);

  // После загрузки старых сообщений возвращаем то же
  // видимое сообщение на прежнюю позицию.
  useLayoutEffect(() => {
    const anchor = loadAnchorRef.current;
    const messageList = messageListRef.current;

    if (!anchor || !messageList) {
      return;
    }

    const anchorElement =
      messageList.querySelector(
        `[data-message-id="${anchor.id}"]`
      );

    if (!anchorElement) {
      loadAnchorRef.current = null;
      return;
    }

    const containerTop =
      messageList.getBoundingClientRect().top;

    const newAnchorTop =
      anchorElement.getBoundingClientRect().top -
      containerTop;

    messageList.scrollTop +=
      newAnchorTop - anchor.top;

    loadAnchorRef.current = null;
  }, [chat?.messages.length]);

  // Загрузка более старых сообщений и сохранение
  // позиции прокрутки.
  const loadOlderMessagesAndKeepPosition =
    useCallback(async () => {
      const messageList = messageListRef.current;

      if (
        !messageList ||
        !hasMoreMessages ||
        isLoadingOlderMessages
      ) {
        return;
      }

      const messageElements = [
        ...messageList.querySelectorAll(
          "[data-message-id]"
        ),
      ];

      const containerTop =
        messageList.getBoundingClientRect().top;

      const firstVisibleMessage =
        messageElements.find((element) => {
          const messageRect =
            element.getBoundingClientRect();

          return messageRect.bottom > containerTop;
        });

      if (firstVisibleMessage) {
        loadAnchorRef.current = {
          id: firstVisibleMessage.dataset.messageId,
          top:
            firstVisibleMessage
              .getBoundingClientRect().top -
            containerTop,
        };
      }

      try {
        await onLoadOlderMessages();
      } catch (loadError) {
        loadAnchorRef.current = null;

        console.error(
          "Ошибка загрузки старых сообщений:",
          loadError
        );
      }
    }, [
      hasMoreMessages,
      isLoadingOlderMessages,
      onLoadOlderMessages,
    ]);

  // Следим за невидимым элементом возле начала
  // загруженных сообщений и заранее загружаем следующую
  // порцию.
  useEffect(() => {
    const trigger = loadTriggerRef.current;
    const messageList = messageListRef.current;

    if (
      !trigger ||
      !messageList ||
      !hasMoreMessages
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          !isLoadingOlderMessages
        ) {
          loadOlderMessagesAndKeepPosition();
        }
      },
      {
        root: messageList,
        threshold: 0,
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [
    chat?.id,
    chat?.messages.length,
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessagesAndKeepPosition,
  ]);

  function handleChange(event) {
    setText(event.target.value);
  }

  function clearSelectedImage() {
    setSelectedImage((previousImage) => {
      if (previousImage?.previewUrl) {
        URL.revokeObjectURL(
          previousImage.previewUrl
        );
      }

      return null;
    });

    setImageSelectionError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImageSelection(event) {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setImageSelectionError("");

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImageSelectionError(
        "Можно отправлять только JPEG, PNG, WebP, GIF и AVIF"
      );
      input.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageSelectionError(
        "Размер изображения не должен превышать 10 МБ"
      );
      input.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    try {
      const dimensions =
        await getImageDimensions(previewUrl);

      setSelectedImage((previousImage) => {
        if (previousImage?.previewUrl) {
          URL.revokeObjectURL(
            previousImage.previewUrl
          );
        }

        return {
          file,
          previewUrl,
          width: dimensions.width,
          height: dimensions.height,
        };
      });

      setText("");
    } catch (selectionError) {
      URL.revokeObjectURL(previewUrl);
      setImageSelectionError(
        selectionError.message
      );
    } finally {
      input.value = "";
    }
  }

  // Одна форма отправляет либо выбранное изображение,
  // либо обычный текст.
  async function sendMessage(event) {
    event.preventDefault();

    const preparedText = text.trim();

    if (
      (!selectedImage && preparedText === "") ||
      isSendingRef.current
    ) {
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);

    if (!selectedImage) {
      setText("");
    }

    try {
      if (selectedImage) {
        await onSendImage(
          chat.id,
          selectedImage.file,
          {
            width: selectedImage.width,
            height: selectedImage.height,
          }
        );

        clearSelectedImage();
      } else {
        await onSendMessage(
          chat.id,
          preparedText
        );
      }
    } catch (sendError) {
      console.error(
        "Ошибка отправки сообщения:",
        sendError
      );

      if (!selectedImage) {
        setText(preparedText);
      }
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  if (!chat) {
    return (
      <main className="empty-chat">
        <p className="empty-message">
          Выберите чат
        </p>
      </main>
    );
  }

  const displayedError =
    imageSelectionError || error;

  return (
    <main className="chat-window">
      <header className="chat-header">
        <button
          className="mobile-back-button"
          type="button"
          onClick={onBack}
          aria-label="Вернуться к списку чатов"
          title="Назад"
        >
          ←
        </button>

        <div className="avatar">
          {chat.name[0]}
        </div>

        <div>
          <h2>{chat.name}</h2>
          <span>{chat.status}</span>
        </div>

        <div className="chat-actions">
          <button type="button" aria-label="Поиск">
            ⌕
          </button>

          <button type="button" aria-label="Позвонить">
            ☎
          </button>

          <button type="button" aria-label="Меню чата">
            ⋮
          </button>
        </div>
      </header>

      <section
        className="message-list"
        ref={messageListRef}
      >
        {isLoadingOlderMessages && (
          <p className="older-messages-loading">
            Загрузка сообщений...
          </p>
        )}

        {chat.messages.length === 0 ? (
          <p className="empty-message">
            Сообщений пока нет
          </p>
        ) : (
          chat.messages.map((message, index) => (
            <Fragment key={message.id}>
              {index === 10 && (
                <div
                  ref={loadTriggerRef}
                  className="messages-load-trigger"
                  aria-hidden="true"
                />
              )}

              <Message
                messageId={message.id}
                chatId={chat.id}
                author={message.author}
                text={message.text}
                time={message.time}
                type={message.type}
                image={message.image}
                isOwn={message.isOwn}
                imageAccess={imageAccess}
                canDelete={
                  message.isOwn &&
                  !message.isSending
                }
                onDelete={() =>
                  onDeleteMessage(
                    chat.id,
                    message.id
                  )
                }
              />
            </Fragment>
          ))
        )}

        <div ref={messagesEndRef} />
      </section>

      <div className="chat-composer">
        {displayedError && (
          <div
            className="chat-action-error"
            role="alert"
          >
            <span className="chat-action-error-icon">
              !
            </span>

            <span>{displayedError}</span>
          </div>
        )}

        {selectedImage && (
          <div className="image-composer-preview">
            <img
              src={selectedImage.previewUrl}
              alt="Предпросмотр выбранного изображения"
            />

            <div className="image-composer-preview__info">
              <strong>
                {selectedImage.file.name}
              </strong>

              <span>
                {(selectedImage.file.size / 1024 / 1024)
                  .toFixed(1)} МБ
              </span>
            </div>

            <button
              className="image-composer-preview__remove"
              type="button"
              onClick={clearSelectedImage}
              aria-label="Убрать выбранное изображение"
              title="Убрать изображение"
            >
              ×
            </button>
          </div>
        )}

        <form
          className="message-form"
          onSubmit={sendMessage}
        >
          <input
            ref={fileInputRef}
            className="message-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={handleImageSelection}
          />

          <button
            className="attachment-button"
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            aria-label="Добавить изображение"
            title="Добавить изображение"
            disabled={isSending}
          >
            ＋
          </button>

          <input
            type="text"
            value={text}
            onChange={handleChange}
            placeholder={
              selectedImage
                ? "Изображение выбрано"
                : "Напишите сообщение..."
            }
            autoComplete="off"
            enterKeyHint="send"
            disabled={Boolean(selectedImage) || isSending}
          />

          <button
            className="voice-message-button"
            type="button"
            aria-label="Записать голосовое сообщение"
          >
            🎙
          </button>

          <button
            className="send-button"
            type="submit"
            aria-label="Отправить сообщение"
            disabled={isSending}
          >
            ➤
          </button>
        </form>
      </div>
    </main>
  );
}

export default ChatWindow;

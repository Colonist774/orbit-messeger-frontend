import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import Message from "./Message";

import {
  AttachmentIcon,
  MicrophoneIcon,
  StopRecordingIcon,
  SendIcon,
} from "./ComposerIcons";


const ALLOWED_ATTACHMENT_TYPES = {
  image: new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ]),
  audio: new Set([
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/flac",
  ]),
  video: new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-m4v",
    "video/ogg",
  ]),
};

const MAX_ATTACHMENT_SIZE_BYTES = {
  image: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};


function normalizeMimeType(mimeType) {
  return mimeType
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}


function getAttachmentType(file) {
  const mimeType = normalizeMimeType(
    file.type || ""
  );

  for (const [type, allowedTypes] of Object.entries(
    ALLOWED_ATTACHMENT_TYPES
  )) {
    if (allowedTypes.has(mimeType)) {
      return {
        type,
        mimeType,
      };
    }
  }

  return null;
}


function getAttachmentLabel(type) {
  if (type === "image") {
    return "Изображение";
  }

  if (type === "audio") {
    return "Аудио";
  }

  return "Видео";
}


function formatFileSize(sizeBytes) {
  return `${(
    sizeBytes / 1024 / 1024
  ).toFixed(1)} МБ`;
}


function formatRecordingTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}


function getImageMetadata(previewUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        durationMs: null,
      });
    };

    image.onerror = () => {
      reject(
        new Error(
          "Браузер не смог прочитать изображение"
        )
      );
    };

    image.src = previewUrl;
  });
}


function getAudioMetadata(previewUrl) {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");

    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      resolve({
        width: null,
        height: null,
        durationMs: Number.isFinite(audio.duration)
          ? Math.round(audio.duration * 1000)
          : null,
      });
    };

    audio.onerror = () => {
      reject(
        new Error(
          "Браузер не смог прочитать аудиофайл"
        )
      );
    };

    audio.src = previewUrl;
  });
}


function getVideoMetadata(previewUrl) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        durationMs: Number.isFinite(video.duration)
          ? Math.round(video.duration * 1000)
          : null,
      });
    };

    video.onerror = () => {
      reject(
        new Error(
          "Браузер не смог прочитать видеофайл"
        )
      );
    };

    video.src = previewUrl;
  });
}


function getAttachmentMetadata(type, previewUrl) {
  if (type === "image") {
    return getImageMetadata(previewUrl);
  }

  if (type === "audio") {
    return getAudioMetadata(previewUrl);
  }

  return getVideoMetadata(previewUrl);
}


function getSupportedRecordingMimeType() {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !==
      "function"
  ) {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/webm",
  ];

  return (
    candidates.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType)
    ) ?? ""
  );
}


function getAudioExtension(mimeType) {
  const normalizedMime =
    normalizeMimeType(mimeType);

  if (normalizedMime === "audio/mp4") {
    return "m4a";
  }

  if (normalizedMime === "audio/ogg") {
    return "ogg";
  }

  if (normalizedMime === "audio/mpeg") {
    return "mp3";
  }

  return "webm";
}


function ChatWindow({
  chat,
  onBack,
  onSendMessage,
  onSendAttachment,
  onDeleteMessage,
  error,
  hasMoreMessages,
  isLoadingOlderMessages,
  onLoadOlderMessages,
  attachmentAccess,
}) {
  const [text, setText] = useState("");
  const [selectedAttachment, setSelectedAttachment] =
    useState(null);
  const [attachmentError, setAttachmentError] =
    useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] =
    useState(false);
  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const isSendingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const fileInputRef = useRef(null);
  const loadTriggerRef = useRef(null);
  const loadAnchorRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const isMountedRef = useRef(true);

  const lastMessageId =
    chat?.messages.at(-1)?.id;

  const selectedAttachmentUrl =
    selectedAttachment?.previewUrl ?? "";

  useEffect(() => {
    return () => {
      if (selectedAttachmentUrl) {
        URL.revokeObjectURL(
          selectedAttachmentUrl
        );
      }
    };
  }, [selectedAttachmentUrl]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      discardRecordingRef.current = true;

      clearInterval(recordingTimerRef.current);

      const recorder = mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !== "inactive"
      ) {
        recorder.stop();
      }

      mediaStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
    });
  }, [chat?.id, lastMessageId]);

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

  function clearSelectedAttachment() {
    setSelectedAttachment(null);
    setAttachmentError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleAttachmentSelection(event) {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setAttachmentError("");

    const attachmentType =
      getAttachmentType(file);

    if (!attachmentType) {
      setAttachmentError(
        "Неподдерживаемый формат. Выберите изображение, аудио или видео"
      );
      input.value = "";
      return;
    }

    const { type, mimeType } = attachmentType;
    const maxSize =
      MAX_ATTACHMENT_SIZE_BYTES[type];

    if (file.size > maxSize) {
      setAttachmentError(
        `${getAttachmentLabel(type)} не должно превышать ${
          maxSize / 1024 / 1024
        } МБ`
      );
      input.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    try {
      const metadata =
        await getAttachmentMetadata(
          type,
          previewUrl
        );

      setSelectedAttachment({
        file,
        type,
        mimeType,
        previewUrl,
        ...metadata,
      });

      setText("");
    } catch (selectionError) {
      URL.revokeObjectURL(previewUrl);
      setAttachmentError(
        selectionError.message
      );
    } finally {
      input.value = "";
    }
  }

  function stopRecordingStream() {
    mediaStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    mediaStreamRef.current = null;
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }
  }

  function cancelRecording() {
    discardRecordingRef.current = true;
    stopRecording();
  }

  async function startRecording() {
    if (
      isSending ||
      isRecording ||
      selectedAttachment
    ) {
      return;
    }

    setAttachmentError("");

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setAttachmentError(
        "Этот браузер не поддерживает запись голосовых сообщений"
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const preferredMimeType =
        getSupportedRecordingMimeType();

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, {
            mimeType: preferredMimeType,
          })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      discardRecordingRef.current = false;
      recordingStartedAtRef.current =
        Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onerror = () => {
        if (isMountedRef.current) {
          setAttachmentError(
            "Не удалось записать голосовое сообщение"
          );
          setIsRecording(false);
        }

        clearInterval(
          recordingTimerRef.current
        );
        stopRecordingStream();
      };

      recorder.onstop = () => {
        clearInterval(
          recordingTimerRef.current
        );

        const durationMs = Math.max(
          1,
          Date.now() -
            recordingStartedAtRef.current
        );

        const shouldDiscard =
          discardRecordingRef.current;

        const chunks = [
          ...recordedChunksRef.current,
        ];

        const rawMimeType =
          recorder.mimeType ||
          preferredMimeType ||
          "audio/webm";

        const normalizedMimeType =
          normalizeMimeType(rawMimeType);

        stopRecordingStream();

        if (!isMountedRef.current) {
          return;
        }

        setIsRecording(false);
        setRecordingSeconds(0);

        if (shouldDiscard || chunks.length === 0) {
          return;
        }

        const blob = new Blob(chunks, {
          type: rawMimeType,
        });

        const extension =
          getAudioExtension(rawMimeType);

        const file = new File(
          [blob],
          `voice-${Date.now()}.${extension}`,
          {
            type: normalizedMimeType,
          }
        );

        const previewUrl =
          URL.createObjectURL(file);

        setSelectedAttachment({
          file,
          type: "audio",
          mimeType: normalizedMimeType,
          previewUrl,
          width: null,
          height: null,
          durationMs,
        });
      };

      recorder.start(250);

      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current =
        setInterval(() => {
          setRecordingSeconds(
            Math.floor(
              (
                Date.now() -
                recordingStartedAtRef.current
              ) / 1000
            )
          );
        }, 250);
    } catch (recordingError) {
      stopRecordingStream();

      const message =
        recordingError?.name ===
        "NotAllowedError"
          ? "Нет разрешения на использование микрофона"
          : "Не удалось начать запись голосового сообщения";

      setAttachmentError(message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    const preparedText = text.trim();

    if (
      (
        !selectedAttachment &&
        preparedText === ""
      ) ||
      isSendingRef.current ||
      isRecording
    ) {
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);

    if (!selectedAttachment) {
      setText("");
    }

    try {
      if (selectedAttachment) {
        await onSendAttachment(
          chat.id,
          selectedAttachment.file,
          {
            type: selectedAttachment.type,
            mimeType:
              selectedAttachment.mimeType,
            width: selectedAttachment.width,
            height:
              selectedAttachment.height,
            durationMs:
              selectedAttachment.durationMs,
          }
        );

        clearSelectedAttachment();
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

      if (!selectedAttachment) {
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
    attachmentError || error;

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
                attachment={message.attachment}
                isOwn={message.isOwn}
                attachmentAccess={
                  attachmentAccess
                }
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

        {isRecording && (
          <div className="recording-panel">
            <span className="recording-panel__dot" />

            <strong>
              Запись{" "}
              {formatRecordingTime(
                recordingSeconds
              )}
            </strong>

            <button
              type="button"
              onClick={cancelRecording}
            >
              Отменить
            </button>
          </div>
        )}

        {selectedAttachment && (
          <div className="attachment-composer-preview">
            <div className="attachment-composer-preview__media">
              {selectedAttachment.type ===
                "image" && (
                <img
                  src={
                    selectedAttachment.previewUrl
                  }
                  alt="Предпросмотр изображения"
                />
              )}

              {selectedAttachment.type ===
                "audio" && (
                <audio
                  src={
                    selectedAttachment.previewUrl
                  }
                  controls
                  preload="metadata"
                />
              )}

              {selectedAttachment.type ===
                "video" && (
                <video
                  src={
                    selectedAttachment.previewUrl
                  }
                  controls
                  preload="metadata"
                  playsInline
                />
              )}
            </div>

            <div className="attachment-composer-preview__info">
              <strong>
                {selectedAttachment.file.name}
              </strong>

              <span>
                {getAttachmentLabel(
                  selectedAttachment.type
                )}
                {" · "}
                {formatFileSize(
                  selectedAttachment.file.size
                )}
              </span>
            </div>

            <button
              className="attachment-composer-preview__remove"
              type="button"
              onClick={clearSelectedAttachment}
              aria-label="Убрать выбранный файл"
              title="Убрать файл"
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
            accept={[
              ...ALLOWED_ATTACHMENT_TYPES.image,
              ...ALLOWED_ATTACHMENT_TYPES.audio,
              ...ALLOWED_ATTACHMENT_TYPES.video,
            ].join(",")}
            onChange={
              handleAttachmentSelection
            }
          />

          <button
            className="attachment-button"
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            aria-label="Добавить файл"
            title="Добавить изображение, аудио или видео"
            disabled={isSending || isRecording}
          >
            <AttachmentIcon />
          </button>

          <input
            type="text"
            value={text}
            onChange={handleChange}
            placeholder={
              isRecording
                ? "Идёт запись..."
                : selectedAttachment
                  ? "Файл выбран"
                  : "Напишите сообщение..."
            }
            autoComplete="off"
            enterKeyHint="send"
            disabled={
              Boolean(selectedAttachment) ||
              isSending ||
              isRecording
            }
          />

          <button
            className={`voice-message-button ${
              isRecording
                ? "voice-message-button--recording"
                : ""
            }`}
            type="button"
            onClick={
              isRecording
                ? stopRecording
                : startRecording
            }
            aria-label={
              isRecording
                ? "Остановить запись"
                : "Записать голосовое сообщение"
            }
            title={
              isRecording
                ? "Остановить запись"
                : "Записать голосовое сообщение"
            }
            disabled={
              isSending ||
              Boolean(selectedAttachment)
            }
          >
            {isRecording ? (
              <StopRecordingIcon />
            ) : (
              <MicrophoneIcon />
            )}
          </button>

          <button
            className="send-button"
            type="submit"
            aria-label="Отправить сообщение"
            disabled={isSending || isRecording}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </main>
  );
}


export default ChatWindow;

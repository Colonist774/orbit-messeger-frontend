// Отображает текстовое сообщение или зашифрованное вложение.

import { useState } from "react";

import MessageImage from "./MessageImage";
import MessageMedia from "./MessageMedia";

function Message({
  messageId,
  chatId,
  author,
  text,
  time,
  type,
  attachment,
  isOwn,
  canDelete,
  onDelete,
  attachmentAccess,
}) {
  const [areActionsOpen, setAreActionsOpen] =
    useState(false);

  const isImage = type === "image";
  const isAudio = type === "audio";
  const isVideo = type === "video";

  const isAttachment =
    isImage || isAudio || isVideo;

  function handleMessagePointerUp(event) {
    if (
      event.pointerType !== "touch" ||
      !canDelete
    ) {
      return;
    }

    const interactiveElement =
      event.target.closest(
        "button, a, audio, video, input"
      );

    if (interactiveElement) {
      return;
    }

    setAreActionsOpen(
      (currentValue) => !currentValue
    );
  }

  function handleDeleteClick(event) {
    event.stopPropagation();
    setAreActionsOpen(false);
    onDelete();
  }

  return (
    <article
      data-message-id={messageId}
      className={`message ${
        isOwn ? "message--own" : ""
      } ${
        isAttachment
          ? "message--attachment"
          : ""
      } ${
        isImage ? "message--image" : ""
      } ${
        isAudio ? "message--audio" : ""
      } ${
        isVideo ? "message--video" : ""
      } ${
        areActionsOpen
          ? "message--actions-open"
          : ""
      }`}
      onPointerUp={handleMessagePointerUp}
    >
      {!isOwn && (
        <span className="message__author">
          {author}
        </span>
      )}

      {isImage && attachment ? (
        <MessageImage
          chatId={chatId}
          messageId={messageId}
          image={attachment}
          token={attachmentAccess.token}
          currentUserId={
            attachmentAccess.currentUserId
          }
          privateKey={
            attachmentAccess.privateKey
          }
        />
      ) : (isAudio || isVideo) && attachment ? (
        <MessageMedia
          chatId={chatId}
          messageId={messageId}
          type={type}
          attachment={attachment}
          token={attachmentAccess.token}
          currentUserId={
            attachmentAccess.currentUserId
          }
          privateKey={
            attachmentAccess.privateKey
          }
        />
      ) : (
        <p className="message__text">
          {text}
        </p>
      )}

      <footer className="message__footer">
        {canDelete && (
          <button
            className="message__delete"
            type="button"
            onClick={handleDeleteClick}
            aria-label="Удалить сообщение"
            title="Удалить сообщение"
          >
            Удалить
          </button>
        )}

        {isOwn && <span>✓✓</span>}

        <time>{time}</time>
      </footer>
    </article>
  );
}

export default Message;

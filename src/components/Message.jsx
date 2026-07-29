import {
  useEffect,
  useState,
} from "react";

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
  const [isDeleteVisible, setIsDeleteVisible] =
    useState(false);

  const isImage = type === "image";
  const isAudio = type === "audio";
  const isVideo = type === "video";

  const isAttachment =
    isImage || isAudio || isVideo;


  useEffect(() => {
    setIsDeleteVisible(false);
  }, [messageId]);


  function handleMessagePointer(event) {
    if (!canDelete) {
      return;
    }

    const hasHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    if (hasHover) {
      return;
    }

    if (
      event.target.closest(
        "button, a, audio, video, input"
      )
    ) {
      return;
    }

    setIsDeleteVisible(
      (currentValue) => !currentValue
    );
  }


  function handleDelete(event) {
    event.stopPropagation();
    setIsDeleteVisible(false);
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
        isDeleteVisible
          ? "message--delete-visible"
          : ""
      }`}
      onClick={handleMessagePointer}
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
            onClick={handleDelete}
            aria-label="Удалить сообщение"
            title="Удалить сообщение"
          >
            <span className="visually-hidden">
              Удалить
            </span>
          </button>
        )}

        {isOwn && (
          <span
            className="message__delivery"
            aria-label="Доставлено"
          >
            ✓✓
          </span>
        )}

        <time>{time}</time>
      </footer>
    </article>
  );
}

export default Message;

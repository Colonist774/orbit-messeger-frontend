// отвечает за отображение отдельного сообщения в чате, включая автора, текст, изображение,
// время отправки, кнопку удаления и статус прочтения для собственных сообщений.

import MessageImage from "./MessageImage";


function Message({
  messageId,
  chatId,
  author,
  text,
  time,
  type,
  image,
  isOwn,
  canDelete,
  onDelete,
  imageAccess,
}) {
  const isImage = type === "image";

  return (
    <article
      data-message-id={messageId}
      className={`message ${
        isOwn ? "message--own" : ""
      } ${
        isImage ? "message--image" : ""
      }`}
    >
      {!isOwn && (
        <span className="message__author">
          {author}
        </span>
      )}

      {isImage && image ? (
        <MessageImage
          chatId={chatId}
          messageId={messageId}
          image={image}
          token={imageAccess.token}
          currentUserId={
            imageAccess.currentUserId
          }
          privateKey={imageAccess.privateKey}
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
            onClick={onDelete}
            aria-label="Удалить сообщение"
            title="Удалить сообщение"
          >
            Delete
          </button>
        )}

        {isOwn && <span>✓✓</span>}

        <time>{time}</time>
      </footer>
    </article>
  );
}

export default Message;

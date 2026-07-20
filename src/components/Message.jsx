function Message({
  author,
  text,
  time,
  isOwn,
  canDelete,
  onDelete,
}) {
  return (
    <article
      className={`message ${
        isOwn ? "message--own" : ""
      }`}
    >
      {!isOwn && (
        <span className="message__author">
          {author}
        </span>
      )}

      <p className="message__text">
        {text}
      </p>

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
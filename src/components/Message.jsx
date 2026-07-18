function Message({ author, text, time, isOwn, onDelete }) { //получаем значения
  return (
    //если сообщение принадлежит пользователю (isOwn = true) даем className 'message--own'
    <article className={`message ${isOwn ? "message--own" : ""}`}>
      {!isOwn && (      //если сообщение собеседника (isOwn = false) добавляем имя собеседника
        <span className="message__author">
          {author}
        </span>
      )}

      <p className="message__text">
        {text}
      </p>

      <footer className="message__footer">
        <button
          className="message__delete"
          type="button"
          onClick={onDelete}
          aria-label="Удалить сообщение"
        > Delete
        </button>

        {isOwn && <span>✓✓</span>}

        <time>{time}</time>
      </footer>
    </article>
  )
}

export default Message
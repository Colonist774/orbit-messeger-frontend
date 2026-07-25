// отвечает за окно чата, отображение сообщений, отправку сообщений, удаление сообщений
// и возврат к списку чатов на мобильных устройствах.


import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useLayoutEffect
} from "react";
import Message from "./Message";

function ChatWindow({     //принимаем:
  chat,                         //Выбранный чат (состояние)
  onBack,                       //возврат к списку чатов на мобильном
  onSendMessage,                //функцию - отправка сообщений
  onDeleteMessage,              //функцию - удаление сообщений
  error,                        //ошибка при отправке или удалении сообщений
  hasMoreMessages,              //есть ли более старые сообщения для загрузки
  isLoadingOlderMessages,       //идет ли процесс загрузки более старых сообщений
  onLoadOlderMessages           //функция - загрузка более старых сообщений
}) {

  const [text, setText] = useState("");      //для приема данных из input
  const isSendingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);

  //невидимый элемент, при появлении которого заранее загружаются старые сообщения
  const loadTriggerRef = useRef(null);

  //хранит конкретное видимое сообщение и его позицию перед загрузкой старых сообщений
  const loadAnchorRef = useRef(null);

  const lastMessageId =
    chat?.messages.at(-1)?.id;

  //при открытии другого чата или появлении нового сообщения прокручиваем чат вниз
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
    });
  }, [chat?.id, lastMessageId]);

  //после загрузки старых сообщений возвращаем то же видимое сообщение
  //на ту же позицию, на которой оно было до загрузки
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

  //загрузка более старых сообщений и сохранение позиции прокрутки
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

      //находим первое сообщение, которое сейчас хотя бы частично видно
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
      } catch (error) {
        //если загрузка не удалась, сохраненный якорь больше не нужен
        loadAnchorRef.current = null;

        console.error(
          "Ошибка загрузки старых сообщений:",
          error
        );
      }
    }, [
      hasMoreMessages,
      isLoadingOlderMessages,
      onLoadOlderMessages,
    ]);

  //следим за невидимым элементом возле начала загруженных сообщений
  //и заранее загружаем следующую порцию
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

  //меняем состояниие text
  function handleChange(event) {
    setText(event.target.value);       //используем setter, присваиваем значение text из input
  }

  //отправка сообщений
  async function sendMessage(event) {
    event.preventDefault();

    const preparedText = text.trim();

    if (
      preparedText === "" ||
      isSendingRef.current
    ) {
      return;
    }

    isSendingRef.current = true;
    setText("");

    try {
      await onSendMessage(
        chat.id,
        preparedText
      );
    } catch (error) {
      console.error(
        "Ошибка отправки сообщения:",
        error
      );

      // Возвращаем текст, если отправка провалилась
      setText(preparedText);
    } finally {
      isSendingRef.current = false;
    }
  }


  if (!chat) {      //если чат не выбран и переменная chat имеет значение 0, выводим "Выберите чат"
    return (
      <main className="empty-chat">
        <p className="empty-message">Выберите чат</p>
      </main>
    );
  }

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

        {chat.messages.length === 0 ? (         //если в чате нет сообщений, выводим "Сообщений пока нет"
          <p className="empty-message">
            Сообщений пока нет
          </p>
        ) : (                                   //если сообщения есть:
          chat.messages.map((message, index) => (          //передаем значения каждого элемента - сообщения из текущего чата чата
            <Fragment key={message.id}>
              {index === 10 && (
                <div
                  ref={loadTriggerRef}
                  className="messages-load-trigger"
                  aria-hidden="true"
                />
              )}

              <div
                data-message-id={message.id}
                className="message-anchor"
              >
                <Message
                  author={message.author}
                  text={message.text}
                  time={message.time}
                  isOwn={message.isOwn}
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
              </div>
            </Fragment>
          ))
        )}

        <div ref={messagesEndRef} />
      </section>

      {error && (
        <div
          className="chat-action-error"
          role="alert"
        >
          <span className="chat-action-error-icon">
            !
          </span>

          <span>{error}</span>
        </div>
      )}

      <form
        className="message-form"
        onSubmit={sendMessage}
      >
        <button
          type="button"
          aria-label="Добавить файл"
        >
          ＋
        </button>

        <input                        //ввод текста сообщения
          type="text"
          value={text}                //добавляем один источник текста - состояние text, input всегда отображает значение из text
          onChange={handleChange}     //При изменение значения в input, передаем его в функцию для изменения text
          placeholder="Напишите сообщение..."
          autoComplete="off"
          enterKeyHint="send"
        />

        <button
          type="button"
          aria-label="Записать голосовое сообщение"
        >
          🎙
        </button>

        <button
          className="send-button"
          type="submit"
          aria-label="Отправить сообщение"
        >
          ➤
        </button>
      </form>
    </main>
  );
}

export default ChatWindow;
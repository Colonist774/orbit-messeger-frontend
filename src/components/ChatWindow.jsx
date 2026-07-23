// отвечает за окно чата, отображение сообщений, отправку сообщений, удаление сообщений 
// и возврат к списку чатов на мобильных устройствах.


import {
  useRef,
  useState,
  useLayoutEffect
} from "react";
import Message from "./Message"

function ChatWindow({     //принимаем:
  chat,                         //Выбранный чат (состояние)
  onBack,                       //возврат к списку чатов на мобильном
  onSendMessage,                //функцию - отправка сообщений
  onDeleteMessage,              //функцию - удаление сообщений
}) {

  const [text, setText] = useState("")      //для приема данных из input
  const isSendingRef = useRef(false)
  const messagesEndRef = useRef(null);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
    })
  }, [chat?.id, chat?.messages.length])


  //меняем состояниие text
  function handleChange(event) {      
    setText(event.target.value)       //используем setter, присваиваем значение text из input
  }

  //отправка сообщений
  async function sendMessage(event) {
    event.preventDefault()

    const preparedText = text.trim()

    if (
      preparedText === "" ||
      isSendingRef.current
    ) {
      return
    }

    isSendingRef.current = true
    setText("")

    try {
      await onSendMessage(
        chat.id,
        preparedText
      )
    } catch (error) {
      console.error(
        "Ошибка отправки сообщения:",
        error
      )

      // Возвращаем текст, если отправка провалилась
      setText(preparedText)
    } finally {
      isSendingRef.current = false
    }
  }

  if (!chat) {      //если чат не выбран и переменная chat имеет значение 0, выводим "Выберите чат"
    return (
      <main className="empty-chat"> 
        <p className="empty-message">Выберите чат</p>     
      </main>
    )
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

      <section className="message-list">
        {chat.messages.length === 0 ? (         //если в чате нет сообщений, выводим "Сообщений пока нет"
          <p className="empty-message">
            Сообщений пока нет
          </p>
        ) : (                                   //если сообщения есть:
          chat.messages.map((message) => (          //передаем значения каждого элемента - сообщения из текущего чата чата    
            <Message
              key={message.id}
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
          ))
        )}
        <div ref={messagesEndRef} />
      </section>

      <form className="message-form" onSubmit={sendMessage}>
        <button type="button" aria-label="Добавить файл">
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
  )
}

export default ChatWindow
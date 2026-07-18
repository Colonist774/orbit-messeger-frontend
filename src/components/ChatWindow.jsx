import { useState } from "react"
import Message from "./Message"

function ChatWindow({     //принимаем:
  chat,                         //Выбранный чат (состояние)
  onSendMessage,                //функцию - отправка сообщений
  onDeleteMessage,              //функцию - удаление сообщений
}) {

  const [text, setText] = useState("")      //для приема данных из input

  //меняем состояниие text
  function handleChange(event) {      
    setText(event.target.value)       //используем setter, присваиваем значение text из input
  }

  //отправка сообщений
  function sendMessage(event) {     
    event.preventDefault()                    //отключаем обновление старницы

    const preparedText = text.trim()          //лишие убираем пробелы с переданного состояния text

    if (preparedText === "") {                //если text - пустая строка, ничего не меняем, новое сообщение не добавляем
      return
    }

    onSendMessage(chat.id, preparedText)      //вызываем переданную функцию - добавляем новое сообщение в массив сообщений
    setText("")
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
            <Message                                //рендерим сообщения
              key={message.id}
              author={message.author}
              text={message.text}
              time={message.time}
              isOwn={message.isOwn}
              onDelete={() =>                       //передаем функцию - удаление сообщений
                onDeleteMessage(chat.id, message.id)
              }
            />
          ))
        )}
      </section>

      <form className="message-form" onSubmit={sendMessage}>
        <button type="button" aria-label="Добавить файл">
          ＋
        </button>
        
        <input                        //ввод текста сообщения
          value={text}                //добавляем один источник текста - состояние text, input всегда отображает значение из text
          onChange={handleChange}     //При изменение значения в input, передаем его в функцию для изменения text
          placeholder="Напишите сообщение..."
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
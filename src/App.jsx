import { useState } from "react"
import { useEffect } from "react"
import LeftSidebar from "./components/LeftSidebar"
import ChatWindow from "./components/ChatWindow"
import "./App.css" 

const initialChats = [
  {
    id: 1,
    name: "John",
    status: "Был в сети 5 минут назад",
    lastMessage: "Привет! Как дела?",
    time: "12:45",
    messages: [
      {
        id: 1,
        author: "John",
        text: "Привет! Как дела?",
        time: "12:44",
        isOwn: false,
      },
      {
        id: 2,
        author: "Marco",
        text: "Всё отлично!",
        time: "12:45",
        isOwn: true,
      },
    ],
  },
  {
    id: 2,
    name: "Emma",
    status: "Online",
    lastMessage: "Ты сегодня работаешь над Orbit?",
    time: "11:30",
    messages: [
      {
        id: 1,
        author: "Emma",
        text: "Ты сегодня работаешь над Orbit?",
        time: "11:30",
        isOwn: false,
      },
    ],
  },
  {
    id: 3,
    name: "Orbit Team",
    status: "3 участника",
    lastMessage: "Обновление будет завтра",
    time: "10:15",
    messages: [
      {
        id: 1,
        author: "Orbit Team",
        text: "Обновление будет завтра",
        time: "10:15",
        isOwn: false,
      },
    ],
  },
]


function App() {
  const [chats, setChats] = useState(initialChats)
  const [selectedChatId, setSelectedChatId] = useState(1)

  const selectedChat = chats.find(      //выбранный чат
    (chat) => chat.id === selectedChatId
  )

  //добавление новых сообщений
  function sendMessage(chatId, text) {      
    const newMessage = {              //новое сообщение
      id: Date.now(),
      author: "Marco",
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isOwn: true,
    }

    setChats((previousChats) =>       //добавляем новое сообщение в массив 
      previousChats.map((chat) => {
        if (chat.id !== chatId) {     //ищем в массиве нужный чат
          return chat                 //если это не нужный нам чат, возвращаем его без изменений 
        }

        return {                      //если нашли нужный чат, добавляем в него сообщение
          ...chat,
          messages: [...chat.messages, newMessage],
        }
      })
    )
  }

  //удаление сообщений
  function deleteMessage(chatId, messageId) {     
    setChats((previousChats) =>
      previousChats.map((chat) => {
        if (chat.id !== chatId) {     //если это не нужный нам чат, возвращаем его без изменений
          return chat
        }

        return {                      //если нашли нужный чат, удаляем в нем сообщение по его айди
          ...chat,
          messages: chat.messages.filter(
            (message) => message.id !== messageId
          ),
        }
      })
    )
  }

  return (
    <div className="app">
      <LeftSidebar                      //передаем:
        chats={chats}                         //чаты (состояние)
        selectedChatId={selectedChatId}       //айди выбранного чата (состояние)
        onSelectChat={setSelectedChatId}      //функцию изменения выбранного чата (setter)
      />

      <ChatWindow                       //передаем:
        chat={selectedChat}                 //Выбранный чат (состояние)
        onSendMessage={sendMessage}         //функцию - отправка сообщений
        onDeleteMessage={deleteMessage}     //функцию - удаление сообщений
      />
    </div>
  )
}

export default App
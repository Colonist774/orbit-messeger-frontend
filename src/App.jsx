import { useEffect, useState } from "react";

import LeftSidebar from "./components/LeftSidebar";
import ChatWindow from "./components/ChatWindow";
import AuthPage from "./components/AuthPage";

import { getCurrentUser } from "./api/auth";

import {
  getChats,
  searchUsers,
  createChat,
} from "./api/chats";

import {
  getMessages,
  sendMessage as sendMessageRequest,
} from "./api/messages";

import "./App.css";

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function convertBackendChat(chat) {
  return {
    id: chat.id,
    name: chat.other_user.username,
    otherUserId: chat.other_user.id,
    status: "Online",
    lastMessage: "Сообщений пока нет",
    time: "",
    messages: [],
  };
}

function convertBackendMessage(
  message,
  currentUser,
  chat
) {
  const isOwn =
    message.sender_id === currentUser.id;

  return {
    id: message.id,
    author: isOwn
      ? currentUser.username
      : chat.name,
    text: message.ciphertext,
    time: formatTime(message.created_at),
    isOwn,
  };
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("accessToken")
  );

  const [currentUser, setCurrentUser] =
    useState(null);

  const [isCheckingAuth, setIsCheckingAuth] =
    useState(Boolean(token));

  const [chats, setChats] = useState([]);

  const [selectedChatId, setSelectedChatId] =
    useState(null);

  const [isLoadingChats, setIsLoadingChats] =
    useState(false);

  const [isLoadingMessages, setIsLoadingMessages] =
    useState(false);

  const [appError, setAppError] = useState("");

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setIsCheckingAuth(false);
      return;
    }

    async function loadCurrentUser() {
      try {
        const user = await getCurrentUser(token);

        setCurrentUser(user);
      } catch {
        localStorage.removeItem("accessToken");

        setToken(null);
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    loadCurrentUser();
  }, [token]);

  useEffect(() => {
    if (!token || !currentUser) {
      return;
    }

    async function loadChats() {
      try {
        setIsLoadingChats(true);
        setAppError("");

        const backendChats = await getChats(token);

        const preparedChats =
          backendChats.map(convertBackendChat);

        setChats(preparedChats);

        if (preparedChats.length > 0) {
          setSelectedChatId(
            (currentSelectedChatId) =>
              currentSelectedChatId ??
              preparedChats[0].id
          );
        }
      } catch (error) {
        setAppError(error.message);
      } finally {
        setIsLoadingChats(false);
      }
    }

    loadChats();
  }, [token, currentUser]);

  useEffect(() => {
    if (
      !token ||
      !currentUser ||
      selectedChatId === null
    ) {
      return;
    }

    async function loadMessages() {
      try {
        setIsLoadingMessages(true);
        setAppError("");

        const response = await getMessages(
          token,
          selectedChatId
        );

        setChats((previousChats) =>
          previousChats.map((chat) => {
            if (chat.id !== selectedChatId) {
              return chat;
            }

            const preparedMessages =
              response.messages.map((message) =>
                convertBackendMessage(
                  message,
                  currentUser,
                  chat
                )
              );

            const lastMessage =
              preparedMessages.at(-1);

            return {
              ...chat,
              messages: preparedMessages,
              lastMessage:
                lastMessage?.text ??
                "Сообщений пока нет",
              time: lastMessage?.time ?? "",
            };
          })
        );
      } catch (error) {
        setAppError(error.message);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
  }, [token, currentUser, selectedChatId]);

  const selectedChat = chats.find(
    (chat) => chat.id === selectedChatId
  );

  async function handleSearchUsers(query) {
    return searchUsers(token, query);
  }

  async function handleCreateChat(otherUserId) {
    const backendChat = await createChat(
      token,
      otherUserId
    );

    const preparedChat =
      convertBackendChat(backendChat);

    setChats((previousChats) => {
      const chatAlreadyExists =
        previousChats.some(
          (chat) => chat.id === preparedChat.id
        );

      if (chatAlreadyExists) {
        return previousChats;
      }

      return [preparedChat, ...previousChats];
    });

    setSelectedChatId(preparedChat.id);

    return preparedChat;
  }

  async function handleSendMessage(chatId, text) {
    const temporaryId = `temporary-${Date.now()}`

    const temporaryMessage = {
      id: temporaryId,
      author: currentUser.username,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isOwn: true,
      isSending: true,
    }

    // Сразу показываем сообщение
    setChats((previousChats) =>
      previousChats.map((chat) => {
        if (chat.id !== chatId) {
          return chat
        }

        return {
          ...chat,
          lastMessage: text,
          time: temporaryMessage.time,
          messages: [
            ...chat.messages,
            temporaryMessage,
          ],
        }
      })
    )

    try {
      setAppError("")

      const backendMessage =
        await sendMessageRequest(
          token,
          chatId,
          text
        )

      // Заменяем временное сообщение настоящим
      setChats((previousChats) =>
        previousChats.map((chat) => {
          if (chat.id !== chatId) {
            return chat
          }

          const preparedMessage =
            convertBackendMessage(
              backendMessage,
              currentUser,
              chat
            )

          return {
            ...chat,
            lastMessage: preparedMessage.text,
            time: preparedMessage.time,
            messages: chat.messages.map(
              (message) =>
                message.id === temporaryId
                  ? preparedMessage
                  : message
            ),
          }
        })
      )
    } catch (error) {
      // Если сервер не сохранил сообщение — удаляем временное
      setChats((previousChats) =>
        previousChats.map((chat) => {
          if (chat.id !== chatId) {
            return chat
          }

          return {
            ...chat,
            messages: chat.messages.filter(
              (message) =>
                message.id !== temporaryId
            ),
          }
        })
      )

      setAppError(error.message)

      throw error
    }
  }

  function handleLogin(newToken) {
    setIsCheckingAuth(true);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("accessToken");

    setToken(null);
    setCurrentUser(null);
    setChats([]);
    setSelectedChatId(null);
  }

  /*
    В backend пока нет endpoint удаления сообщений.
    Поэтому настоящее удаление подключим позже.
  */
  function handleDeleteMessage() {
    console.warn(
      "Удаление сообщений пока не подключено"
    );
  }

  if (isCheckingAuth) {
    return (
      <main className="auth-page">
        <p>Проверка авторизации...</p>
      </main>
    );
  }

  if (!token || !currentUser) {
    return (
      <AuthPage onLogin={handleLogin} />
    );
  }

  return (
    <div className="app">
      <LeftSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        currentUser={currentUser}
        onSearchUsers={handleSearchUsers}
        onCreateChat={handleCreateChat}
        onLogout={handleLogout}
      />

      {isLoadingChats ? (
        <main className="empty-chat">
          <p className="empty-message">
            Загрузка чатов...
          </p>
        </main>
      ) : appError ? (
        <main className="empty-chat">
          <p className="auth-error">
            {appError}
          </p>
        </main>
      ) : isLoadingMessages ? (
        <main className="empty-chat">
          <p className="empty-message">
            Загрузка сообщений...
          </p>
        </main>
      ) : (
        <ChatWindow
          chat={selectedChat}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
        />
      )}
    </div>
  );
}

export default App;
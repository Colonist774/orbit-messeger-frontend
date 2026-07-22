import { useEffect, useState } from "react";

import LeftSidebar from "./components/LeftSidebar";
import ChatWindow from "./components/ChatWindow";
import AuthPage from "./components/AuthPage";
import DeleteMessageModal from "./components/DeleteMessageModal";

import { createMessageSocket } from "./api/websocket";
import { getCurrentUser } from "./api/auth";

import {
  getChats,
  searchUsers,
  createChat,
} from "./api/chats";

import {
  getMessages,
  sendMessage as sendMessageRequest,
  deleteMessage as deleteMessageRequest,
} from "./api/messages";

import {
  saveMyKeyBackup,
  getMyKeyBackup,
  getUserPublicKey,
} from "./api/keys";

import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  encryptMessage,
  decryptMessage,
  encryptPrivateKeyBackup,
  decryptPrivateKeyBackup,
} from "./utils/crypto";

import {
  loadPrivateKey,
  loadPublicKey,
  savePrivateKey,
  savePublicKey,
} from "./utils/keyStorage";

import "./App.css";

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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


function removeMessageFromChats(
  previousChats,
  chatId,
  messageId
) {
  return previousChats.map((chat) => {
    if (chat.id !== chatId) {
      return chat;
    }

    const remainingMessages =
      chat.messages.filter(
        (message) =>
          message.id !== messageId
      );

    const lastMessage =
      remainingMessages.at(-1);

    return {
      ...chat,
      messages: remainingMessages,
      lastMessage:
        lastMessage?.text ??
        "Сообщений пока нет",
      time: lastMessage?.time ?? "",
    };
  });
}


function App() {
  const [token, setToken] = useState(
    localStorage.getItem("accessToken")
  );

  const [
    cryptoPassword,
    setCryptoPassword,
  ] = useState("");

  const [currentUser, setCurrentUser] =
    useState(null);

  const [isCheckingAuth, setIsCheckingAuth] =
    useState(Boolean(token));

  const [chats, setChats] = useState([]);

  const [selectedChatId, setSelectedChatId] =
    useState(null);

  const [isLoadingChats, setIsLoadingChats] =
    useState(false);

  const [
    loadedMessagesChatId,
    setLoadedMessagesChatId,
  ] = useState(null);

  const [appError, setAppError] = useState("");

  const [cryptoKeys, setCryptoKeys] =
    useState(null);

  const [isPreparingCrypto, setIsPreparingCrypto] =
    useState(false);

  const [
    messagePendingDeletion,
    setMessagePendingDeletion,
  ] = useState(null);

  const [isDeletingMessage, setIsDeletingMessage] =
    useState(false);

  const [isMobileChatOpen, setIsMobileChatOpen] =
    useState(false);

  const selectedChat = chats.find(
    (chat) => chat.id === selectedChatId
  );

  const selectedChatName =
    selectedChat?.name ?? "";

  const chatIdsKey = chats
    .map((chat) => chat.id)
    .sort((a, b) => a - b)
    .join(",");


  // Загрузка текущего пользователя при наличии токена.
  useEffect(() => {
    if (!token) {
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

  
  // Загрузка последних сообщений для превью списка чатов.
  useEffect(() => {
    if (
      !token ||
      !currentUser ||
      !cryptoKeys ||
      chats.length === 0
    ) {
      return;
    }

    let isCancelled = false;

    async function loadChatPreviews() {
      try {
        const previews = await Promise.all(
          chats.map(async (chat) => {
            try {
              const response = await getMessages(
                token,
                chat.id
              );

              const lastBackendMessage =
                response.messages.at(-1);

              if (!lastBackendMessage) {
                return {
                  chatId: chat.id,
                  lastMessage:
                    "Сообщений пока нет",
                  time: "",
                };
              }

              let text;

              try {
                text = await decryptMessage({
                  ciphertext:
                    lastBackendMessage.ciphertext,
                  iv: lastBackendMessage.iv,
                  currentUserId:
                    currentUser.id,
                  privateKey:
                    cryptoKeys.privateKey,
                });
              } catch {
                text =
                  "Не удалось расшифровать сообщение";
              }

              return {
                chatId: chat.id,
                lastMessage: text,
                time: formatTime(
                  lastBackendMessage.created_at
                ),
              };
            } catch (error) {
              console.error(
                `Не удалось загрузить превью чата ${chat.id}:`,
                error
              );

              return null;
            }
          })
        );

        if (isCancelled) {
          return;
        }

        setChats((previousChats) =>
          previousChats.map((chat) => {
            const preview = previews.find(
              (item) =>
                item?.chatId === chat.id
            );

            if (!preview) {
              return chat;
            }

            return {
              ...chat,
              lastMessage:
                preview.lastMessage,
              time: preview.time,
            };
          })
        );
      } catch (error) {
        console.error(
          "Ошибка загрузки превью чатов:",
          error
        );
      }
    }

    loadChatPreviews();

    return () => {
      isCancelled = true;
    };
  }, [
    token,
    currentUser,
    cryptoKeys,
    chatIdsKey,
  ]);


  // Создание или загрузка RSA-ключей пользователя.
  useEffect(() => {
    if (!token || !currentUser) {
      setCryptoKeys(null);
      return;
    }

    let isCancelled = false;

    async function prepareCrypto() {
      try {
        setIsPreparingCrypto(true);
        setAppError("");

        let privateKey =
          await loadPrivateKey(
            currentUser.id
          );

        let publicKey =
          await loadPublicKey(
            currentUser.id
          );

        const serverBackup =
          await getMyKeyBackup(token);

        if (!privateKey || !publicKey) {
          if (
            serverBackup
              ?.encrypted_private_key
          ) {
            if (!cryptoPassword) {
              throw new Error(
                "Для восстановления ключей нужно выйти и войти снова"
              );
            }

            privateKey =
              await decryptPrivateKeyBackup({
                encryptedPrivateKey:
                  serverBackup
                    .encrypted_private_key,
                iv:
                  serverBackup
                    .private_key_iv,
                salt:
                  serverBackup
                    .private_key_salt,
                iterations:
                  serverBackup
                    .private_key_iterations,
                password: cryptoPassword,
              });

            publicKey =
              await importPublicKey(
                serverBackup.public_key
              );

            await savePrivateKey(
              currentUser.id,
              privateKey
            );

            await savePublicKey(
              currentUser.id,
              publicKey
            );
          } else {
            if (!cryptoPassword) {
              throw new Error(
                "Для создания ключей нужно выйти и войти снова"
              );
            }

            const keyPair =
              await generateKeyPair();

            privateKey = keyPair.privateKey;
            publicKey = keyPair.publicKey;

            await savePrivateKey(
              currentUser.id,
              privateKey
            );

            await savePublicKey(
              currentUser.id,
              publicKey
            );
          }
        }

        /*
        * Создаём или обновляем серверную
        * зашифрованную резервную копию только
        * тогда, когда в памяти есть пароль.
        *
        * Это важно: запрос без backup-полей
        * мог бы затереть существующую копию.
        */
        if (cryptoPassword) {
          const exportedPublicKey =
            await exportPublicKey(publicKey);

          const encryptedBackup =
            await encryptPrivateKeyBackup({
              privateKey,
              password: cryptoPassword,
            });

          await saveMyKeyBackup(token, {
            public_key:
              exportedPublicKey,
            algorithm:
              "RSA-OAEP-2048",
            ...encryptedBackup,
          });
        }

        if (!isCancelled) {
          setCryptoKeys({
            privateKey,
            publicKey,
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setCryptoKeys(null);
          setAppError(
            `Ошибка подготовки шифрования: ${error.message}`
          );
        }
      } finally {
        if (!isCancelled) {
          setIsPreparingCrypto(false);
        }
      }
    }

    prepareCrypto();

    return () => {
      isCancelled = true;
    };
  }, [
    token,
    currentUser,
    cryptoPassword,
  ]);

  // Загрузка списка чатов пользователя.
  useEffect(() => {
    if (!token || !currentUser) {
      setChats([]);
      setSelectedChatId(null);
      return;
    }

    let isCancelled = false;

    async function loadChats() {
      try {
        setIsLoadingChats(true);
        setAppError("");

        const response = await getChats(token);

        const backendChats = Array.isArray(response)
          ? response
          : response.chats ?? [];

        const preparedChats =
          backendChats.map(convertBackendChat);

        if (!isCancelled) {
          setChats(preparedChats);
        }
      } catch (error) {
        if (!isCancelled) {
          setChats([]);
          setAppError(error.message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingChats(false);
        }
      }
    }

    loadChats();

    return () => {
      isCancelled = true;
    };
  }, [token, currentUser]);

  // Загрузка и расшифровка истории сообщений.
  useEffect(() => {
    if (
      !token ||
      !currentUser ||
      !cryptoKeys ||
      selectedChatId === null
    ) {
      return;
    }

    async function loadMessages() {
      try {
        setAppError("");

        const response = await getMessages(
          token,
          selectedChatId
        );

        if (!selectedChatName) {
          return;
        }

        const preparedMessages =
          await Promise.all(
            response.messages.map(async (message) => {
              let text;

              try {
                text = await decryptMessage({
                  ciphertext:
                    message.ciphertext,
                  iv: message.iv,
                  currentUserId:
                    currentUser.id,
                  privateKey:
                    cryptoKeys.privateKey,
                });
              } catch (error) {
                console.error(
                  "Не удалось расшифровать сообщение:",
                  error
                );

                text =
                  "Не удалось расшифровать сообщение";
              }

              const isOwn =
                message.sender_id ===
                currentUser.id;

              return {
                id: message.id,
                author: isOwn
                  ? currentUser.username
                  : selectedChatName,
                text,
                time: formatTime(
                  message.created_at
                ),
                isOwn,
              };
            })
          );

        setChats((previousChats) =>
          previousChats.map((chat) => {
            if (chat.id !== selectedChatId) {
              return chat;
            }

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
        setLoadedMessagesChatId(selectedChatId);
      } catch (error) {
        setAppError(error.message);
      }
    }

    loadMessages();
  }, [
    token,
    currentUser,
    cryptoKeys,
    selectedChatId,
    selectedChatName,
  ]);

  // Получение и расшифровка новых сообщений.
  useEffect(() => {
    if (!token || !currentUser || !cryptoKeys) {
      return;
    }

    const socket = createMessageSocket(token, {
      async onMessageCreated(backendMessage) {
        if (
          backendMessage.sender_id ===
          currentUser.id
        ) {
          return;
        }

        let text;

        try {
          text = await decryptMessage({
            ciphertext:
              backendMessage.ciphertext,
            iv: backendMessage.iv,
            currentUserId: currentUser.id,
            privateKey: cryptoKeys.privateKey,
          });
        } catch (error) {
          console.error(
            "Ошибка расшифровки WebSocket-сообщения:",
            error
          );

          text =
            "Не удалось расшифровать сообщение";
        }

        const chatsResponse =
          await getChats(token);

        const backendChats = Array.isArray(
          chatsResponse
        )
          ? chatsResponse
          : chatsResponse.chats ?? [];

        const serverChats =
          backendChats.map(convertBackendChat);

        const incomingChat =
          serverChats.find(
            (chat) =>
              chat.id === backendMessage.chat_id
          );

        setChats((previousChats) => {
          const existingChat =
            previousChats.find(
              (chat) =>
                chat.id ===
                backendMessage.chat_id
            );

          const targetChat =
            existingChat ?? incomingChat;

          if (!targetChat) {
            console.error(
              "Входящий чат не найден:",
              backendMessage.chat_id
            );

            return previousChats;
          }

          const alreadyExists =
            targetChat.messages.some(
              (message) =>
                message.id ===
                backendMessage.id
            );

          if (alreadyExists) {
            return previousChats;
          }

          const preparedMessage = {
            id: backendMessage.id,
            author: targetChat.name,
            text,
            time: formatTime(
              backendMessage.created_at
            ),
            isOwn: false,
          };

          const updatedChat = {
            ...targetChat,
            lastMessage: preparedMessage.text,
            time: preparedMessage.time,
            messages: [
              ...targetChat.messages,
              preparedMessage,
            ],
          };

          if (!existingChat) {
            return [
              updatedChat,
              ...previousChats,
            ];
          }

          return [
            updatedChat,
            ...previousChats.filter(
              (chat) =>
                chat.id !== updatedChat.id
            ),
          ];
        });
      },
      
      onMessageDeleted({ chatId, messageId }) {
        setChats((previousChats) =>
          removeMessageFromChats(
            previousChats,
            chatId,
            messageId
          )
        );
      },
    });

    return () => {
      socket.close();
    };
  }, [
    token,
    currentUser,
    cryptoKeys,
  ]);

  const shouldShowMessagesLoading =
    selectedChatId !== null &&
    loadedMessagesChatId !== selectedChatId;

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
      const alreadyExists =
        previousChats.some(
          (chat) =>
            chat.id === preparedChat.id
        );

      if (alreadyExists) {
        return previousChats;
      }

      return [
        preparedChat,
        ...previousChats,
      ];
    });

    setLoadedMessagesChatId(null);
    setSelectedChatId(preparedChat.id);
    setIsMobileChatOpen(true);

    return preparedChat;
  }

  function handleSelectChat(chatId) {
    setSelectedChatId(chatId);
    setIsMobileChatOpen(true);
  }

  function handleBackToChats() {
    setIsMobileChatOpen(false);
    setMessagePendingDeletion(null);
  }

  async function handleSendMessage(chatId, text) {
    if (!cryptoKeys) {
      throw new Error(
        "Ключи шифрования ещё не готовы"
      );
    }

    const chat = chats.find(
      (item) => item.id === chatId
    );

    if (!chat) {
      throw new Error("Чат не найден");
    }

    const temporaryId =
      `temporary-${Date.now()}`;

    const temporaryMessage = {
      id: temporaryId,
      author: currentUser.username,
      text,
      time: new Date().toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      isOwn: true,
      isSending: true,
    };

    setChats((previousChats) =>
      previousChats.map((currentChat) => {
        if (currentChat.id !== chatId) {
          return currentChat;
        }

        return {
          ...currentChat,
          lastMessage: text,
          time: temporaryMessage.time,
          messages: [
            ...currentChat.messages,
            temporaryMessage,
          ],
        };
      })
    );

    try {
      setAppError("");

      const recipientKeyData =
        await getUserPublicKey(
          token,
          chat.otherUserId
        );

      const recipientPublicKey =
        await importPublicKey(
          recipientKeyData.public_key
        );

      const encryptedMessage =
        await encryptMessage({
          text,
          publicKeys: {
            [currentUser.id]:
              cryptoKeys.publicKey,
            [chat.otherUserId]:
              recipientPublicKey,
          },
        });

      const backendMessage =
        await sendMessageRequest(
          token,
          chatId,
          encryptedMessage
        );

      setChats((previousChats) =>
        previousChats.map((currentChat) => {
          if (currentChat.id !== chatId) {
            return currentChat;
          }

          const savedMessage = {
            ...temporaryMessage,
            id: backendMessage.id,
            time: formatTime(
              backendMessage.created_at
            ),
            isSending: false,
          };

          return {
            ...currentChat,
            lastMessage:
              savedMessage.text,
            time: savedMessage.time,
            messages:
              currentChat.messages.map(
                (message) =>
                  message.id === temporaryId
                    ? savedMessage
                    : message
              ),
          };
        })
      );
    } catch (error) {
      setChats((previousChats) =>
        previousChats.map((currentChat) => {
          if (currentChat.id !== chatId) {
            return currentChat;
          }

          return {
            ...currentChat,
            messages:
              currentChat.messages.filter(
                (message) =>
                  message.id !== temporaryId
              ),
          };
        })
      );

      setAppError(error.message);
      throw error;
    }
  }

  function handleLogin(
    newToken,
    password
  ) {
    setIsCheckingAuth(true);
    setCryptoPassword(password);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("accessToken");

    setToken(null);
    setCurrentUser(null);
    setCryptoKeys(null);
    setChats([]);
    setSelectedChatId(null);
    setAppError("");
    setLoadedMessagesChatId(null);
    setMessagePendingDeletion(null);
    setIsMobileChatOpen(false);
    setCryptoPassword("");
    setCryptoKeys(null);
  }

  function handleDeleteMessage(chatId, messageId) {
    setMessagePendingDeletion({
      chatId,
      messageId,
    });
  }

  async function handleConfirmMessageDeletion() {
    if (
      !messagePendingDeletion ||
      isDeletingMessage
    ) {
      return;
    }

    const { chatId, messageId } =
      messagePendingDeletion;

    try {
      setIsDeletingMessage(true);
      setAppError("");

      await deleteMessageRequest(
        token,
        chatId,
        messageId
      );

      setChats((previousChats) =>
        removeMessageFromChats(
          previousChats,
          chatId,
          messageId
        )
      );

      setMessagePendingDeletion(null);
    } catch (error) {
      console.error(
        "Ошибка удаления сообщения:",
        error
      );

      setAppError(error.message);
    } finally {
      setIsDeletingMessage(false);
    }
  }

  function handleCancelMessageDeletion() {
    if (isDeletingMessage) {
      return;
    }

    setMessagePendingDeletion(null);
  }

  if (isCheckingAuth || isPreparingCrypto) {
    return (
      <main className="auth-page">
        <p>
          {isCheckingAuth
            ? "Проверка авторизации..."
            : "Подготовка шифрования..."}
        </p>
      </main>
    );
  }

  if (!token || !currentUser) {
    return (
      <AuthPage onLogin={handleLogin} />
    );
  }

  return (
    <div
      className={`app ${
        isMobileChatOpen
          ? "app--mobile-chat-open"
          : ""
      }`}
    >
      <LeftSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        currentUser={currentUser}
        onSearchUsers={handleSearchUsers}
        onCreateChat={handleCreateChat}
        onLogout={handleLogout}
      />

      <div className="chat-pane">
        {isLoadingChats ? (
          <main className="empty-chat">
            <p className="empty-message">
              Загрузка чатов...
            </p>
          </main>
        ) : appError ? (
          <main className="empty-chat">
            <button
              className="mobile-empty-back-button"
              type="button"
              onClick={handleBackToChats}
              aria-label="Вернуться к списку чатов"
            >
              ←
            </button>

            <p className="auth-error">
              {appError}
            </p>
          </main>
        ) : shouldShowMessagesLoading ? (
          <main className="empty-chat">
            <button
              className="mobile-empty-back-button"
              type="button"
              onClick={handleBackToChats}
              aria-label="Вернуться к списку чатов"
            >
              ←
            </button>

            <p className="empty-message">
              Загрузка сообщений...
            </p>
          </main>
        ) : (
          <ChatWindow
            chat={selectedChat}
            onBack={handleBackToChats}
            onSendMessage={handleSendMessage}
            onDeleteMessage={
              handleDeleteMessage
            }
          />
        )}
      </div>

      <DeleteMessageModal
        isOpen={messagePendingDeletion !== null}
        isDeleting={isDeletingMessage}
        onConfirm={handleConfirmMessageDeletion}
        onCancel={handleCancelMessageDeletion}
      />
    </div>
  );
}

export default App;
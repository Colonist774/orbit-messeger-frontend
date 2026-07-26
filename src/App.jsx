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
  sendImageMessage as sendImageMessageRequest,
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
  encryptFile,
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

function getBackendMessageType(message) {
  return message.message_type === "image"
    ? "image"
    : "text";
}

function getMessagePreview(message) {
  if (!message) {
    return "Сообщений пока нет";
  }

  return message.type === "image"
    ? "📷 Изображение"
    : message.text;
}

function getBackendImageData(message) {
  if (
    getBackendMessageType(message) !== "image" ||
    !message.attachment
  ) {
    return null;
  }

  return {
    ciphertext: message.ciphertext,
    iv: message.iv,
    mimeType: message.attachment.mime_type,
    sizeBytes: message.attachment.size_bytes,
    width: message.attachment.width,
    height: message.attachment.height,
  };
}

async function prepareBackendMessage({
  message,
  currentUser,
  otherUserName,
  privateKey,
}) {
  const type = getBackendMessageType(message);
  const isOwn =
    message.sender_id === currentUser.id;

  let text = "";

  if (type === "text") {
    try {
      text = await decryptMessage({
        ciphertext: message.ciphertext,
        iv: message.iv,
        currentUserId: currentUser.id,
        privateKey,
      });
    } catch (error) {
      console.error(
        "Не удалось расшифровать сообщение:",
        error
      );

      text = "Не удалось расшифровать сообщение";
    }
  }

  return {
    id: message.id,
    author: isOwn
      ? currentUser.username
      : otherUserName,
    type,
    text,
    image: getBackendImageData(message),
    time: formatTime(message.created_at),
    createdAt: message.created_at,
    isOwn,
  };
}

function convertBackendChat(chat) {     // Преобразование данных чата из формата бэкенда в формат фронтенда
  return {
    id: chat.id,
    name: chat.other_user.username,
    otherUserId: chat.other_user.id,
    status: "Online",
    lastMessage: "Сообщений пока нет",
    time: "",
    lastMessageAt: null,
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
        getMessagePreview(lastMessage),
      time: lastMessage?.time ?? "",
      lastMessageAt:
        lastMessage?.createdAt ?? null,
    };
  });
}


function App() {
  const [token, setToken] = //jwt-токен
    useState(localStorage.getItem("accessToken"));

  const [cryptoPassword, setCryptoPassword] = //пароль для шифрования ключей
    useState("");

  const [currentUser, setCurrentUser] = //текущий пользователь
    useState(null);

  const [isCheckingAuth, setIsCheckingAuth] = //флаг проверки авторизации
    useState(Boolean(token));

  const [chats, setChats] = //cписок чатов пользователя
    useState([]);

  const [selectedChatId, setSelectedChatId] = //id выбранного чата
    useState(null);

  const [isLoadingChats, setIsLoadingChats] = //флаг загрузки чатов
    useState(false);

  const [loadedMessagesChatId, setLoadedMessagesChatId] = //id чата, для которого загружены сообщения
    useState(null);

  const [appError, setAppError] = //флаг ошибки приложения
    useState("");

  const [actionError, setActionError] = //флаг ошибки действия (отправка сообщения, удаление сообщения и т.д.)
    useState("");

  const [cryptoKeys, setCryptoKeys] = //объект с приватным и публичным ключами пользователя
    useState(null);

  const [isPreparingCrypto, setIsPreparingCrypto] = //флаг подготовки шифрования
    useState(false);

  const [messagePendingDeletion, setMessagePendingDeletion] = //объект с информацией о сообщении, которое ожидает удаления
    useState(null);

  const [isDeletingMessage, setIsDeletingMessage] = //флаг удаления сообщения
    useState(false);

  const [isMobileChatOpen, setIsMobileChatOpen] = //флаг открытия чата на мобильном устройствеg
    useState(false);

  const [messagesReloadKey, setMessagesReloadKey] = //флаг для перезагрузки сообщений при повторном подключении WebSocket
    useState(0);

  const [hasMoreMessages, setHasMoreMessages] = //флаг наличия более старых сообщений для загрузки
    useState(false);

  const [nextBeforeId, setNextBeforeId] = //id сообщения, до которого нужно загружать более старые сообщения
    useState(null);

  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = //флаг загрузки более старых сообщений
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
      !chatIdsKey
    ) {
      return;
    }

    let isCancelled = false;

    const chatIds = chatIdsKey
      .split(",")
      .map(Number);

    async function loadChatPreviews() {
      try {
        const previews = await Promise.all(
          chatIds.map(async (chatId) => {
            try {
              const response = await getMessages(
                token,
                chatId,
                null,
                1
              );

              const backendMessages =
                Array.isArray(response)
                  ? response
                  : response.messages ?? [];

              const lastBackendMessage =
                backendMessages.at(-1);

              if (!lastBackendMessage) {
                return {
                  chatId,
                  lastMessage:
                    "Сообщений пока нет",
                  time: "",
                  lastMessageAt: null,
                };
              }

              const messageType =
                getBackendMessageType(
                  lastBackendMessage
                );

              let previewText = "📷 Изображение";

              if (messageType === "text") {
                try {
                  previewText = await decryptMessage({
                    ciphertext:
                      lastBackendMessage.ciphertext,
                    iv: lastBackendMessage.iv,
                    currentUserId:
                      currentUser.id,
                    privateKey:
                      cryptoKeys.privateKey,
                  });
                } catch {
                  previewText =
                    "Не удалось расшифровать сообщение";
                }
              }

              return {
                chatId,
                lastMessage: previewText,
                time: formatTime(
                  lastBackendMessage.created_at
                ),
                lastMessageAt:
                  lastBackendMessage.created_at,
                };
            } catch (error) {
              console.error(
                `Не удалось загрузить превью чата ${chatId}:`,
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
              lastMessage: preview.lastMessage,
              time: preview.time,
              lastMessageAt: preview.lastMessageAt,
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

    let isCancelled = false;

    async function loadMessages() {
      try {
        setAppError("");

        const response = await getMessages(
          token,
          selectedChatId
        );

        const backendMessages = Array.isArray(response)
          ? response
          : response.messages ?? [];

        if (isCancelled) {
          return;
        }

        setHasMoreMessages(
          Array.isArray(response)
            ? false
            : response.has_more
        );

        setNextBeforeId(
          Array.isArray(response)
            ? null
            : response.next_before_id
        );

        if (!selectedChatName) {
          return;
        }

        const preparedMessages = await Promise.all(
          backendMessages.map((message) =>
            prepareBackendMessage({
              message,
              currentUser,
              otherUserName: selectedChatName,
              privateKey: cryptoKeys.privateKey,
            })
          )
        );

        if (isCancelled) {
          return;
        }

        setChats((previousChats) =>
          previousChats.map((chat) => {
            if (chat.id !== selectedChatId) {
              return chat;
            }

            const loadedMessageIds = new Set(
              preparedMessages.map((message) => message.id)
            );

            const mergedMessages = [
              ...preparedMessages,
              ...chat.messages.filter(
                (message) =>
                  !loadedMessageIds.has(message.id)
              ),
            ];

            const lastMessage = mergedMessages.at(-1);

            return {
              ...chat,
              messages: mergedMessages,
              lastMessage:
                getMessagePreview(lastMessage),
              time: lastMessage?.time ?? "",
              lastMessageAt:
                lastMessage?.createdAt ?? null,
            };
          })
        );

        setLoadedMessagesChatId(selectedChatId);
      } catch (error) {
        if (!isCancelled) {
          setAppError(error.message);
        }
      }
    }

    loadMessages();

    return () => {
      isCancelled = true;
    };
  }, [
    token,
    currentUser,
    cryptoKeys,
    selectedChatId,
    selectedChatName,
    messagesReloadKey,
  ]);

  // Загрузка более старых сообщений при скролле вверх.
  async function handleLoadOlderMessages() {
    if (
      !token ||
      selectedChatId === null ||
      !nextBeforeId ||
      !hasMoreMessages ||
      isLoadingOlderMessages ||
      !currentUser ||
      !cryptoKeys ||
      !selectedChatName
    ) {
      return;
    }

    setIsLoadingOlderMessages(true);
    setActionError("");

    try {
      const response = await getMessages(
        token,
        selectedChatId,
        nextBeforeId
      );

      const backendMessages = Array.isArray(response)
        ? response
        : response.messages ?? [];

      const preparedMessages = await Promise.all(
        backendMessages.map((message) =>
          prepareBackendMessage({
            message,
            currentUser,
            otherUserName: selectedChatName,
            privateKey: cryptoKeys.privateKey,
          })
        )
      );

      setChats((previousChats) =>
        previousChats.map((chat) => {
          if (chat.id !== selectedChatId) {
            return chat;
          }

          const validCurrentMessages =
            chat.messages.filter(Boolean);

          const validPreparedMessages =
            preparedMessages.filter(Boolean);

          const existingIds = new Set(
            validCurrentMessages.map(
              (message) => message.id
            )
          );

          const uniqueOlderMessages =
            validPreparedMessages.filter(
              (message) =>
                !existingIds.has(message.id)
            );

          return {
            ...chat,
            messages: [
              ...uniqueOlderMessages,
              ...validCurrentMessages,
            ],
          };
        })
      );

      setHasMoreMessages(
        Array.isArray(response)
          ? false
          : response.has_more
      );

      setNextBeforeId(
        Array.isArray(response)
          ? null
          : response.next_before_id
      );
    } catch (error) {
      console.error(
        "Ошибка загрузки старых сообщений:",
        error
      );

      setActionError(error.message);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }

  // Получение и расшифровка новых сообщений.
  useEffect(() => {
    if (!token || !currentUser || !cryptoKeys) {
      return;
    }

    let isCancelled = false;
    let socket = null;
    let reconnectTimer = null;
    let hasConnectedOnce = false;

    function connect() {
      if (isCancelled) {
        return;
      }
      socket = createMessageSocket(token, {
        onOpen() {
          if (hasConnectedOnce) {
            setMessagesReloadKey(
              (previousKey) => previousKey + 1
            );
          }

          hasConnectedOnce = true;
        },

        async onMessageCreated(backendMessage) {
          if (
            backendMessage.sender_id ===
            currentUser.id
          ) {
            return;
          }

          const messageType =
            getBackendMessageType(backendMessage);

          let text = "";

          if (messageType === "text") {
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
              type: messageType,
              text,
              image:
                getBackendImageData(backendMessage),
              time: formatTime(
                backendMessage.created_at
              ),
              createdAt:
                backendMessage.created_at,
              isOwn: false,
            };

            const updatedChat = {
              ...targetChat,
              lastMessage:
                getMessagePreview(preparedMessage),
              time: preparedMessage.time,
              lastMessageAt:
                preparedMessage.createdAt,
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

        onClose() {
          if (isCancelled || reconnectTimer) {
            return;
          }

          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 2000);
        },
      });
    }

    connect();

    return () => {
      isCancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
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

    const temporaryCreatedAt =
      new Date().toISOString();

    const temporaryMessage = {
      id: temporaryId,
      author: currentUser.username,
      type: "text",
      text,
      time: formatTime(temporaryCreatedAt),
      createdAt: temporaryCreatedAt,
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
          lastMessageAt:
            temporaryMessage.createdAt,
          messages: [
            ...currentChat.messages,
            temporaryMessage,
          ],
        };
      })
    );

    try {
      setActionError("");

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
            createdAt:
              backendMessage.created_at,
            isSending: false,
          };

          return {
            ...currentChat,
            lastMessage:
              savedMessage.text,
            time: savedMessage.time,
            lastMessageAt:
              savedMessage.createdAt,
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

      setActionError(error.message);
      throw error;
    }
  }

  async function handleSendImage(
    chatId,
    file,
    { width, height }
  ) {
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

    const allowedImageTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    if (!allowedImageTypes.has(file.type)) {
      throw new Error(
        "Можно отправлять только JPEG, PNG и WebP"
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(
        "Размер изображения не должен превышать 10 МБ"
      );
    }

    try {
      setActionError("");

      const recipientKeyData =
        await getUserPublicKey(
          token,
          chat.otherUserId
        );

      const recipientPublicKey =
        await importPublicKey(
          recipientKeyData.public_key
        );

      const encryptedImage = await encryptFile({
        file,
        publicKeys: {
          [currentUser.id]:
            cryptoKeys.publicKey,
          [chat.otherUserId]:
            recipientPublicKey,
        },
      });

      const backendMessage =
        await sendImageMessageRequest(
          token,
          chatId,
          {
            encryptedFile:
              encryptedImage.encryptedFile,
            ciphertext:
              encryptedImage.ciphertext,
            iv: encryptedImage.iv,
            keyVersion:
              encryptedImage.key_version,
            mimeType: file.type,
            width,
            height,
          }
        );

      const savedMessage = {
        id: backendMessage.id,
        author: currentUser.username,
        type: "image",
        text: "",
        image:
          getBackendImageData(backendMessage),
        time: formatTime(
          backendMessage.created_at
        ),
        createdAt:
          backendMessage.created_at,
        isOwn: true,
        isSending: false,
      };

      setChats((previousChats) =>
        previousChats.map((currentChat) => {
          if (currentChat.id !== chatId) {
            return currentChat;
          }

          return {
            ...currentChat,
            lastMessage:
              getMessagePreview(savedMessage),
            time: savedMessage.time,
            lastMessageAt:
              savedMessage.createdAt,
            messages: [
              ...currentChat.messages,
              savedMessage,
            ],
          };
        })
      );
    } catch (error) {
      setActionError(error.message);
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
    setActionError("");
    setLoadedMessagesChatId(null);
    setMessagePendingDeletion(null);
    setIsMobileChatOpen(false);
    setCryptoPassword("");
    setHasMoreMessages(false);
    setNextBeforeId(null);
    setIsLoadingOlderMessages(false);
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
      setActionError("");

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

      setActionError(error.message);
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

  const sortedChats = [...chats].sort(
    (firstChat, secondChat) => {
      if (
        !firstChat.lastMessageAt &&
        !secondChat.lastMessageAt
      ) {
        return 0;
      }

      if (!firstChat.lastMessageAt) {
        return 1;
      }

      if (!secondChat.lastMessageAt) {
        return -1;
      }

      return (
        new Date(secondChat.lastMessageAt) -
        new Date(firstChat.lastMessageAt)
      );
    }
  );

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
        chats={sortedChats}
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
            key={selectedChat?.id ?? "empty-chat"}
            chat={selectedChat}
            onBack={handleBackToChats}
            onSendMessage={handleSendMessage}
            onSendImage={handleSendImage}
            onDeleteMessage={handleDeleteMessage}
            error={actionError}
            hasMoreMessages={hasMoreMessages}
            isLoadingOlderMessages={isLoadingOlderMessages}
            onLoadOlderMessages={handleLoadOlderMessages}
            imageAccess={{
              token,
              currentUserId: currentUser.id,
              privateKey: cryptoKeys.privateKey,
            }}
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
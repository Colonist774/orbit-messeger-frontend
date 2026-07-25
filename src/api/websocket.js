// отвечает за работу с WebSocket-соединением, создание сокета для обмена сообщениями 
// и обработку событий WebSocket.


const WS_PROTOCOL =
  window.location.protocol === "https:"
    ? "wss:"
    : "ws:";

const WS_URL =
  `${WS_PROTOCOL}//${window.location.host}/api/ws`;

export function createMessageSocket(token, handlers = {}) {
  const socket = new WebSocket(
    `${WS_URL}?token=${encodeURIComponent(token)}`
  );

  socket.onopen = () => {
    console.log("WebSocket подключён");
    handlers.onOpen?.();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "connection.ready") {
        handlers.onReady?.(data);
        return;
      }

      if (data.type === "message.created") {
        handlers.onMessageCreated?.(data.message);
        return;
      }

      if (data.type === "message.deleted") {
        handlers.onMessageDeleted?.({
          chatId: data.chat_id,
          messageId: data.message_id,
        });
        return;
      }

      if (data.type === "pong") {
        return;
      }

      console.log(
        "Неизвестное WebSocket-событие:",
        data
      );
    } catch (error) {
      console.error(
        "Не удалось обработать WebSocket-сообщение:",
        error
      );
    }
};

    socket.onerror = () => {
    if (
        socket.readyState !== WebSocket.CLOSING &&
        socket.readyState !== WebSocket.CLOSED
    ) {
        console.error(
        "Не удалось установить WebSocket-соединение"
        );
    }

    handlers.onError?.();
    };

    socket.onclose = () => {
        console.log("WebSocket отключён");
        handlers.onClose?.();
    };

    return socket;
}
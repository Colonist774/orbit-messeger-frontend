const [messageText, setMessageText] = useState("");
const [messages, setMessages] = useState([]);
const [selectedChatId, setSelectedChatId] = useState(null);

// async function sendMessage() {
//   if (!messageText.trim()) {
//     return;
//   }
//   try {
//     if (!selectedChatId) {
//         throw new Error('Сначала выберите чат')
//     }
//     const response = await fetch (`api/chats/${selectedChatId}/messages`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': "application/json"
//         },
//         body: JSON.stringify({
//             text: messageText
//         })
//     })

//     if (!response.ok) {
//         throw new Error('Не удалось отправить сообщение')
//     }

//     const createdMessage = await response.json()

//     setMessages((currentMessages) => [
//         ...currentMessages, 
//         messageText,
//     ])

//     setMessageText('')
//   }
//   catch (error) {
//     console.error(error.message)
//   }
// }






async function editMessage(messageId, newText) {
    if (!newText.trim()) {
        return
    }
    
    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: newText
            })
        })

        if (!response.ok) {
            throw new Error('Не удалось изменить сообщение, возможно оно уже удалено.')
        }

        const updatedMessage = await response.json()

        setMessages((currentMessages) => 
            currentMessages.map((message) => 
                message.id === messageId  
                    ? updatedMessage
                    : message
        ));
    }
    catch (error) {
        console.error(error.message)
    }
}
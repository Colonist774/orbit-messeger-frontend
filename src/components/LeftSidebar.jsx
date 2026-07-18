
function LeftSidebar({ chats, selectedChatId, onSelectChat }) {     //получаем значения
  
  return (
    <aside className="sidebar">
      <header className="sidebar-user">
        <div className="avatar">M</div>

        <div className="sidebar-user__info">
          <h2>Marco</h2>
          <span>Online</span>
        </div>

        <button type="button" aria-label="Открыть меню">
          ☰
        </button>
      </header>

      <input
        className="search-input"
        type="search"
        placeholder="Поиск пользователей"
      />

      <div className="chat-list">
        {chats.map((chat, index) => (
          <article
            className={`chat-item ${
              selectedChatId === chat.id ? "chat-item--active" : ""     //выбранному чату даем className "chat-item--active"
            }`}
            key={chat.id}
            onClick={() => onSelectChat(chat.id)} //при клике на определенный чат, делаем его активным    
          >
            <div className="avatar">
              {chat.name[0]}
            </div>

            <div className="chat-item__content">
              <h3>{chat.name}</h3>
              <p>{chat.lastMessage}</p>
            </div>

            <time>{chat.time}</time>
          </article>
        ))}
      </div>
    </aside>
  )
}

export default LeftSidebar
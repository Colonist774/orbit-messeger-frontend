// отвечает за левую боковую панель, отображение списка чатов, поиск пользователей, 
// создание новых чатов и выход из аккаунта.


import { useState } from "react";

function LeftSidebar({
  chats,
  selectedChatId,
  onSelectChat,
  currentUser,
  onSearchUsers,
  onCreateChat,
  onLogout,
}) {
  const [searchText, setSearchText] = useState("");
  const [foundUsers, setFoundUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function handleSearch(event) {
    const value = event.target.value;

    setSearchText(value);
    setSearchError("");

    const preparedValue = value.trim();

    if (preparedValue === "") {
      setFoundUsers([]);
      return;
    }

    try {
      setIsSearching(true);

      const users = await onSearchUsers(preparedValue);

      setFoundUsers(users);
    } catch (error) {
      setSearchError(error.message);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCreateChat(userId) {
    try {
      const chat = await onCreateChat(userId);

      setSearchText("");
      setFoundUsers([]);

      onSelectChat(chat.id);
    } catch (error) {
      setSearchError(error.message);
    }
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-user">
        <div className="avatar">
          {currentUser.username[0].toUpperCase()}
        </div>

        <div className="sidebar-user__info">
          <h2>{currentUser.username}</h2>
          <span>Online</span>
        </div>

        <button
          className="logout-button"
          type="button"
          onClick={onLogout}
          aria-label="Выйти из аккаунта"
          title="Выйти"
        >
          ↪
        </button>
      </header>

      <input
        className="search-input"
        type="search"
        value={searchText}
        onChange={handleSearch}
        placeholder="Поиск пользователей"
      />

      {searchText.trim() !== "" && (
        <div className="search-results">
          {isSearching && (
            <p className="search-message">
              Поиск...
            </p>
          )}

          {searchError && (
            <p className="search-error">
              {searchError}
            </p>
          )}

          {!isSearching &&
            !searchError &&
            foundUsers.length === 0 && (
              <p className="search-message">
                Пользователи не найдены
              </p>
            )}

          {foundUsers.map((user) => (
            <button
              className="search-user"
              type="button"
              key={user.id}
              onClick={() =>
                handleCreateChat(user.id)
              }
            >
              <div className="avatar">
                {user.username[0].toUpperCase()}
              </div>

              <span>{user.username}</span>
            </button>
          ))}
        </div>
      )}

      {searchText.trim() === "" && (
        <div className="chat-list">
          {chats.length === 0 ? (
            <p className="search-message">
              Чатов пока нет
            </p>
          ) : (
            chats.map((chat) => (
              <button
                className={`chat-item ${
                  selectedChatId === chat.id
                    ? "chat-item--active"
                    : ""
                }`}
                type="button"
                key={chat.id}
                onClick={() =>
                  onSelectChat(chat.id)
                }
              >
                <div className="avatar">
                  {chat.name[0].toUpperCase()}
                </div>

                <div className="chat-item__content">
                  <h3>{chat.name}</h3>
                  <p>{chat.lastMessage}</p>
                </div>

                <time>{chat.time}</time>
              </button>
            ))
          )}
        </div>
      )}
    </aside>
  );
}

export default LeftSidebar;
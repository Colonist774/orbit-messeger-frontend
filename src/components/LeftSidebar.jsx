// Левая панель: профиль, поиск пользователей и список чатов.

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


  const isSearchOpen = searchText.trim() !== "";


  return (
    <aside className="sidebar">
      <header className="sidebar-user">
        <div className="avatar" aria-hidden="true">
          {currentUser.username[0].toUpperCase()}
        </div>

        <div className="sidebar-user__info">
          <h2>{currentUser.username}</h2>

          <span className="presence-status">
            <i aria-hidden="true" />
            Online
          </span>
        </div>

        <button
          className="logout-button"
          type="button"
          onClick={onLogout}
          aria-label="Выйти из аккаунта"
          title="Выйти"
        >
          <span className="visually-hidden">Выйти</span>
        </button>
      </header>

      <label className="sidebar-search">
        <span className="visually-hidden">
          Поиск пользователей
        </span>

        <input
          className="search-input"
          type="search"
          value={searchText}
          onChange={handleSearch}
          placeholder="Поиск пользователей"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      {isSearchOpen ? (
        <section className="sidebar-section sidebar-section--search">
          <div className="sidebar-section__heading">
            <h3>Результаты</h3>
          </div>

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
                <div className="avatar" aria-hidden="true">
                  {user.username[0].toUpperCase()}
                </div>

                <span>{user.username}</span>

                <i
                  className="search-user__arrow"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="sidebar-section">
          <div className="sidebar-section__heading">
            <h3>Чаты</h3>

            <span className="sidebar-section__count">
              {chats.length}
            </span>
          </div>

          <div className="chat-list">
            {chats.length === 0 ? (
              <div className="sidebar-empty-state">
                <span aria-hidden="true" />
                <p>Чатов пока нет</p>
                <small>
                  Найдите пользователя, чтобы начать общение
                </small>
              </div>
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
                  <div className="avatar" aria-hidden="true">
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
        </section>
      )}
    </aside>
  );
}

export default LeftSidebar;

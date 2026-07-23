// отвечает за страницу авторизации и регистрации пользователя, переключение между режимами входа 
// и регистрации, обработку ошибок и состояния загрузки, а также сохранение токена доступа в 
// локальном хранилище после успешного входа.


import { useState } from "react";

import {
  registerUser,
  loginUser,
} from "../api/auth";

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      if (mode === "register") {
        await registerUser(username, password);
      }

      const tokenData = await loginUser(
        username,
        password
      );

      localStorage.setItem(
        "accessToken",
        tokenData.access_token
      );

      onLogin(
        tokenData.access_token,
        password
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function switchMode() {
    setError("");

    setMode((currentMode) =>
      currentMode === "login"
        ? "register"
        : "login"
    );
  }

  return (
    <main className="auth-page">
      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        <h1>Orbit</h1>

        <h2>
          {mode === "login"
            ? "Вход"
            : "Регистрация"}
        </h2>

        <input
          value={username}
          onChange={(event) =>
            setUsername(event.target.value)
          }
          minLength={3}
          maxLength={20}
          placeholder="Имя пользователя"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          minLength={6}
          maxLength={100}
          placeholder="Пароль"
          required
        />

        {error && (
          <p className="auth-error">{error}</p>
        )}

        <button
          className="auth-submit"
          type="submit" //работает, так как функция handleSubmit прописана в обработчике формы
          disabled={isLoading}
        >
          {isLoading
            ? "Загрузка..."
            : mode === "login"
              ? "Войти"
              : "Создать аккаунт"}
        </button>

        <button
          className="auth-switch"
          type="button"
          onClick={switchMode}
        >
          {mode === "login"
            ? "Нет аккаунта? Регистрация"
            : "Уже есть аккаунт? Войти"}
        </button>
      </form>
    </main>
  );
}

export default AuthPage;
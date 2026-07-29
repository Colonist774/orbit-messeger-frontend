import { useState } from "react";

import {
  registerUser,
  loginUser,
} from "../api/auth";

import OrbitLogo from "./OrbitLogo";


function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isRegisterMode = mode === "register";


  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      isRegisterMode &&
      password !== confirmPassword
    ) {
      setError("Пароли не совпадают");
      return;
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
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
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }


  function switchMode() {
    setError("");
    setConfirmPassword("");

    setMode((currentMode) =>
      currentMode === "login"
        ? "register"
        : "login"
    );
  }


  return (
    <main className="auth-page">
      <div className="auth-page__halo" aria-hidden="true" />

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        <header className="auth-brand">
          <OrbitLogo className="auth-brand__logo" />

          <div className="auth-brand__wordmark">
            orbit
          </div>

          <p>мессенджер нового поколения</p>
        </header>

        <div className="auth-form__heading">
          <h1>
            {isRegisterMode
              ? "Создать аккаунт"
              : "Добро пожаловать"}
          </h1>

          <p>
            {isRegisterMode
              ? "Присоединяйтесь к защищённому пространству общения"
              : "Войдите, чтобы продолжить общение"}
          </p>
        </div>

        <label className="auth-field auth-field--user">
          <span className="visually-hidden">
            Имя пользователя
          </span>

          <input
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            minLength={3}
            maxLength={20}
            placeholder="Имя пользователя"
            autoComplete="username"
            required
          />
        </label>

        <label className="auth-field auth-field--password">
          <span className="visually-hidden">
            Пароль
          </span>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            minLength={6}
            maxLength={100}
            placeholder="Пароль"
            autoComplete={
              isRegisterMode
                ? "new-password"
                : "current-password"
            }
            required
          />
        </label>

        {isRegisterMode && (
          <label className="auth-field auth-field--password">
            <span className="visually-hidden">
              Подтверждение пароля
            </span>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              minLength={6}
              maxLength={100}
              placeholder="Повторите пароль"
              autoComplete="new-password"
              required
            />
          </label>
        )}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="auth-submit"
          type="submit"
          disabled={isLoading}
        >
          <span>
            {isLoading
              ? "Загрузка..."
              : isRegisterMode
                ? "Зарегистрироваться"
                : "Войти"}
          </span>
        </button>

        <div className="auth-switch-row">
          <span>
            {isRegisterMode
              ? "Уже есть аккаунт?"
              : "Нет аккаунта?"}
          </span>

          <button
            className="auth-switch"
            type="button"
            onClick={switchMode}
          >
            {isRegisterMode
              ? "Войти"
              : "Регистрация"}
          </button>
        </div>

        <p className="auth-security-note">
          Сквозное шифрование включено
        </p>
      </form>
    </main>
  );
}

export default AuthPage;

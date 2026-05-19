import { useState } from "react";
import { loginUser, registerUser } from "../services/api.js";

type AuthFormProps = {
  onLogin: (token: string) => void;
};

export function AuthForm({ onLogin }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      if (mode === "register") {
        await registerUser({
          email,
          password,
        });

        setMessage("Conta criada com sucesso!");
        setMode("login");
        return;
      }

      const data = await loginUser({
        email,
        password,
      });

      localStorage.setItem(
        "devflow_token",
        data.access_token
      );

      onLogin(data.access_token);

    } catch (error) {
      console.error(error);
      setMessage("Erro ao autenticar.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl"
      >
        <h1 className="text-3xl font-bold mb-2">
          DevFlow AI
        </h1>

        <p className="text-slate-400 mb-6">
          {mode === "login"
            ? "Entre para acessar suas análises."
            : "Crie sua conta para começar."}
        </p>

        <label className="block text-sm mb-2">
          E-mail
        </label>

        <input
          className="w-full mb-4 p-3 rounded-lg bg-slate-800 border border-slate-700 outline-none"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          type="email"
          required
        />

        <label className="block text-sm mb-2">
          Senha
        </label>

        <input
          className="w-full mb-6 p-3 rounded-lg bg-slate-800 border border-slate-700 outline-none"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          type="password"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-lg p-3 font-semibold"
        >
          {mode === "login"
            ? "Entrar"
            : "Criar conta"}
        </button>

        <button
          type="button"
          onClick={() =>
            setMode(
              mode === "login"
                ? "register"
                : "login"
            )
          }
          className="w-full mt-4 text-sm text-blue-400 hover:text-blue-300"
        >
          {mode === "login"
            ? "Ainda não tenho conta"
            : "Já tenho conta"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-slate-300">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
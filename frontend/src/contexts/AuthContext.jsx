import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);

	const API_URL = "http://localhost:3000"; // URL do backend

	async function register(name, email, password) {
		try {
			const response = await fetch(`${API_URL}/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				return { success: false, error: data.error || "Erro no cadastro" };
			}

			setUser({ name, email });
			return { success: true };
		} catch (error) {
			console.error("Erro no register:", error);
			return { success: false, error: "Falha ao conectar ao servidor" };
		}
	}

	async function login(email, password) {
		try {
			const response = await fetch(`${API_URL}/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				return { success: false, error: data.error || "Credenciais inválidas" };
			}

			setUser(data.user);
			return { success: true };
		} catch (error) {
			console.error("Erro no login:", error);
			return { success: false, error: "Falha ao conectar ao servidor" };
		}
	}

	return (
		<AuthContext.Provider value={{ user, register, login }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}

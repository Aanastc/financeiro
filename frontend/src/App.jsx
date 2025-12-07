import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Dashboard from "./pages/Dashboard";
import Entradas from "./pages/Entradas";
import Gastos from "./pages/Gastos";
import Metas from "./pages/Metas";
import Dividas from "./pages/Dividas";
import ContasFixas from "./pages/ContasFixas";
import DicasIA from "./pages/DicasIA";
import Relatorios from "./pages/Relatorios";
import Layout from "./components/Layout";

function ProtectedRoute({ children }) {
	const { user } = useAuth();
	return user ? children : <Navigate to="/login" />;
}

function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<ThemeProvider>
					<LanguageProvider>
						<Routes>
							<Route path="/login" element={<Login />} />
							<Route path="/cadastro" element={<Cadastro />} />

							<Route
								path="/"
								element={
									<ProtectedRoute>
										<Layout />
									</ProtectedRoute>
								}>
								<Route index element={<Dashboard />} />
								<Route path="entradas" element={<Entradas />} />
								<Route path="gastos" element={<Gastos />} />
								<Route path="metas" element={<Metas />} />
								<Route path="dividas" element={<Dividas />} />
								<Route path="contas-fixas" element={<ContasFixas />} />
								<Route path="dicas-ia" element={<DicasIA />} />
								<Route path="relatorios" element={<Relatorios />} />
							</Route>
						</Routes>
					</LanguageProvider>
				</ThemeProvider>
			</BrowserRouter>
		</AuthProvider>
	);
}

export default App;

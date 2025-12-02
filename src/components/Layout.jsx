import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
	House,
	ArrowDown,
	ArrowUp,
	CreditCard,
	ChartBar,
	Moon,
	Sun,
	Globe,
	List,
	X,
	SignOut,
} from "phosphor-react";

export default function Layout() {
	const { user, logout } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const { t, language, toggleLanguage } = useLanguage();
	const location = useLocation();
	const navigate = useNavigate();

	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const isActive = (path) => location.pathname === path;

	const menuItems = [
		{ path: "/", icon: House, label: t("dashboard") },
		{ path: "/entradas", icon: ArrowDown, label: t("entradas") },
		{ path: "/gastos", icon: ArrowUp, label: t("gastos") },
		{ path: "/dividas", icon: CreditCard, label: t("dividas") },
		{ path: "/relatorios", icon: ChartBar, label: t("relatorios") },
	];

	return (
		<div className="min-h-screen bg-nude dark:bg-gray-900 transition-colors">
			<nav className="bg-white dark:bg-gray-800 shadow-md border-b-2 border-rosa dark:border-gray-700 transition-colors">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						{/* LOGO */}
						<div className="flex items-center">
							<h1 className="text-lg sm:text-xl font-bold text-verde-lodo dark:text-verde-lodo whitespace-nowrap">
								💰 Financeiro
							</h1>

							{/* MENU DESKTOP — agora só aparece em telas grandes */}
							<div className="hidden lg:flex lg:space-x-6 ml-6">
								{menuItems.map((item) => {
									const Icon = item.icon;
									return (
										<Link
											key={item.path}
											to={item.path}
											className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${
												isActive(item.path)
													? "border-verde-lodo text-marrom dark:text-verde-lodo"
													: "border-transparent text-marrom dark:text-gray-300 hover:border-rosa hover:text-laranja-forte dark:hover:text-verde-lodo"
											}`}>
											<Icon size={20} className="mr-2" />
											{item.label}
										</Link>
									);
								})}
							</div>
						</div>

						{/* AÇÕES */}
						<div className="flex items-center gap-2  justify-end max-w-[60%] lg:max-w-none">
							{/* Tema */}
							<button
								onClick={toggleTheme}
								className="p-2 rounded-md text-marrom dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
								{theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
							</button>

							{/* Idioma */}
							<button
								onClick={toggleLanguage}
								className="p-2 rounded-md text-marrom dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
								<Globe size={20} />
							</button>

							<span className="hidden sm:block text-xs text-marrom dark:text-gray-300 font-medium">
								{language.toUpperCase()}
							</span>

							{/* Nome */}
							<span className="hidden sm:block text-sm text-marrom dark:text-gray-300 mr-2 whitespace-nowrap">
								{t("ola")}, {user?.name}
							</span>

							{/* Sair */}
							<button
								onClick={() => {
									logout();
									navigate("/login");
								}}
								className="hidden sm:flex items-center whitespace-nowrap px-4 py-2 rounded-md bg-laranja-forte text-white hover:bg-opacity-90 transition">
								<SignOut size={20} className="mr-2" />
								{t("sair")}
							</button>

							{/* BOTÃO HAMBÚRGUER — agora aparece no mobile + tablet */}
							<button
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
								className="lg:hidden p-2 rounded-md text-marrom dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
								{mobileMenuOpen ? <X size={24} /> : <List size={24} />}
							</button>
						</div>
					</div>
				</div>

				{/* MENU MOBILE + TABLET */}
				{mobileMenuOpen && (
					<div className="lg:hidden border-t border-rosa dark:border-gray-700">
						<div className="px-3 py-3 space-y-2">
							{menuItems.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.path}
										to={item.path}
										onClick={() => setMobileMenuOpen(false)}
										className={`flex items-center px-3 py-2 rounded-md text-base transition ${
											isActive(item.path)
												? "bg-verde-lodo bg-opacity-20 text-marrom dark:text-verde-lodo"
												: "text-marrom dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
										}`}>
										<Icon size={20} className="mr-3" />
										{item.label}
									</Link>
								);
							})}

							<div className="pt-3 border-t border-rosa dark:border-gray-700">
								<p className="text-sm text-marrom dark:text-gray-300 mb-3 px-3">
									{t("ola")}, {user?.name}
								</p>

								<button
									onClick={() => {
										logout();
										navigate("/login");
									}}
									className="w-full flex items-center justify-center px-4 py-2 rounded-md bg-laranja-forte text-white hover:bg-opacity-90 transition">
									<SignOut size={20} className="mr-2" />
									{t("sair")}
								</button>
							</div>
						</div>
					</div>
				)}
			</nav>

			{/* CONTEÚDO */}
			<main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
				<Outlet />
			</main>
		</div>
	);
}

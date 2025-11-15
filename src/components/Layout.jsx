import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  House,
  ArrowDown,
  ArrowUp,
  Target,
  CreditCard,
  Calendar,
  Sparkle,
  SignOut,
  ChartBar,
  Moon,
  Sun,
  Globe,
  List,
  X,
} from 'phosphor-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, language, toggleLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/', icon: House, label: t('dashboard') },
    { path: '/entradas', icon: ArrowDown, label: t('entradas') },
    { path: '/gastos', icon: ArrowUp, label: t('gastos') },
    { path: '/metas', icon: Target, label: t('metas') },
    { path: '/dividas', icon: CreditCard, label: t('dividas') },
    { path: '/contas-fixas', icon: Calendar, label: t('contasFixas') },
    { path: '/dicas-ia', icon: Sparkle, label: t('dicasIA') },
    { path: '/relatorios', icon: ChartBar, label: t('relatorios') },
  ];

  return (
    <div className="min-h-screen bg-nude dark:bg-gray-900 transition-colors">
      <nav className="bg-white dark:bg-gray-800 shadow-md border-b-2 border-rosa dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-verde-lodo dark:text-verde-lodo">
                  💰 Financeiro
                </h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${
                        isActive(item.path)
                          ? 'border-verde-lodo text-marrom dark:text-verde-lodo'
                          : 'border-transparent text-marrom dark:text-gray-300 hover:border-rosa hover:text-laranja-forte dark:hover:text-verde-lodo'
                      }`}
                    >
                      <Icon className="mr-2" size={20} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-marrom dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-md text-marrom dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle language"
              >
                <Globe size={20} />
              </button>
              <span className="text-xs text-marrom dark:text-gray-300 font-medium">
                {language.toUpperCase()}
              </span>

              {/* User info and logout - hidden on mobile */}
              <span className="hidden sm:block text-sm text-marrom dark:text-gray-300 mr-2">
                {t('ola')}, {user?.name}
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-laranja-forte hover:bg-opacity-90 transition"
              >
                <SignOut className="mr-2" size={20} />
                {t('sair')}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-marrom dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-rosa dark:border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition ${
                      isActive(item.path)
                        ? 'bg-verde-lodo bg-opacity-20 text-marrom dark:text-verde-lodo'
                        : 'text-marrom dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="mr-3" size={20} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-4 pb-3 border-t border-rosa dark:border-gray-700">
                <div className="px-3 mb-3">
                  <span className="text-sm text-marrom dark:text-gray-300">
                    {t('ola')}, {user?.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-laranja-forte hover:bg-opacity-90 transition"
                >
                  <SignOut className="mr-2" size={20} />
                  {t('sair')}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}


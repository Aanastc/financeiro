import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  pt: {
    // Navigation
    dashboard: 'Dashboard',
    entradas: 'Entradas',
    gastos: 'Gastos',
    metas: 'Metas',
    dividas: 'Dívidas',
    contasFixas: 'Contas Fixas',
    dicasIA: 'Dicas IA',
    relatorios: 'Relatórios',
    sair: 'Sair',
    ola: 'Olá',
    
    // Dashboard
    totalEntradas: 'Total de Entradas',
    totalSaidas: 'Total de Saídas',
    saldoDisponivel: 'Saldo Disponível',
    entradasVsSaidas: 'Entradas vs Saídas (Últimos 6 Meses)',
    distribuicao503020: 'Distribuição 50/30/20',
    evolucaoSaldo: 'Evolução do Saldo',
    gastosPorCategoria: 'Gastos por Categoria',
    regra503020Detalhes: 'Regra 50/30/20 - Detalhes',
    necessidades: 'Necessidades',
    estiloVida: 'Estilo de Vida',
    investimentos: 'Investimentos',
    ideal: 'Ideal',
    real: 'Real',
    doTotal: 'do total',
    acimaRecomendado: '⚠️ Acima do recomendado',
    abaixoRecomendado: 'ℹ️ Abaixo do recomendado',
    ultimasEntradas: 'Últimas Entradas',
    ultimasSaidas: 'Últimas Saídas',
    nenhumaEntrada: 'Nenhuma entrada registrada',
    nenhumaSaida: 'Nenhuma saída registrada',
    
    // Common
    mes: 'Mês',
    entradas: 'Entradas',
    saidas: 'Saídas',
    saldo: 'Saldo',
    valor: 'Valor',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    entradas: 'Income',
    gastos: 'Expenses',
    metas: 'Goals',
    dividas: 'Debts',
    contasFixas: 'Fixed Bills',
    dicasIA: 'AI Tips',
    relatorios: 'Reports',
    sair: 'Logout',
    ola: 'Hello',
    
    // Dashboard
    totalEntradas: 'Total Income',
    totalSaidas: 'Total Expenses',
    saldoDisponivel: 'Available Balance',
    entradasVsSaidas: 'Income vs Expenses (Last 6 Months)',
    distribuicao503020: '50/30/20 Distribution',
    evolucaoSaldo: 'Balance Evolution',
    gastosPorCategoria: 'Expenses by Category',
    regra503020Detalhes: '50/30/20 Rule - Details',
    necessidades: 'Needs',
    estiloVida: 'Wants',
    investimentos: 'Savings',
    ideal: 'Ideal',
    real: 'Actual',
    doTotal: 'of total',
    acimaRecomendado: '⚠️ Above recommended',
    abaixoRecomendado: 'ℹ️ Below recommended',
    ultimasEntradas: 'Latest Income',
    ultimasSaidas: 'Latest Expenses',
    nenhumaEntrada: 'No income recorded',
    nenhumaSaida: 'No expenses recorded',
    
    // Common
    mes: 'Month',
    entradas: 'Income',
    saidas: 'Expenses',
    saldo: 'Balance',
    valor: 'Value',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'pt';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage((prevLang) => (prevLang === 'pt' ? 'en' : 'pt'));
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}


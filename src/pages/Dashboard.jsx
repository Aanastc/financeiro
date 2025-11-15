import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../db/database';
import { format, startOfMonth, endOfMonth, parseISO, subMonths, eachMonthOfInterval } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import {
  ArrowDown,
  ArrowUp,
  Wallet,
  ArrowUp as TrendingUpIcon,
  CurrencyDollar,
  Check,
} from 'phosphor-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../utils/currency';

const COLORS = ['#96b5a6', '#febeac', '#d9434f', '#4e383d', '#fce1cb'];

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [indicators, setIndicators] = useState({
    totalEntradas: 0,
    totalSaidas: 0,
    saldo: 0,
  });
  const [regra503020, setRegra503020] = useState({
    necessidades: { ideal: 0, real: 0, percentual: 0, status: 'ok' },
    estiloVida: { ideal: 0, real: 0, percentual: 0, status: 'ok' },
    investimentos: { ideal: 0, real: 0, percentual: 0, status: 'ok' },
  });
  const [ultimasEntradas, setUltimasEntradas] = useState([]);
  const [ultimasSaidas, setUltimasSaidas] = useState([]);
  const [graficoMensal, setGraficoMensal] = useState([]);
  const [graficoSaldo, setGraficoSaldo] = useState([]);
  const [graficoCategorias, setGraficoCategorias] = useState([]);

  useEffect(() => {
    if (user) {
      loadData();
      loadGraficos();
    }
  }, [user, selectedMonth]);

  const loadData = async () => {
    const startDate = startOfMonth(selectedMonth);
    const endDate = endOfMonth(selectedMonth);

    // Carregar entradas
    const entradas = await db.entradas
      .where('userId')
      .equals(user.id)
      .filter((e) => {
        const data = parseISO(e.data);
        return data >= startDate && data <= endDate;
      })
      .toArray();

    // Carregar gastos
    const gastos = await db.gastos
      .where('userId')
      .equals(user.id)
      .filter((g) => {
        const data = parseISO(g.data);
        return data >= startDate && data <= endDate;
      })
      .toArray();

    // Carregar contas fixas pagas no mês
    const contasFixas = await db.contasFixas
      .where('userId')
      .equals(user.id)
      .filter((cf) => cf.status === 'pago')
      .toArray();

    const totalEntradas = entradas.reduce((sum, e) => sum + e.valor, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0);
    const totalContasFixas = contasFixas.reduce((sum, cf) => sum + cf.valorMensal, 0);
    const totalSaidas = totalGastos + totalContasFixas;
    const saldo = totalEntradas - totalSaidas;

    setIndicators({ totalEntradas, totalSaidas, saldo });

    // Calcular 50/30/20
    const gastosFixos = gastos.filter((g) => g.categoria === 'fixos').reduce((sum, g) => sum + g.valor, 0) + totalContasFixas;
    const gastosVariaveis = gastos.filter((g) => g.categoria === 'variáveis').reduce((sum, g) => sum + g.valor, 0);
    const gastosExtras = gastos.filter((g) => g.categoria === 'extras').reduce((sum, g) => sum + g.valor, 0);

    const idealNecessidades = totalEntradas * 0.5;
    const idealEstiloVida = totalEntradas * 0.3;
    const idealInvestimentos = totalEntradas * 0.2;

    const realNecessidades = gastosFixos;
    const realEstiloVida = gastosVariaveis;
    const realInvestimentos = gastosExtras;

    const percentNecessidades = totalEntradas > 0 ? (realNecessidades / totalEntradas) * 100 : 0;
    const percentEstiloVida = totalEntradas > 0 ? (realEstiloVida / totalEntradas) * 100 : 0;
    const percentInvestimentos = totalEntradas > 0 ? (realInvestimentos / totalEntradas) * 100 : 0;

    setRegra503020({
      necessidades: {
        ideal: idealNecessidades,
        real: realNecessidades,
        percentual: percentNecessidades,
        status: percentNecessidades > 55 ? 'excesso' : percentNecessidades < 45 ? 'abaixo' : 'ok',
      },
      estiloVida: {
        ideal: idealEstiloVida,
        real: realEstiloVida,
        percentual: percentEstiloVida,
        status: percentEstiloVida > 35 ? 'excesso' : percentEstiloVida < 25 ? 'abaixo' : 'ok',
      },
      investimentos: {
        ideal: idealInvestimentos,
        real: realInvestimentos,
        percentual: percentInvestimentos,
        status: percentInvestimentos < 15 ? 'abaixo' : 'ok',
      },
    });

    // Últimas entradas e saídas
    const todasEntradas = await db.entradas
      .where('userId')
      .equals(user.id)
      .reverse()
      .limit(5)
      .toArray();
    setUltimasEntradas(todasEntradas);

    const todasSaidas = await db.gastos
      .where('userId')
      .equals(user.id)
      .reverse()
      .limit(5)
      .toArray();
    setUltimasSaidas(todasSaidas);

    // Gráfico de categorias
    const categorias = ['fixos', 'variáveis', 'extras'];
    const dadosCategorias = categorias.map((cat) => {
      const gastosCategoria = gastos.filter((g) => g.categoria === cat);
      const total = gastosCategoria.reduce((sum, g) => sum + g.valor, 0);
      return {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        value: total,
      };
    });
    setGraficoCategorias(dadosCategorias);
  };

  const loadGraficos = async () => {
    // Gráfico dos últimos 6 meses
    const meses = eachMonthOfInterval({
      start: subMonths(selectedMonth, 5),
      end: selectedMonth,
    });

    const dadosMensais = await Promise.all(
      meses.map(async (mes) => {
        const startDate = startOfMonth(mes);
        const endDate = endOfMonth(mes);

        const entradas = await db.entradas
          .where('userId')
          .equals(user.id)
          .filter((e) => {
            const data = parseISO(e.data);
            return data >= startDate && data <= endDate;
          })
          .toArray();

        const gastos = await db.gastos
          .where('userId')
          .equals(user.id)
          .filter((g) => {
            const data = parseISO(g.data);
            return data >= startDate && data <= endDate;
          })
          .toArray();

        const contasFixas = await db.contasFixas
          .where('userId')
          .equals(user.id)
          .filter((cf) => cf.status === 'pago')
          .toArray();

        const totalEntradas = entradas.reduce((sum, e) => sum + e.valor, 0);
        const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0);
        const totalContasFixas = contasFixas.reduce((sum, cf) => sum + cf.valorMensal, 0);
        const totalSaidas = totalGastos + totalContasFixas;
        const saldo = totalEntradas - totalSaidas;

        return {
          mes: format(mes, 'MMM/yy', { locale: dateLocale }),
          entradas: totalEntradas,
          saidas: totalSaidas,
          saldo: saldo,
        };
      })
    );

    setGraficoMensal(dadosMensais);
    setGraficoSaldo(dadosMensais);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
        return 'text-verde-lodo bg-green-50 dark:bg-green-900 dark:bg-opacity-20';
      case 'excesso':
        return 'text-laranja-forte bg-red-50 dark:bg-red-900 dark:bg-opacity-20';
      case 'abaixo':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-20';
    }
  };

  // Dados para gráfico de pizza 50/30/20
  const dadosPizza503020 = [
    { name: t('necessidades'), value: regra503020.necessidades.real, percent: regra503020.necessidades.percentual },
    { name: t('estiloVida'), value: regra503020.estiloVida.real, percent: regra503020.estiloVida.percentual },
    { name: t('investimentos'), value: regra503020.investimentos.real, percent: regra503020.investimentos.percentual },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-semibold text-marrom dark:text-gray-300">{payload[0].name}</p>
          <p className="text-verde-lodo">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatMonthLabel = (date) => {
    if (language === 'pt') {
      return format(date, "MMMM 'de' yyyy", { locale: dateLocale });
    }
    return format(date, 'MMMM yyyy', { locale: dateLocale });
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-marrom dark:text-gray-100">{t('dashboard')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {formatMonthLabel(selectedMonth)}
        </p>
        <div className="mt-4">
          <input
            type="month"
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
            className="px-4 py-2 border border-rosa dark:border-gray-600 rounded-md focus:ring-verde-lodo focus:border-verde-lodo bg-white dark:bg-gray-800 text-marrom dark:text-gray-300"
          />
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-verde-lodo transition-colors">
          <div className="flex items-center">
            <div className="p-3 bg-verde-lodo bg-opacity-20 rounded-full">
              <ArrowDown className="text-verde-lodo" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalEntradas')}</p>
              <p className="text-2xl font-bold text-marrom dark:text-gray-100">
                {formatCurrency(indicators.totalEntradas)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-laranja-forte transition-colors">
          <div className="flex items-center">
            <div className="p-3 bg-laranja-forte bg-opacity-20 rounded-full">
              <ArrowUp className="text-laranja-forte" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalSaidas')}</p>
              <p className="text-2xl font-bold text-marrom dark:text-gray-100">
                {formatCurrency(indicators.totalSaidas)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500 transition-colors">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${indicators.saldo >= 0 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-red-100 dark:bg-red-900'}`}>
              <Wallet className={indicators.saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('saldoDisponivel')}</p>
              <p className={`text-2xl font-bold ${indicators.saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(indicators.saldo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Barras - Entradas vs Saídas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <h2 className="text-xl font-bold text-marrom dark:text-gray-100 mb-4">{t('entradasVsSaidas')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={graficoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
              <XAxis dataKey="mes" stroke="#6b7280" className="dark:stroke-gray-400" />
              <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="entradas" fill="#96b5a6" name={t('entradas')} />
              <Bar dataKey="saidas" fill="#d9434f" name={t('saidas')} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Pizza - 50/30/20 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <h2 className="text-xl font-bold text-marrom dark:text-gray-100 mb-4">{t('distribuicao503020')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dadosPizza503020}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosPizza503020.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Linha - Evolução do Saldo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <h2 className="text-xl font-bold text-marrom dark:text-gray-100 mb-4">{t('evolucaoSaldo')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={graficoSaldo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
              <XAxis dataKey="mes" stroke="#6b7280" className="dark:stroke-gray-400" />
              <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="saldo" stroke="#96b5a6" strokeWidth={2} name={t('saldo')} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Barras - Gastos por Categoria */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <h2 className="text-xl font-bold text-marrom dark:text-gray-100 mb-4">{t('gastosPorCategoria')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={graficoCategorias}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
              <XAxis dataKey="name" stroke="#6b7280" className="dark:stroke-gray-400" />
              <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#febeac" name={t('valor')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regra 50/30/20 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors">
        <h2 className="text-xl font-bold text-marrom dark:text-gray-100 mb-4">{t('regra503020Detalhes')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'necessidades', labelKey: 'necessidades', percent: '50%', icon: Check },
            { key: 'estiloVida', labelKey: 'estiloVida', percent: '30%', icon: TrendingUpIcon },
            { key: 'investimentos', labelKey: 'investimentos', percent: '20%', icon: CurrencyDollar },
          ].map(({ key, labelKey, percent, icon: Icon }) => {
            const data = regra503020[key];
            return (
              <div key={key} className={`p-4 rounded-lg ${getStatusColor(data.status)} dark:bg-opacity-20`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold dark:text-gray-200">{t(labelKey)} ({percent})</span>
                  <Icon size={20} className="dark:text-gray-300" />
                </div>
                <p className="text-sm mb-1 dark:text-gray-300">{t('ideal')}: {formatCurrency(data.ideal)}</p>
                <p className="text-sm mb-1 dark:text-gray-300">{t('real')}: {formatCurrency(data.real)}</p>
                <p className="text-lg font-bold dark:text-gray-200">
                  {data.percentual.toFixed(1)}% {t('doTotal')}
                </p>
                {data.status === 'excesso' && (
                  <p className="text-xs mt-2 dark:text-gray-300">{t('acimaRecomendado')}</p>
                )}
                {data.status === 'abaixo' && (
                  <p className="text-xs mt-2 dark:text-gray-300">{t('abaixoRecomendado')}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <h2 className="text-xl font-bold text-marrom dark:text-gray-100 mb-4">{t('ultimasEntradas')}</h2>
          <div className="space-y-3">
            {ultimasEntradas.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{t('nenhumaEntrada')}</p>
            ) : (
              ultimasEntradas.map((entrada) => (
                <div key={entrada.id} className="flex justify-between items-center p-3 bg-nude dark:bg-gray-700 rounded transition-colors">
                  <div>
                    <p className="font-medium text-marrom dark:text-gray-200">{entrada.nome}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(parseISO(entrada.data), 'dd/MM/yyyy', { locale: dateLocale })}
                    </p>
                  </div>
                  <p className="font-bold text-verde-lodo">
                    {formatCurrency(entrada.valor)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
          <h2 className="text-xl font-bold text-marrom dark:text-gray-100 mb-4">{t('ultimasSaidas')}</h2>
          <div className="space-y-3">
            {ultimasSaidas.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{t('nenhumaSaida')}</p>
            ) : (
              ultimasSaidas.map((saida) => (
                <div key={saida.id} className="flex justify-between items-center p-3 bg-nude dark:bg-gray-700 rounded transition-colors">
                  <div>
                    <p className="font-medium text-marrom dark:text-gray-200">{saida.nome}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(parseISO(saida.data), 'dd/MM/yyyy', { locale: dateLocale })}
                    </p>
                  </div>
                  <p className="font-bold text-laranja-forte">
                    {formatCurrency(saida.valor)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

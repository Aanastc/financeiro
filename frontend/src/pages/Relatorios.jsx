import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import { format, parseISO, startOfYear, eachMonthOfInterval, getYear, getMonth, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

export default function Relatorios() {
  const { user } = useAuth();
  const [ano, setAno] = useState(new Date().getFullYear());
  const [dadosAnuais, setDadosAnuais] = useState([]);
  const [dadosContasFixas, setDadosContasFixas] = useState([]);
  const [dadosDividas, setDadosDividas] = useState([]);

  useEffect(() => {
    if (user) {
      loadRelatorios();
    }
  }, [user, ano]);

  const loadRelatorios = async () => {
    await loadRelatorioGeral();
    await loadRelatorioContasFixas();
    await loadRelatorioDividas();
  };

  const loadRelatorioGeral = async () => {
    const meses = eachMonthOfInterval({
      start: startOfYear(new Date(ano, 0, 1)),
      end: new Date(ano, 11, 31),
    });

    const dados = await Promise.all(
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

        // Calcular 50/30/20
        const gastosFixos = gastos.filter((g) => g.categoria === 'fixos').reduce((sum, g) => sum + g.valor, 0) + totalContasFixas;
        const gastosVariaveis = gastos.filter((g) => g.categoria === 'variáveis').reduce((sum, g) => sum + g.valor, 0);
        const gastosExtras = gastos.filter((g) => g.categoria === 'extras').reduce((sum, g) => sum + g.valor, 0);

        return {
          mes: format(mes, 'MMM', { locale: ptBR }),
          entradas: totalEntradas,
          saidas: totalSaidas,
          saldo: saldo,
          necessidades: gastosFixos,
          estiloVida: gastosVariaveis,
          investimentos: gastosExtras,
        };
      })
    );

    setDadosAnuais(dados);
  };

  const loadRelatorioContasFixas = async () => {
    const contasFixas = await db.contasFixas.where('userId').equals(user.id).toArray();
    
    const dados = await Promise.all(
      contasFixas.map(async (conta) => {
        const pagamentos = await db.pagamentosContasFixas
          .where('contaFixaId')
          .equals(conta.id)
          .toArray();
        
        const valorPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
        const mesesPagos = pagamentos.length;
        const valorMensalPrevisto = conta.valorMensal * 12; // Projeção anual

        return {
          nome: conta.nome,
          valorMensal: conta.valorMensal,
          valorPago: valorPago,
          mesesPagos: mesesPagos,
          valorMensalPrevisto: valorMensalPrevisto,
        };
      })
    );

    setDadosContasFixas(dados);
  };

  const loadRelatorioDividas = async () => {
    const dividas = await db.dividas.where('userId').equals(user.id).toArray();
    
    const dados = await Promise.all(
      dividas.map(async (divida) => {
        const parcelasPagas = await db.parcelasPagas
          .where('dividaId')
          .equals(divida.id)
          .toArray();
        
        const valorPago = parcelasPagas.reduce((sum, p) => sum + p.valor, 0);
        const valorRestante = divida.valorTotal - valorPago;
        const percentualPago = (valorPago / divida.valorTotal) * 100;
        
        // Projeção de quitação
        const mesesRestantes = divida.parcelasRestantes;
        const dataQuitacao = mesesRestantes > 0 
          ? format(addMonths(new Date(), mesesRestantes), 'MMM/yyyy', { locale: ptBR })
          : 'Quitada';

        return {
          nome: divida.nome,
          valorTotal: divida.valorTotal,
          valorPago: valorPago,
          valorRestante: valorRestante,
          parcelasPagas: parcelasPagas.length,
          parcelasTotais: divida.parcelasTotais,
          percentualPago: percentualPago,
          dataQuitacao: dataQuitacao,
        };
      })
    );

    setDadosDividas(dados);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-marrom">{payload[0].name}</p>
          <p className="text-verde-lodo">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Totais anuais
  const totalEntradasAnual = dadosAnuais.reduce((sum, d) => sum + d.entradas, 0);
  const totalSaidasAnual = dadosAnuais.reduce((sum, d) => sum + d.saidas, 0);
  const saldoAnual = totalEntradasAnual - totalSaidasAnual;

  // Dados para gráfico de pizza anual
  const dadosPizzaAnual = [
    { name: 'Necessidades', value: dadosAnuais.reduce((sum, d) => sum + d.necessidades, 0) },
    { name: 'Estilo de Vida', value: dadosAnuais.reduce((sum, d) => sum + d.estiloVida, 0) },
    { name: 'Investimentos', value: dadosAnuais.reduce((sum, d) => sum + d.investimentos, 0) },
  ];

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-marrom">Relatórios</h1>
        <div className="mt-4">
          <label className="block text-sm font-medium text-marrom mb-2">Ano</label>
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="px-4 py-2 border border-rosa rounded-md focus:ring-verde-lodo focus:border-verde-lodo bg-white"
          />
        </div>
      </div>

      {/* Resumo Anual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-verde-lodo">
          <p className="text-sm text-gray-600">Total de Entradas</p>
          <p className="text-3xl font-bold text-marrom">{formatCurrency(totalEntradasAnual)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-laranja-forte">
          <p className="text-sm text-gray-600">Total de Saídas</p>
          <p className="text-3xl font-bold text-marrom">{formatCurrency(totalSaidasAnual)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Saldo Anual</p>
          <p className={`text-3xl font-bold ${saldoAnual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(saldoAnual)}
          </p>
        </div>
      </div>

      {/* Gráficos Anuais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-marrom mb-4">Entradas vs Saídas - {ano}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosAnuais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="entradas" fill="#96b5a6" name="Entradas" />
              <Bar dataKey="saidas" fill="#d9434f" name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-marrom mb-4">Distribuição 50/30/20 - {ano}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dadosPizzaAnual}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosPizzaAnual.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-marrom mb-4">Evolução do Saldo - {ano}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosAnuais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="saldo" stroke="#96b5a6" strokeWidth={2} name="Saldo" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-marrom mb-4">Gastos por Categoria - {ano}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosAnuais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="necessidades" stackId="a" fill="#96b5a6" name="Necessidades" />
              <Bar dataKey="estiloVida" stackId="a" fill="#febeac" name="Estilo de Vida" />
              <Bar dataKey="investimentos" stackId="a" fill="#d9434f" name="Investimentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Relatório de Contas Fixas */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-marrom mb-4">Relatório de Contas Fixas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-verde-lodo">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Conta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Valor Mensal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Valor Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Meses Pagos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Previsto Anual</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dadosContasFixas.map((conta, idx) => (
                <tr key={idx} className="hover:bg-nude">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-marrom">{conta.nome}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatCurrency(conta.valorMensal)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-verde-lodo font-bold">{formatCurrency(conta.valorPago)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{conta.mesesPagos}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatCurrency(conta.valorMensalPrevisto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relatório de Dívidas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-marrom mb-4">Relatório de Dívidas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-verde-lodo">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Dívida</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Valor Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Valor Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Valor Restante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Parcelas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">% Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Projeção Quitação</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dadosDividas.map((divida, idx) => (
                <tr key={idx} className="hover:bg-nude">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-marrom">{divida.nome}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatCurrency(divida.valorTotal)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-verde-lodo font-bold">{formatCurrency(divida.valorPago)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-laranja-forte font-bold">{formatCurrency(divida.valorRestante)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{divida.parcelasPagas}/{divida.parcelasTotais}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{divida.percentualPago.toFixed(1)}%</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{divida.dataQuitacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


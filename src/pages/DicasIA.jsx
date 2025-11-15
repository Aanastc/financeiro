import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sparkle, CircleNotch } from 'phosphor-react';

export default function DicasIA() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dicas, setDicas] = useState(null);
  const [resumo, setResumo] = useState(null);

  useEffect(() => {
    if (user) {
      loadResumo();
    }
  }, [user]);

  const loadResumo = async () => {
    const hoje = new Date();
    const startDate = startOfMonth(hoje);
    const endDate = endOfMonth(hoje);

    // Carregar dados do mês atual
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
      .toArray();

    const metas = await db.metas.where('userId').equals(user.id).toArray();
    const metasComAportes = await Promise.all(
      metas.map(async (meta) => {
        const aportes = await db.aportes.where('metaId').equals(meta.id).toArray();
        const valorAtual = aportes.reduce((sum, a) => sum + a.valor, 0);
        return { ...meta, valorAtual };
      })
    );

    const dividas = await db.dividas.where('userId').equals(user.id).toArray();
    const dividasComParcelas = await Promise.all(
      dividas.map(async (divida) => {
        const parcelasPagas = await db.parcelasPagas
          .where('dividaId')
          .equals(divida.id)
          .toArray();
        return { ...divida, parcelasPagas: parcelasPagas.length };
      })
    );

    const totalEntradas = entradas.reduce((sum, e) => sum + e.valor, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0);
    const totalContasFixas = contasFixas
      .filter((cf) => cf.status === 'pago')
      .reduce((sum, cf) => sum + cf.valorMensal, 0);
    const totalSaidas = totalGastos + totalContasFixas;
    const saldo = totalEntradas - totalSaidas;

    // Calcular 50/30/20
    const gastosFixos = gastos.filter((g) => g.categoria === 'fixos').reduce((sum, g) => sum + g.valor, 0) + totalContasFixas;
    const gastosVariaveis = gastos.filter((g) => g.categoria === 'variáveis').reduce((sum, g) => sum + g.valor, 0);
    const gastosExtras = gastos.filter((g) => g.categoria === 'extras').reduce((sum, g) => sum + g.valor, 0);

    const idealNecessidades = totalEntradas * 0.5;
    const idealEstiloVida = totalEntradas * 0.3;
    const idealInvestimentos = totalEntradas * 0.2;

    const gastosPorCategoria = gastos.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
      return acc;
    }, {});

    setResumo({
      totalEntradas,
      totalSaidas,
      saldo,
      gastosFixos,
      gastosVariaveis,
      gastosExtras,
      idealNecessidades,
      idealEstiloVida,
      idealInvestimentos,
      gastosPorCategoria,
      metas: metasComAportes,
      dividas: dividasComParcelas,
      contasFixas,
    });
  };

  const gerarDicas = async () => {
    setLoading(true);
    setDicas(null);

    // Simular processamento de IA (em produção, aqui seria uma chamada real à API)
    setTimeout(() => {
      const dicasGeradas = generateDicas(resumo);
      setDicas(dicasGeradas);
      setLoading(false);
    }, 2000);
  };

  const generateDicas = (resumo) => {
    const dicas = [];

    // Análise 50/30/20
    if (resumo.gastosFixos > resumo.idealNecessidades) {
      const excesso = resumo.gastosFixos - resumo.idealNecessidades;
      dicas.push({
        tipo: 'alerta',
        titulo: '⚠️ Gastos Fixos Acima do Recomendado',
        descricao: `Você está gastando ${((resumo.gastosFixos / resumo.totalEntradas) * 100).toFixed(1)}% em necessidades, quando o ideal é 50%. Considere reduzir R$ ${excesso.toFixed(2)} em gastos fixos.`,
        acao: 'Revise suas contas fixas e veja se há assinaturas ou serviços que podem ser cancelados.',
      });
    }

    if (resumo.gastosVariaveis > resumo.idealEstiloVida) {
      const excesso = resumo.gastosVariaveis - resumo.idealEstiloVida;
      dicas.push({
        tipo: 'alerta',
        titulo: '⚠️ Estilo de Vida Acima do Limite',
        descricao: `Seus gastos variáveis estão em ${((resumo.gastosVariaveis / resumo.totalEntradas) * 100).toFixed(1)}%, acima dos 30% recomendados.`,
        acao: 'Tente reduzir gastos desnecessários e priorize o essencial.',
      });
    }

    if (resumo.gastosExtras < resumo.idealInvestimentos * 0.5) {
      dicas.push({
        tipo: 'sugestao',
        titulo: '💡 Aumente seus Investimentos',
        descricao: `Você está investindo apenas ${((resumo.gastosExtras / resumo.totalEntradas) * 100).toFixed(1)}% do seu orçamento. O ideal seria 20%.`,
        acao: 'Considere aumentar seus aportes em metas ou investimentos.',
      });
    }

    // Análise de saldo
    if (resumo.saldo < 0) {
      dicas.push({
        tipo: 'alerta',
        titulo: '🔴 Saldo Negativo',
        descricao: `Seu saldo está negativo em R$ ${Math.abs(resumo.saldo).toFixed(2)}. Isso indica que você está gastando mais do que ganha.`,
        acao: 'Revise urgentemente seus gastos e considere aumentar suas fontes de renda.',
      });
    } else if (resumo.saldo > resumo.totalEntradas * 0.2) {
      dicas.push({
        tipo: 'sucesso',
        titulo: '✅ Excelente Controle Financeiro',
        descricao: `Você está mantendo ${((resumo.saldo / resumo.totalEntradas) * 100).toFixed(1)}% do seu orçamento como reserva.`,
        acao: 'Considere investir parte desse valor em suas metas financeiras.',
      });
    }

    // Análise de metas
    const metasAtrasadas = resumo.metas.filter((m) => {
      const percentual = (m.valorAtual / m.valorTotal) * 100;
      return percentual < 50 && m.createdAt < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    });

    if (metasAtrasadas.length > 0) {
      dicas.push({
        tipo: 'sugestao',
        titulo: '🎯 Metas Precisam de Atenção',
        descricao: `Você tem ${metasAtrasadas.length} meta(s) com progresso abaixo de 50% há mais de 3 meses.`,
        acao: 'Revise suas metas e considere aumentar os aportes ou ajustar os valores.',
      });
    }

    // Análise de dívidas
    const dividasAbertas = resumo.dividas.filter((d) => d.parcelasRestantes > 0);
    if (dividasAbertas.length > 0) {
      const totalDividas = dividasAbertas.reduce((sum, d) => sum + d.valorParcela, 0);
      if (totalDividas > resumo.totalEntradas * 0.3) {
        dicas.push({
          tipo: 'alerta',
          titulo: '⚠️ Dívidas Consomem Muito do Orçamento',
          descricao: `Suas parcelas de dívidas representam ${((totalDividas / resumo.totalEntradas) * 100).toFixed(1)}% da sua renda.`,
          acao: 'Considere renegociar ou priorizar o pagamento das dívidas com maior juros.',
        });
      }
    }

    // Análise de contas fixas
    const contasAtrasadas = resumo.contasFixas.filter((cf) => cf.status === 'atrasado');
    if (contasAtrasadas.length > 0) {
      dicas.push({
        tipo: 'alerta',
        titulo: '⏰ Contas Atrasadas',
        descricao: `Você tem ${contasAtrasadas.length} conta(s) fixa(s) atrasada(s).`,
        acao: 'Priorize o pagamento dessas contas para evitar juros e multas.',
      });
    }

    // Sugestões de economia
    if (resumo.gastosPorCategoria) {
      const maiorCategoria = Object.entries(resumo.gastosPorCategoria).sort(
        (a, b) => b[1] - a[1]
      )[0];
      if (maiorCategoria) {
        dicas.push({
          tipo: 'sugestao',
          titulo: '💰 Oportunidade de Economia',
          descricao: `A categoria "${maiorCategoria[0]}" representa seu maior gasto (R$ ${maiorCategoria[1].toFixed(2)}).`,
          acao: 'Revise esses gastos e veja se há oportunidades de redução.',
        });
      }
    }

    // Dica geral
    if (dicas.length === 0) {
      dicas.push({
        tipo: 'sucesso',
        titulo: '🎉 Parabéns!',
        descricao: 'Seu controle financeiro está excelente! Continue mantendo essa disciplina.',
        acao: 'Continue acompanhando seus gastos e mantendo o foco nas suas metas.',
      });
    }

    return dicas;
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'alerta':
        return 'border-red-500 bg-red-50';
      case 'sugestao':
        return 'border-yellow-500 bg-yellow-50';
      case 'sucesso':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dicas de IA</h1>
        <p className="text-gray-600">
          Análise inteligente do seu controle financeiro com recomendações personalizadas
        </p>
      </div>

      {resumo && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo do Mês Atual</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total de Entradas</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(resumo.totalEntradas)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Saídas</p>
              <p className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(resumo.totalSaidas)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Saldo</p>
              <p
                className={`text-2xl font-bold ${
                  resumo.saldo >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(resumo.saldo)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Análise e Recomendações</h2>
          <button
            onClick={gerarDicas}
            disabled={loading || !resumo}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <CircleNotch className="animate-spin mr-2" size={20} />
                Gerando...
              </>
            ) : (
              <>
                <Sparkle size={20} className="mr-2" />
                Gerar Dicas Financeiras
              </>
            )}
          </button>
        </div>

        {dicas && (
          <div className="space-y-4 mt-6">
            {dicas.map((dica, index) => (
              <div
                key={index}
                className={`border-l-4 rounded p-4 ${getTipoColor(dica.tipo)}`}
              >
                <h3 className="font-bold text-gray-900 mb-2">{dica.titulo}</h3>
                <p className="text-gray-700 mb-2">{dica.descricao}</p>
                <p className="text-sm text-gray-600 italic">💡 {dica.acao}</p>
              </div>
            ))}
          </div>
        )}

        {!dicas && !loading && (
          <div className="text-center py-12 text-gray-500">
            <Sparkle size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Clique no botão acima para gerar dicas personalizadas baseadas no seu controle financeiro.</p>
          </div>
        )}
      </div>
    </div>
  );
}


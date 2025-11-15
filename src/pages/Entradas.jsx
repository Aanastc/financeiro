import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import { format, parseISO, startOfYear, eachMonthOfInterval, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, MagnifyingGlass, Funnel } from 'phosphor-react';
import Modal from '../components/Modal';
import { formatCurrency, parseCurrency, formatCurrencyInput } from '../utils/currency';

export default function Entradas() {
  const { user } = useAuth();
  const [entradas, setEntradas] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState(null);
  const [filters, setFilters] = useState({
    ano: new Date().getFullYear(),
    tipo: '',
  });

  useEffect(() => {
    if (user) {
      loadEntradas();
      loadSugestoes();
    }
  }, [user]);

  const loadEntradas = async () => {
    const data = await db.entradas.where('userId').equals(user.id).toArray();
    setEntradas(data);
  };

  const loadSugestoes = async () => {
    const data = await db.sugestoesEntradas
      .where('userId')
      .equals(user.id)
      .sortBy('vezesUsado');
    setSugestoes(data.reverse().slice(0, 10)); // Top 10 mais usadas
  };

  const handleSave = async (formData) => {
    const entradaData = {
      ...formData,
      userId: user.id,
      valor: parseCurrency(formData.valor),
    };

    if (editingEntrada) {
      await db.entradas.update(editingEntrada.id, entradaData);
    } else {
      await db.entradas.add({
        ...entradaData,
        createdAt: new Date(),
      });

      // Atualizar sugestões
      const sugestaoExistente = await db.sugestoesEntradas
        .where('userId')
        .equals(user.id)
        .and((s) => s.nome === formData.nome)
        .first();

      if (sugestaoExistente) {
        await db.sugestoesEntradas.update(sugestaoExistente.id, {
          vezesUsado: sugestaoExistente.vezesUsado + 1,
          ultimoUso: new Date(),
        });
      } else {
        await db.sugestoesEntradas.add({
          userId: user.id,
          nome: formData.nome,
          vezesUsado: 1,
          ultimoUso: new Date(),
        });
      }
    }

    await loadEntradas();
    await loadSugestoes();
    setShowModal(false);
    setEditingEntrada(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta entrada?')) {
      await db.entradas.delete(id);
      await loadEntradas();
    }
  };

  // Gerar tabela mensal
  const getTabelaMensal = () => {
    const ano = filters.ano || new Date().getFullYear();
    const meses = eachMonthOfInterval({
      start: startOfYear(new Date(ano, 0, 1)),
      end: new Date(ano, 11, 31),
    });

    // Agrupar entradas por nome
    const entradasPorNome = {};
    entradas.forEach((entrada) => {
      if (!entradasPorNome[entrada.nome]) {
        entradasPorNome[entrada.nome] = {};
      }
      const data = parseISO(entrada.data);
      const mes = getMonth(data);
      const anoEntrada = getYear(data);
      if (anoEntrada === ano) {
        entradasPorNome[entrada.nome][mes] = (entradasPorNome[entrada.nome][mes] || 0) + entrada.valor;
      }
    });

    // Filtrar por tipo se necessário
    let entradasFiltradas = Object.keys(entradasPorNome);
    if (filters.tipo) {
      entradasFiltradas = entradasFiltradas.filter((nome) => nome === filters.tipo);
    }

    const linhas = entradasFiltradas.map((nome) => {
      const valoresMensais = meses.map((mes, idx) => {
        return entradasPorNome[nome][idx] || 0;
      });
      const total = valoresMensais.reduce((sum, val) => sum + val, 0);
      return { nome, valoresMensais, total };
    });

    // Linha de totais
    const totaisMensais = meses.map((_, idx) => {
      return linhas.reduce((sum, linha) => sum + linha.valoresMensais[idx], 0);
    });
    const totalGeral = totaisMensais.reduce((sum, val) => sum + val, 0);

    return { linhas, meses, totaisMensais, totalGeral };
  };

  const { linhas, meses, totaisMensais, totalGeral } = getTabelaMensal();

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-marrom">Entradas</h1>
        <button
          onClick={() => {
            setEditingEntrada(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-verde-lodo text-white rounded-md hover:bg-opacity-90 transition"
        >
          <Plus size={20} className="mr-2" />
          Adicionar Entrada
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-nude rounded-lg shadow p-4 mb-6">
        <div className="flex items-center mb-4">
          <Funnel size={20} className="mr-2 text-marrom" />
          <h3 className="font-semibold text-marrom">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-marrom mb-1">Ano</label>
            <input
              type="number"
              value={filters.ano}
              onChange={(e) => setFilters({ ...filters, ano: parseInt(e.target.value) || new Date().getFullYear() })}
              className="w-full px-3 py-2 border border-rosa rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-marrom mb-1">Tipo de Entrada</label>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              className="w-full px-3 py-2 border border-rosa rounded-md bg-white"
            >
              <option value="">Todos</option>
              {sugestoes.map((sugestao) => (
                <option key={sugestao.id} value={sugestao.nome}>
                  {sugestao.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Mensal */}
      <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
        <div className="p-4">
          <h2 className="text-xl font-bold text-marrom mb-4">
            Tabela Mensal - {filters.ano}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-verde-lodo">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase sticky left-0 bg-verde-lodo">
                    Entrada
                  </th>
                  {meses.map((mes, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-left text-xs font-medium text-white uppercase whitespace-nowrap"
                    >
                      {format(mes, 'MMM', { locale: ptBR })}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {linhas.map((linha, idx) => (
                  <tr key={idx} className="hover:bg-nude">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-marrom sticky left-0 bg-white">
                      {linha.nome}
                    </td>
                    {linha.valoresMensais.map((valor, idx) => (
                      <td key={idx} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {valor > 0 ? formatCurrency(valor) : '-'}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-verde-lodo">
                      {formatCurrency(linha.total)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-rosa font-bold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-marrom sticky left-0 bg-rosa">
                    Total
                  </td>
                  {totaisMensais.map((total, idx) => (
                    <td key={idx} className="px-4 py-3 whitespace-nowrap text-sm text-marrom">
                      {formatCurrency(total)}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-marrom">
                    {formatCurrency(totalGeral)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <ModalEntrada
          entrada={editingEntrada}
          sugestoes={sugestoes}
          onClose={() => {
            setShowModal(false);
            setEditingEntrada(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ModalEntrada({ entrada, sugestoes, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nome: entrada?.nome || '',
    valor: entrada?.valor ? formatCurrency(entrada.valor) : '',
    data: entrada?.data ? format(parseISO(entrada.data), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    categoria: entrada?.categoria || '',
  });

  const handleValorChange = (e) => {
    const formatted = formatCurrencyInput(e.target.value);
    setFormData({ ...formData, valor: formatted });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal onClose={onClose} title={entrada ? 'Editar Entrada' : 'Adicionar Entrada'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Nome</label>
          <input
            list="sugestoes"
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            placeholder="Ex: Salário 15"
          />
          <datalist id="sugestoes">
            {sugestoes.map((sugestao) => (
              <option key={sugestao.id} value={sugestao.nome} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Valor</label>
          <input
            type="text"
            required
            value={formData.valor}
            onChange={handleValorChange}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            placeholder="0,00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Digite o valor e ele será formatado automaticamente
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Data</label>
          <input
            type="date"
            required
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            className="w-full px-3 py-2 border border-rosa rounded-md"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-rosa rounded-md text-marrom hover:bg-nude"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-verde-lodo text-white rounded-md hover:bg-opacity-90"
          >
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

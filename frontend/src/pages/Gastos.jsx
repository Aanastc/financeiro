import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, MagnifyingGlass, Funnel } from 'phosphor-react';
import Modal from '../components/Modal';

export default function Gastos() {
  const { user } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [filteredGastos, setFilteredGastos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);
  const [filters, setFilters] = useState({
    categoria: '',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    busca: '',
    valorMin: '',
    valorMax: '',
    dataInicio: '',
    dataFim: '',
    limite503020: '',
  });
  const [limites503020, setLimites503020] = useState({
    necessidades: 0,
    estiloVida: 0,
    investimentos: 0,
  });

  useEffect(() => {
    if (user) {
      loadGastos();
      calculateLimites();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [gastos, filters]);

  const loadGastos = async () => {
    const data = await db.gastos.where('userId').equals(user.id).toArray();
    setGastos(data);
  };

  const calculateLimites = async () => {
    const mesAtual = new Date(filters.ano, filters.mes - 1, 1);
    const startDate = startOfMonth(mesAtual);
    const endDate = endOfMonth(mesAtual);

    const entradas = await db.entradas
      .where('userId')
      .equals(user.id)
      .filter((e) => {
        const data = parseISO(e.data);
        return data >= startDate && data <= endDate;
      })
      .toArray();

    const totalEntradas = entradas.reduce((sum, e) => sum + e.valor, 0);

    setLimites503020({
      necessidades: totalEntradas * 0.5,
      estiloVida: totalEntradas * 0.3,
      investimentos: totalEntradas * 0.2,
    });
  };

  const applyFilters = () => {
    let filtered = [...gastos];

    if (filters.categoria) {
      filtered = filtered.filter((g) => g.categoria === filters.categoria);
    }

    if (filters.mes) {
      filtered = filtered.filter((g) => {
        const month = new Date(g.data).getMonth() + 1;
        return month === filters.mes;
      });
    }

    if (filters.ano) {
      filtered = filtered.filter((g) => {
        const year = new Date(g.data).getFullYear();
        return year === filters.ano;
      });
    }

    if (filters.busca) {
      filtered = filtered.filter((g) =>
        g.nome.toLowerCase().includes(filters.busca.toLowerCase())
      );
    }

    if (filters.valorMin) {
      filtered = filtered.filter((g) => g.valor >= parseFloat(filters.valorMin));
    }

    if (filters.valorMax) {
      filtered = filtered.filter((g) => g.valor <= parseFloat(filters.valorMax));
    }

    if (filters.dataInicio) {
      filtered = filtered.filter((g) => new Date(g.data) >= new Date(filters.dataInicio));
    }

    if (filters.dataFim) {
      filtered = filtered.filter((g) => new Date(g.data) <= new Date(filters.dataFim));
    }

    if (filters.limite503020) {
      const gastosPorCategoria = filtered.reduce((acc, g) => {
        acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
        return acc;
      }, {});

      filtered = filtered.filter((g) => {
        const totalCategoria = gastosPorCategoria[g.categoria] || 0;
        let limite = 0;
        if (g.categoria === 'fixos') limite = limites503020.necessidades;
        if (g.categoria === 'variáveis') limite = limites503020.estiloVida;
        if (g.categoria === 'extras') limite = limites503020.investimentos;

        if (filters.limite503020 === 'acima') return totalCategoria > limite;
        if (filters.limite503020 === 'abaixo') return totalCategoria < limite;
        if (filters.limite503020 === 'dentro') {
          return totalCategoria <= limite && totalCategoria >= limite * 0.9;
        }
        return true;
      });
    }

    setFilteredGastos(filtered);
  };

  const handleSave = async (formData) => {
    if (editingGasto) {
      await db.gastos.update(editingGasto.id, {
        ...formData,
        userId: user.id,
      });
    } else {
      await db.gastos.add({
        ...formData,
        userId: user.id,
        createdAt: new Date(),
      });
    }
    await loadGastos();
    await calculateLimites();
    setShowModal(false);
    setEditingGasto(null);
  };

  const handleEdit = (gasto) => {
    setEditingGasto(gasto);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este gasto?')) {
      await db.gastos.delete(id);
      await loadGastos();
      await calculateLimites();
    }
  };

  const getStatus503020 = (categoria, valor) => {
    let limite = 0;
    if (categoria === 'fixos') limite = limites503020.necessidades;
    if (categoria === 'variáveis') limite = limites503020.estiloVida;
    if (categoria === 'extras') limite = limites503020.investimentos;

    const totalCategoria = gastos
      .filter((g) => g.categoria === categoria)
      .reduce((sum, g) => sum + g.valor, 0);

    if (totalCategoria > limite) return 'excesso';
    if (totalCategoria < limite * 0.9) return 'abaixo';
    return 'ok';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 text-green-800';
      case 'excesso':
        return 'bg-red-50 text-red-800';
      case 'abaixo':
        return 'bg-yellow-50 text-yellow-800';
      default:
        return 'bg-gray-50 text-gray-800';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
        <button
          onClick={() => {
            setEditingGasto(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus size={20} className="mr-2" />
          Adicionar Gasto
        </button>
      </div>

      {/* Indicadores 50/30/20 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Necessidades (50%)</h3>
          <p className="text-sm text-gray-600">Limite: {formatCurrency(limites503020.necessidades)}</p>
          <p className="text-sm text-gray-600">
            Gasto: {formatCurrency(
              gastos
                .filter((g) => g.categoria === 'fixos')
                .reduce((sum, g) => sum + g.valor, 0)
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Estilo de Vida (30%)</h3>
          <p className="text-sm text-gray-600">Limite: {formatCurrency(limites503020.estiloVida)}</p>
          <p className="text-sm text-gray-600">
            Gasto: {formatCurrency(
              gastos
                .filter((g) => g.categoria === 'variáveis')
                .reduce((sum, g) => sum + g.valor, 0)
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Extras (20%)</h3>
          <p className="text-sm text-gray-600">Limite: {formatCurrency(limites503020.investimentos)}</p>
          <p className="text-sm text-gray-600">
            Gasto: {formatCurrency(
              gastos
                .filter((g) => g.categoria === 'extras')
                .reduce((sum, g) => sum + g.valor, 0)
            )}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center mb-4">
          <Funnel size={20} className="mr-2 text-gray-600" />
          <h3 className="font-semibold">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={filters.categoria}
              onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas</option>
              <option value="fixos">Fixos</option>
              <option value="variáveis">Variáveis</option>
              <option value="extras">Extras</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select
              value={filters.mes}
              onChange={(e) => {
                setFilters({ ...filters, mes: parseInt(e.target.value) });
                calculateLimites();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                <option key={mes} value={mes}>
                  {format(new Date(2024, mes - 1, 1), 'MMMM', { locale: ptBR })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <input
              type="number"
              value={filters.ano}
              onChange={(e) => {
                setFilters({ ...filters, ano: parseInt(e.target.value) });
                calculateLimites();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input
                type="text"
                value={filters.busca}
                onChange={(e) => setFilters({ ...filters, busca: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                placeholder="Nome do gasto"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mínimo</label>
            <input
              type="number"
              value={filters.valorMin}
              onChange={(e) => setFilters({ ...filters, valorMin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Máximo</label>
            <input
              type="number"
              value={filters.valorMax}
              onChange={(e) => setFilters({ ...filters, valorMax: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Limite 50/30/20</label>
            <select
              value={filters.limite503020}
              onChange={(e) => setFilters({ ...filters, limite503020: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="dentro">Dentro do limite</option>
              <option value="acima">Acima do limite</option>
              <option value="abaixo">Abaixo do limite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={filters.dataFim}
              onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Lista de Gastos */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Lista de Gastos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status 50/30/20
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Observação
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGastos.map((gasto) => {
                const status = getStatus503020(gasto.categoria, gasto.valor);
                return (
                  <tr key={gasto.id} className={getStatusColor(status)}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {gasto.nome}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">
                      {gasto.categoria}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-red-600">
                      {formatCurrency(gasto.valor)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {format(parseISO(gasto.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {status === 'ok' && '✓ OK'}
                      {status === 'excesso' && '⚠ Acima'}
                      {status === 'abaixo' && 'ℹ Abaixo'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {gasto.observacao || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(gasto)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(gasto.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ModalGasto
          gasto={editingGasto}
          onClose={() => {
            setShowModal(false);
            setEditingGasto(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ModalGasto({ gasto, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nome: gasto?.nome || '',
    categoria: gasto?.categoria || 'fixos',
    data: gasto?.data ? format(parseISO(gasto.data), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    valor: gasto?.valor || '',
    observacao: gasto?.observacao || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      valor: parseFloat(formData.valor),
    });
  };

  return (
    <Modal onClose={onClose} title={gasto ? 'Editar Gasto' : 'Adicionar Gasto'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            value={formData.categoria}
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="fixos">Fixos</option>
            <option value="variáveis">Variáveis</option>
            <option value="extras">Extras</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            type="date"
            required
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
          <textarea
            value={formData.observacao}
            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="3"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}


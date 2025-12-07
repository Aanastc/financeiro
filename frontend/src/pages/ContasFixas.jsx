import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import { format, parseISO, setDate, startOfMonth, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar, Check, X, Clock, MagnifyingGlass } from 'phosphor-react';
import Modal from '../components/Modal';

export default function ContasFixas() {
  const { user } = useAuth();
  const [contasFixas, setContasFixas] = useState([]);
  const [filteredContasFixas, setFilteredContasFixas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    diaVencimento: '',
    categoria: '',
    busca: '',
    valorMin: '',
    valorMax: '',
  });

  useEffect(() => {
    if (user) {
      loadContasFixas();
      // Verificar e atualizar status automaticamente
      updateStatuses();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [contasFixas, filters]);

  const loadContasFixas = async () => {
    const data = await db.contasFixas.where('userId').equals(user.id).toArray();
    const contasComStatus = data.map((conta) => {
      const proximaData = parseISO(conta.proximaData);
      const status = getStatusConta(conta, proximaData);
      return { ...conta, status };
    });
    setContasFixas(contasComStatus);
  };

  const updateStatuses = async () => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const contas = await db.contasFixas.where('userId').equals(user.id).toArray();

    for (const conta of contas) {
      const proximaData = parseISO(conta.proximaData);
      const dataMes = proximaData.getMonth();
      const dataAno = proximaData.getFullYear();

      // Se passou do mês, recalcular próxima data
      if (dataAno < anoAtual || (dataAno === anoAtual && dataMes < mesAtual)) {
        const novaData = setDate(new Date(anoAtual, mesAtual, 1), conta.diaVencimento);
        await db.contasFixas.update(conta.id, {
          proximaData: format(novaData, 'yyyy-MM-dd'),
          status: 'a-pagar',
        });
      } else {
        // Atualizar status baseado na data
        const status = getStatusConta(conta, proximaData);
        if (conta.status !== status) {
          await db.contasFixas.update(conta.id, { status });
        }
      }
    }

    await loadContasFixas();
  };

  const getStatusConta = (conta, proximaData) => {
    if (conta.status === 'pago') return 'pago';
    if (isPast(startOfDay(proximaData))) return 'atrasado';
    return 'a-pagar';
  };

  const calculateProximaData = (diaVencimento) => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const diaHoje = hoje.getDate();

    let proximaData;
    if (diaHoje <= diaVencimento) {
      proximaData = setDate(new Date(anoAtual, mesAtual, 1), diaVencimento);
    } else {
      proximaData = setDate(new Date(anoAtual, mesAtual + 1, 1), diaVencimento);
    }

    return format(proximaData, 'yyyy-MM-dd');
  };

  const applyFilters = () => {
    let filtered = [...contasFixas];

    if (filters.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.diaVencimento) {
      filtered = filtered.filter((c) => c.diaVencimento.toString() === filters.diaVencimento);
    }

    if (filters.categoria) {
      filtered = filtered.filter((c) => c.categoria === filters.categoria);
    }

    if (filters.busca) {
      filtered = filtered.filter((c) =>
        c.nome.toLowerCase().includes(filters.busca.toLowerCase())
      );
    }

    if (filters.valorMin) {
      filtered = filtered.filter((c) => c.valorMensal >= parseFloat(filters.valorMin));
    }

    if (filters.valorMax) {
      filtered = filtered.filter((c) => c.valorMensal <= parseFloat(filters.valorMax));
    }

    setFilteredContasFixas(filtered);
  };

  const handleSave = async (formData) => {
    const proximaData = calculateProximaData(formData.diaVencimento);
    if (editingConta) {
      await db.contasFixas.update(editingConta.id, {
        ...formData,
        userId: user.id,
        proximaData,
        status: 'a-pagar',
      });
    } else {
      await db.contasFixas.add({
        ...formData,
        userId: user.id,
        proximaData,
        status: 'a-pagar',
        createdAt: new Date(),
      });
    }
    await loadContasFixas();
    setShowModal(false);
    setEditingConta(null);
  };

  const handleMarcarPago = async (id) => {
    await db.contasFixas.update(id, { status: 'pago' });
    await loadContasFixas();
  };

  const handleResetarMes = async (id) => {
    const conta = await db.contasFixas.get(id);
    const proximaData = calculateProximaData(conta.diaVencimento);
    await db.contasFixas.update(id, {
      status: 'a-pagar',
      proximaData,
    });
    await loadContasFixas();
  };

  const handleEdit = (conta) => {
    setEditingConta(conta);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta fixa?')) {
      await db.contasFixas.delete(id);
      await loadContasFixas();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pago':
        return <Check size={20} className="text-green-500" />;
      case 'atrasado':
        return <X size={20} className="text-red-500" />;
      default:
        return <Clock size={20} className="text-yellow-500" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'atrasado':
        return 'Atrasado';
      default:
        return 'A Pagar';
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
        <h1 className="text-3xl font-bold text-gray-900">Contas Fixas</h1>
        <button
          onClick={() => {
            setEditingConta(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus size={20} className="mr-2" />
          Adicionar Conta Fixa
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="pago">Pago</option>
              <option value="a-pagar">A Pagar</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dia de Vencimento</label>
            <input
              type="number"
              min="1"
              max="31"
              value={filters.diaVencimento}
              onChange={(e) => setFilters({ ...filters, diaVencimento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Ex: 15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={filters.categoria}
              onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas</option>
              {[...new Set(contasFixas.map((c) => c.categoria))].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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
                placeholder="Nome da conta"
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
        </div>
      </div>

      {/* Tabela de Contas Fixas */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Valor Mensal
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Dia Vencimento
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Categoria
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Próxima Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredContasFixas.map((conta) => (
              <tr key={conta.id}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {conta.nome}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-red-600">
                  {formatCurrency(conta.valorMensal)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  Dia {conta.diaVencimento}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {conta.categoria}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex items-center">
                    {getStatusIcon(conta.status)}
                    <span className="ml-2">{getStatusLabel(conta.status)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {format(parseISO(conta.proximaData), 'dd/MM/yyyy', { locale: ptBR })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    {conta.status !== 'pago' && (
                      <button
                        onClick={() => handleMarcarPago(conta.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Marcar Pago
                      </button>
                    )}
                    {conta.status === 'pago' && (
                      <button
                        onClick={() => handleResetarMes(conta.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Resetar Mês
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(conta)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(conta.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ModalContaFixa
          conta={editingConta}
          onClose={() => {
            setShowModal(false);
            setEditingConta(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ModalContaFixa({ conta, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nome: conta?.nome || '',
    valorMensal: conta?.valorMensal || '',
    diaVencimento: conta?.diaVencimento || '',
    categoria: conta?.categoria || '',
    observacoes: conta?.observacoes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      valorMensal: parseFloat(formData.valorMensal),
      diaVencimento: parseInt(formData.diaVencimento),
    });
  };

  return (
    <Modal onClose={onClose} title={conta ? 'Editar Conta Fixa' : 'Adicionar Conta Fixa'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Conta</label>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mensal</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.valorMensal}
            onChange={(e) => setFormData({ ...formData, valorMensal: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dia de Vencimento</label>
          <input
            type="number"
            min="1"
            max="31"
            required
            value={formData.diaVencimento}
            onChange={(e) => setFormData({ ...formData, diaVencimento: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Ex: 15 (todo dia 15)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            value={formData.categoria}
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Selecione</option>
            <option value="assinatura">Assinatura</option>
            <option value="servico">Serviço</option>
            <option value="imposto">Imposto</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
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


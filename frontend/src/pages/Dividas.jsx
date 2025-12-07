import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import { format, parseISO, addMonths, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, CreditCard, Check, X, Clock, MagnifyingGlass } from 'phosphor-react';
import Modal from '../components/Modal';

export default function Dividas() {
  const { user } = useAuth();
  const [dividas, setDividas] = useState([]);
  const [filteredDividas, setFilteredDividas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showParcelaModal, setShowParcelaModal] = useState(false);
  const [editingDivida, setEditingDivida] = useState(null);
  const [selectedDivida, setSelectedDivida] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    busca: '',
    jurosMin: '',
    jurosMax: '',
    valorMin: '',
    valorMax: '',
  });

  useEffect(() => {
    if (user) {
      loadDividas();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [dividas, filters]);

  const loadDividas = async () => {
    const data = await db.dividas.where('userId').equals(user.id).toArray();
    const dividasComParcelas = await Promise.all(
      data.map(async (divida) => {
        const parcelasPagas = await db.parcelasPagas
          .where('dividaId')
          .equals(divida.id)
          .toArray();
        const parcelasRestantes = divida.parcelasTotais - parcelasPagas.length;
        const proximaData = parseISO(divida.proximaDataPagamento);
        const status = getStatusDivida(divida, parcelasRestantes, proximaData);
        return { ...divida, parcelasPagas, parcelasRestantes, status };
      })
    );
    setDividas(dividasComParcelas);
  };

  const getStatusDivida = (divida, parcelasRestantes, proximaData) => {
    if (parcelasRestantes === 0) return 'quitada';
    if (isPast(startOfDay(proximaData))) return 'atrasada';
    const diasParaVencimento = Math.ceil((proximaData - new Date()) / (1000 * 60 * 60 * 24));
    if (diasParaVencimento <= 7) return 'a-vencer';
    return 'em-aberto';
  };

  const applyFilters = () => {
    let filtered = [...dividas];

    if (filters.status) {
      filtered = filtered.filter((d) => d.status === filters.status);
    }

    if (filters.busca) {
      filtered = filtered.filter((d) =>
        d.nome.toLowerCase().includes(filters.busca.toLowerCase())
      );
    }

    if (filters.jurosMin) {
      filtered = filtered.filter((d) => d.juros >= parseFloat(filters.jurosMin));
    }

    if (filters.jurosMax) {
      filtered = filtered.filter((d) => d.juros <= parseFloat(filters.jurosMax));
    }

    if (filters.valorMin) {
      filtered = filtered.filter((d) => d.valorTotal >= parseFloat(filters.valorMin));
    }

    if (filters.valorMax) {
      filtered = filtered.filter((d) => d.valorTotal <= parseFloat(filters.valorMax));
    }

    setFilteredDividas(filtered);
  };

  const handleSave = async (formData) => {
    if (editingDivida) {
      await db.dividas.update(editingDivida.id, {
        ...formData,
        userId: user.id,
      });
    } else {
      await db.dividas.add({
        ...formData,
        userId: user.id,
        parcelasRestantes: formData.parcelasTotais,
        createdAt: new Date(),
      });
    }
    await loadDividas();
    setShowModal(false);
    setEditingDivida(null);
  };

  const handlePagarParcela = async (divida) => {
    setSelectedDivida(divida);
    setShowParcelaModal(true);
  };

  const handleSaveParcela = async (valor, observacao) => {
    if (selectedDivida) {
      await db.parcelasPagas.add({
        dividaId: selectedDivida.id,
        valor: parseFloat(valor),
        dataPagamento: new Date(),
        observacao,
        createdAt: new Date(),
      });

      // Atualizar próxima data de pagamento
      const divida = await db.dividas.get(selectedDivida.id);
      if (divida.parcelasRestantes > 1) {
        const proximaData = addMonths(parseISO(divida.proximaDataPagamento), 1);
        await db.dividas.update(selectedDivida.id, {
          parcelasRestantes: divida.parcelasRestantes - 1,
          proximaDataPagamento: format(proximaData, 'yyyy-MM-dd'),
        });
      } else {
        await db.dividas.update(selectedDivida.id, {
          parcelasRestantes: 0,
        });
      }

      await loadDividas();
      setShowParcelaModal(false);
      setSelectedDivida(null);
    }
  };

  const handleEdit = (divida) => {
    setEditingDivida(divida);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta dívida? Todas as parcelas pagas serão excluídas também.')) {
      await db.parcelasPagas.where('dividaId').equals(id).delete();
      await db.dividas.delete(id);
      await loadDividas();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'quitada':
        return <Check size={20} className="text-green-500" />;
      case 'atrasada':
        return <X size={20} className="text-red-500" />;
      case 'a-vencer':
        return <Clock size={20} className="text-yellow-500" />;
      default:
        return <Clock size={20} className="text-blue-500" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'quitada':
        return 'Quitada';
      case 'atrasada':
        return 'Atrasada';
      case 'a-vencer':
        return 'A Vencer';
      default:
        return 'Em Aberto';
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
        <h1 className="text-3xl font-bold text-gray-900">Dívidas</h1>
        <button
          onClick={() => {
            setEditingDivida(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus size={20} className="mr-2" />
          Adicionar Dívida
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="em-aberto">Em Aberto</option>
              <option value="quitada">Quitadas</option>
              <option value="atrasada">Atrasadas</option>
              <option value="a-vencer">A Vencer</option>
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
                placeholder="Nome da dívida"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Juros (%)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={filters.jurosMin}
                onChange={(e) => setFilters({ ...filters, jurosMin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Min"
              />
              <input
                type="number"
                value={filters.jurosMax}
                onChange={(e) => setFilters({ ...filters, jurosMax: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Max"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={filters.valorMin}
                onChange={(e) => setFilters({ ...filters, valorMin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Min"
              />
              <input
                type="number"
                value={filters.valorMax}
                onChange={(e) => setFilters({ ...filters, valorMax: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Max"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Dívidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDividas.map((divida) => (
          <div
            key={divida.id}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{divida.nome}</h3>
                <div className="flex items-center mt-2">
                  {getStatusIcon(divida.status)}
                  <span className="ml-2 text-sm text-gray-600">
                    {getStatusLabel(divida.status)}
                  </span>
                </div>
              </div>
              <CreditCard size={32} className="text-indigo-500" />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Valor Total:</span>
                <span className="font-bold">{formatCurrency(divida.valorTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Juros:</span>
                <span className="font-bold">{divida.juros}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Parcelas:</span>
                <span className="font-bold">
                  {divida.parcelasTotais - divida.parcelasRestantes} / {divida.parcelasTotais}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Valor por Parcela:</span>
                <span className="font-bold">{formatCurrency(divida.valorParcela)}</span>
              </div>
              {divida.parcelasRestantes > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Próxima Data:</span>
                  <span className="font-bold">
                    {format(parseISO(divida.proximaDataPagamento), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>

            {divida.parcelasPagas && divida.parcelasPagas.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Últimas parcelas pagas:</p>
                <div className="space-y-1">
                  {divida.parcelasPagas.slice(-3).reverse().map((parcela) => (
                    <div key={parcela.id} className="text-xs text-gray-600">
                      {formatCurrency(parcela.valor)} -{' '}
                      {format(parseISO(parcela.dataPagamento), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              {divida.parcelasRestantes > 0 && (
                <button
                  onClick={() => handlePagarParcela(divida)}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Pagar Parcela
                </button>
              )}
              <button
                onClick={() => handleEdit(divida)}
                className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(divida.id)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalDivida
          divida={editingDivida}
          onClose={() => {
            setShowModal(false);
            setEditingDivida(null);
          }}
          onSave={handleSave}
        />
      )}

      {showParcelaModal && selectedDivida && (
        <ModalParcela
          divida={selectedDivida}
          onClose={() => {
            setShowParcelaModal(false);
            setSelectedDivida(null);
          }}
          onSave={handleSaveParcela}
        />
      )}
    </div>
  );
}

function ModalDivida({ divida, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nome: divida?.nome || '',
    valorTotal: divida?.valorTotal || '',
    juros: divida?.juros || '',
    parcelasTotais: divida?.parcelasTotais || '',
    valorParcela: divida?.valorParcela || '',
    proximaDataPagamento: divida?.proximaDataPagamento
      ? format(parseISO(divida.proximaDataPagamento), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      valorTotal: parseFloat(formData.valorTotal),
      juros: parseFloat(formData.juros),
      parcelasTotais: parseInt(formData.parcelasTotais),
      valorParcela: parseFloat(formData.valorParcela),
    });
  };

  return (
    <Modal onClose={onClose} title={divida ? 'Editar Dívida' : 'Adicionar Dívida'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Dívida</label>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.valorTotal}
            onChange={(e) => setFormData({ ...formData, valorTotal: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Juros (%)</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.juros}
            onChange={(e) => setFormData({ ...formData, juros: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas Totais</label>
          <input
            type="number"
            required
            value={formData.parcelasTotais}
            onChange={(e) => setFormData({ ...formData, parcelasTotais: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor por Parcela</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.valorParcela}
            onChange={(e) => setFormData({ ...formData, valorParcela: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Data de Pagamento</label>
          <input
            type="date"
            required
            value={formData.proximaDataPagamento}
            onChange={(e) => setFormData({ ...formData, proximaDataPagamento: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
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

function ModalParcela({ divida, onClose, onSave }) {
  const [valor, setValor] = useState(divida.valorParcela.toString());
  const [observacao, setObservacao] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(valor, observacao);
  };

  return (
    <Modal onClose={onClose} title={`Pagar Parcela - ${divida.nome}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Parcela</label>
          <input
            type="number"
            step="0.01"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
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
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Registrar Pagamento
          </button>
        </div>
      </form>
    </Modal>
  );
}


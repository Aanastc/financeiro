import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Target, ArrowUp, PencilSimple, Trash } from 'phosphor-react';
import Modal from '../components/Modal';
import { formatCurrency, parseCurrency, formatCurrencyInput } from '../utils/currency';

export default function Metas() {
  const { user } = useAuth();
  const [metas, setMetas] = useState([]);
  const [filteredMetas, setFilteredMetas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAporteModal, setShowAporteModal] = useState(false);
  const [editingMeta, setEditingMeta] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    ordem: 'maiorPercentual',
    ano: new Date().getFullYear(),
    categoria: '',
  });

  useEffect(() => {
    if (user) {
      loadMetas();
    }
  }, [user]);

  useEffect(() => {
    if (metas.length > 0 || !loading) {
      applyFilters();
    }
  }, [metas, filters, loading]);

  const loadMetas = async () => {
    try {
      setLoading(true);
      const data = await db.metas.where('userId').equals(user.id).toArray();
      const metasComAportes = await Promise.all(
        data.map(async (meta) => {
          try {
            const aportes = await db.aportes.where('metaId').equals(meta.id).toArray();
            const valorAtual = aportes.reduce((sum, a) => sum + (a.valor || 0), 0);
            return { 
              ...meta, 
              valorAtual: valorAtual || 0, 
              aportes: aportes || [] 
            };
          } catch (error) {
            console.error('Erro ao carregar aportes:', error);
            return { 
              ...meta, 
              valorAtual: meta.valorAtual || 0, 
              aportes: [] 
            };
          }
        })
      );
      setMetas(metasComAportes);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      setMetas([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...metas];

    if (filters.status) {
      filtered = filtered.filter((m) => {
        const valorTotal = m.valorTotal || 0;
        const valorAtual = m.valorAtual || 0;
        if (valorTotal === 0) return false;
        const percentual = (valorAtual / valorTotal) * 100;
        if (filters.status === 'concluida') return percentual >= 100;
        if (filters.status === 'em-andamento') return percentual < 100;
        return true;
      });
    }

    if (filters.ano) {
      filtered = filtered.filter((m) => {
        if (!m.createdAt) return false;
        const year = new Date(m.createdAt).getFullYear();
        return year === filters.ano;
      });
    }

    if (filters.categoria) {
      filtered = filtered.filter((m) => m.categoria === filters.categoria);
    }

    // Ordenação
    filtered.sort((a, b) => {
      const valorTotalA = a.valorTotal || 0;
      const valorTotalB = b.valorTotal || 0;
      const valorAtualA = a.valorAtual || 0;
      const valorAtualB = b.valorAtual || 0;
      
      const percentA = valorTotalA > 0 ? (valorAtualA / valorTotalA) * 100 : 0;
      const percentB = valorTotalB > 0 ? (valorAtualB / valorTotalB) * 100 : 0;

      if (filters.ordem === 'maiorPercentual') return percentB - percentA;
      if (filters.ordem === 'menorPercentual') return percentA - percentB;
      if (filters.ordem === 'maiorValor') return valorTotalB - valorTotalA;
      if (filters.ordem === 'menorValor') return valorTotalA - valorTotalB;
      return 0;
    });

    setFilteredMetas(filtered);
  };

  const handleSave = async (formData) => {
    try {
      const metaData = {
        ...formData,
        userId: user.id,
        valorTotal: parseCurrency(formData.valorTotal),
        valorAtual: editingMeta ? (editingMeta.valorAtual || 0) : 0,
        status: 'em-andamento',
      };

      if (editingMeta) {
        await db.metas.update(editingMeta.id, metaData);
      } else {
        await db.metas.add({
          ...metaData,
          createdAt: new Date(),
        });
      }
      await loadMetas();
      setShowModal(false);
      setEditingMeta(null);
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      alert('Erro ao salvar meta. Tente novamente.');
    }
  };

  const handleSaveAporte = async (valor, observacao) => {
    if (!selectedMeta) return;
    
    try {
      const valorAporte = parseCurrency(valor);
      await db.aportes.add({
        metaId: selectedMeta.id,
        valor: valorAporte,
        observacao: observacao || '',
        data: new Date(),
        createdAt: new Date(),
      });
      
      // Atualizar valor atual da meta
      const metaAtual = await db.metas.get(selectedMeta.id);
      const novoValorAtual = (metaAtual.valorAtual || 0) + valorAporte;
      await db.metas.update(selectedMeta.id, { 
        valorAtual: novoValorAtual,
        status: novoValorAtual >= metaAtual.valorTotal ? 'concluida' : 'em-andamento'
      });
      
      await loadMetas();
      setShowAporteModal(false);
      setSelectedMeta(null);
    } catch (error) {
      console.error('Erro ao salvar aporte:', error);
      alert('Erro ao salvar aporte. Tente novamente.');
    }
  };

  const handleEdit = (meta) => {
    setEditingMeta(meta);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta? Todos os aportes serão excluídos também.')) {
      try {
        await db.aportes.where('metaId').equals(id).delete();
        await db.metas.delete(id);
        await loadMetas();
      } catch (error) {
        console.error('Erro ao excluir meta:', error);
        alert('Erro ao excluir meta. Tente novamente.');
      }
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 flex items-center justify-center min-h-screen">
        <p className="text-marrom">Carregando metas...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-marrom">Metas</h1>
        <button
          onClick={() => {
            setEditingMeta(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-verde-lodo text-white rounded-md hover:bg-opacity-90 transition"
        >
          <Plus size={20} className="mr-2" />
          Adicionar Meta
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-nude rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-marrom mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-rosa rounded-md bg-white"
            >
              <option value="">Todos</option>
              <option value="em-andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-marrom mb-1">Ordem</label>
            <select
              value={filters.ordem}
              onChange={(e) => setFilters({ ...filters, ordem: e.target.value })}
              className="w-full px-3 py-2 border border-rosa rounded-md bg-white"
            >
              <option value="maiorPercentual">Maior % Concluído</option>
              <option value="menorPercentual">Menor % Concluído</option>
              <option value="maiorValor">Maior Valor</option>
              <option value="menorValor">Menor Valor</option>
            </select>
          </div>
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
            <label className="block text-sm font-medium text-marrom mb-1">Categoria</label>
            <input
              type="text"
              value={filters.categoria}
              onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
              className="w-full px-3 py-2 border border-rosa rounded-md bg-white"
              placeholder="Filtrar por categoria"
            />
          </div>
        </div>
      </div>

      {/* Cards de Metas */}
      {filteredMetas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Target size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">Nenhuma meta encontrada</p>
          <p className="text-gray-500 text-sm mt-2">Clique em "Adicionar Meta" para criar sua primeira meta</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMetas.map((meta) => {
            const valorTotal = meta.valorTotal || 0;
            const valorAtual = meta.valorAtual || 0;
            const percentual = valorTotal > 0 ? (valorAtual / valorTotal) * 100 : 0;
            const falta = Math.max(0, valorTotal - valorAtual);
            const isConcluida = percentual >= 100;

            // Calcular rendimento se for investimento
            const rendimento = meta.taxaCDI && meta.valorAtual 
              ? (meta.valorAtual * meta.taxaCDI / 100) 
              : 0;

            return (
              <div
                key={meta.id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  isConcluida ? 'border-verde-lodo' : 'border-rosa'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-marrom">{meta.nome}</h3>
                    {meta.ondeGuardado && (
                      <p className="text-sm text-gray-500 mt-1">📍 {meta.ondeGuardado}</p>
                    )}
                    {meta.tipoInvestimento && (
                      <p className="text-sm text-gray-500">💼 {meta.tipoInvestimento}</p>
                    )}
                  </div>
                  <Target
                    size={32}
                    className={isConcluida ? 'text-verde-lodo' : 'text-rosa'}
                  />
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progresso</span>
                    <span className="font-bold text-marrom">{percentual.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        isConcluida ? 'bg-verde-lodo' : 'bg-rosa'
                      }`}
                      style={{ width: `${Math.min(100, percentual)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Valor Total:</span>
                    <span className="font-bold text-marrom">{formatCurrency(valorTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Valor Atual:</span>
                    <span className="font-bold text-verde-lodo">
                      {formatCurrency(valorAtual)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Falta:</span>
                    <span className="font-bold text-laranja-forte">{formatCurrency(falta)}</span>
                  </div>
                  {rendimento > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Rendimento (anual):</span>
                      <span className="font-bold text-verde-lodo">
                        {formatCurrency(rendimento)}
                      </span>
                    </div>
                  )}
                </div>

                {meta.aportes && meta.aportes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Últimos aportes:</p>
                    <div className="space-y-1">
                      {meta.aportes.slice(-3).reverse().map((aporte) => (
                        <div key={aporte.id} className="text-xs text-gray-600">
                          {formatCurrency(aporte.valor)} -{' '}
                          {aporte.data ? format(parseISO(aporte.data), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedMeta(meta);
                      setShowAporteModal(true);
                    }}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-verde-lodo text-white rounded-md hover:bg-opacity-90 text-sm transition"
                  >
                    <ArrowUp size={16} className="mr-1" />
                    Aporte
                  </button>
                  <button
                    onClick={() => handleEdit(meta)}
                    className="px-3 py-2 bg-rosa text-white rounded-md hover:bg-opacity-90 transition"
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(meta.id)}
                    className="px-3 py-2 bg-laranja-forte text-white rounded-md hover:bg-opacity-90 transition"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalMeta
          meta={editingMeta}
          onClose={() => {
            setShowModal(false);
            setEditingMeta(null);
          }}
          onSave={handleSave}
        />
      )}

      {showAporteModal && selectedMeta && (
        <ModalAporte
          meta={selectedMeta}
          onClose={() => {
            setShowAporteModal(false);
            setSelectedMeta(null);
          }}
          onSave={handleSaveAporte}
        />
      )}
    </div>
  );
}

function ModalMeta({ meta, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nome: meta?.nome || '',
    valorTotal: meta?.valorTotal ? formatCurrency(meta.valorTotal) : '',
    ondeGuardado: meta?.ondeGuardado || '',
    taxaCDI: meta?.taxaCDI || '',
    tipoInvestimento: meta?.tipoInvestimento || '',
  });

  const handleValorChange = (e) => {
    const formatted = formatCurrencyInput(e.target.value);
    setFormData({ ...formData, valorTotal: formatted });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      valorTotal: formData.valorTotal,
      taxaCDI: formData.taxaCDI ? parseFloat(formData.taxaCDI) : null,
    });
  };

  return (
    <Modal onClose={onClose} title={meta ? 'Editar Meta' : 'Adicionar Meta'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Nome da Meta</label>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            placeholder="Ex: Viagem para Europa"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Valor Total</label>
          <input
            type="text"
            required
            value={formData.valorTotal}
            onChange={handleValorChange}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            placeholder="0,00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Digite o valor e ele será formatado automaticamente
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Onde guardei</label>
          <input
            type="text"
            value={formData.ondeGuardado}
            onChange={(e) => setFormData({ ...formData, ondeGuardado: e.target.value })}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            placeholder="Ex: Cofre, Poupança, Corretora"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Taxa CDI (%) - Se for investimento</label>
          <input
            type="number"
            step="0.01"
            value={formData.taxaCDI}
            onChange={(e) => setFormData({ ...formData, taxaCDI: e.target.value })}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            placeholder="Ex: 12.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Tipo de Investimento</label>
          <input
            type="text"
            value={formData.tipoInvestimento}
            onChange={(e) => setFormData({ ...formData, tipoInvestimento: e.target.value })}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            placeholder="Ex: CDB, Tesouro Direto, Ações"
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

function ModalAporte({ meta, onClose, onSave }) {
  const [valor, setValor] = useState('');
  const [observacao, setObservacao] = useState('');

  const handleValorChange = (e) => {
    const formatted = formatCurrencyInput(e.target.value);
    setValor(formatted);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valor || parseCurrency(valor) <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }
    onSave(valor, observacao);
  };

  return (
    <Modal onClose={onClose} title={`Adicionar Aporte - ${meta.nome}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Valor do Aporte</label>
          <input
            type="text"
            required
            value={valor}
            onChange={handleValorChange}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            placeholder="0,00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Digite o valor e ele será formatado automaticamente
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-marrom mb-1">Observação (opcional)</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full px-3 py-2 border border-rosa rounded-md"
            rows="3"
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
            Adicionar Aporte
          </button>
        </div>
      </form>
    </Modal>
  );
}

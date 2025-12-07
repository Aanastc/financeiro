import Dexie from 'dexie';

export const db = new Dexie('FinanceiroDB');

db.version(2).stores({
  users: '++id, email, password, name, createdAt',
  entradas: '++id, userId, nome, valor, data, categoria, createdAt',
  sugestoesEntradas: '++id, userId, nome, vezesUsado, ultimoUso',
  gastos: '++id, userId, nome, categoria, data, valor, observacao, tipo, formaPagamento, cartaoId, parcelas, parcelaAtual, valorParcela, gastoPaiId, createdAt',
  cartoes: '++id, userId, nome, limite, createdAt',
  metas: '++id, userId, nome, valorTotal, valorAtual, ondeGuardado, taxaCDI, tipoInvestimento, status, createdAt',
  aportes: '++id, metaId, valor, data, observacao, createdAt',
  dividas: '++id, userId, nome, valorTotal, juros, parcelasTotais, parcelasRestantes, parcelasPagas, valorParcela, proximaDataPagamento, valorPago, valorRestante, createdAt',
  parcelasPagas: '++id, dividaId, valor, dataPagamento, observacao, createdAt',
  contasFixas: '++id, userId, nome, valorMensal, diaVencimento, categoria, observacoes, status, proximaData, createdAt',
  pagamentosContasFixas: '++id, contaFixaId, valor, dataPagamento, observacao, createdAt'
});

export default db;


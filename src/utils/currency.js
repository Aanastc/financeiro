// Formatação automática de moeda
export const formatCurrency = (value) => {
  if (typeof value === 'string') {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') return '';
    // Converte para número e divide por 100
    const number = parseInt(numbers) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(number);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

// Converte string formatada para número
export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  const numbers = value.replace(/\D/g, '');
  if (numbers === '') return 0;
  return parseInt(numbers) / 100;
};

// Formata input enquanto digita
export const formatCurrencyInput = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers === '') return '';
  const number = parseInt(numbers) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};


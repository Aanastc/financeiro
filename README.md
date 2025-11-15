# Sistema de Controle Financeiro

Sistema completo de controle financeiro pessoal desenvolvido com React, Vite, Tailwind CSS e banco de dados local (IndexedDB via Dexie.js).

## 🚀 Tecnologias

- **React JS** com Vite
- **Tailwind CSS** para estilização
- **React Router DOM** com Outlet para navegação
- **date-fns** para manipulação de datas
- **Phosphor Icons** para ícones
- **Dexie.js** para banco de dados local (IndexedDB)

## ✨ Funcionalidades

### 1. Autenticação
- ✅ Login com email e senha
- ✅ Cadastro de usuário
- ✅ Logout
- ✅ Proteção de rotas

### 2. Dashboard
- ✅ Indicadores principais (entradas, saídas, saldo)
- ✅ Relatório 50/30/20 com sinalização de cores
- ✅ Listas de últimas entradas e saídas
- ✅ Média de gastos por categoria
- ✅ Filtros por mês/ano

### 3. Entradas
- ✅ Tabela mensal com todos os meses do ano
- ✅ Total mensal e média anual
- ✅ Modal para adicionar/editar entradas
- ✅ Filtros avançados (mês, ano, categoria, valor, data, busca)

### 4. Gastos
- ✅ Três categorias: Fixos, Variáveis e Extras
- ✅ Integração com regra 50/30/20
- ✅ Sinalização visual de excesso/abaixo do limite
- ✅ Filtros por categoria, mês, ano, valor, data, limite 50/30/20

### 5. Metas
- ✅ Cards com progresso visual
- ✅ Percentual de conclusão
- ✅ Histórico de aportes
- ✅ Filtros por status, ordem, ano, categoria

### 6. Dívidas
- ✅ Listagem com informações completas
- ✅ Registro de parcelas pagas
- ✅ Status automático (quitada, atrasada, a vencer, em aberto)
- ✅ Filtros por status, juros, valor, busca

### 7. Contas Fixas
- ✅ Tabela com contas de vencimento fixo mensal
- ✅ Cálculo automático da próxima data
- ✅ Status automático (pago, a pagar, atrasado)
- ✅ Reset automático ao mudar de mês
- ✅ Integração com gastos fixos e 50/30/20
- ✅ Filtros por status, dia, categoria, valor, busca

### 8. Dicas de IA
- ✅ Análise inteligente do controle financeiro
- ✅ Sugestões personalizadas
- ✅ Alertas de gastos excessivos
- ✅ Recomendações sobre 50/30/20
- ✅ Dicas para melhorar metas
- ✅ Auxílio na organização de dívidas e contas fixas

## 📦 Instalação

1. Clone o repositório ou extraia os arquivos
2. Instale as dependências:

```bash
npm install
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

4. Acesse `http://localhost:5173` no navegador

## 🏗️ Build para Produção

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist`.

## 📝 Uso

1. **Cadastro**: Crie uma conta com nome, email e senha
2. **Login**: Faça login com suas credenciais
3. **Dashboard**: Visualize o resumo financeiro do mês
4. **Entradas**: Registre suas fontes de renda
5. **Gastos**: Registre seus gastos nas categorias apropriadas
6. **Metas**: Defina e acompanhe suas metas financeiras
7. **Dívidas**: Gerencie suas dívidas e parcelas
8. **Contas Fixas**: Cadastre contas com vencimento mensal fixo
9. **Dicas IA**: Obtenha análises e recomendações personalizadas

## 🔒 Segurança

- Todos os dados são armazenados localmente no navegador (IndexedDB)
- Nenhum dado é enviado para servidores externos
- As senhas são armazenadas em texto simples (para uso local apenas - não recomendado para produção)

## 📊 Regra 50/30/20

O sistema utiliza a regra 50/30/20 para organização financeira:
- **50%** para Necessidades (gastos fixos)
- **30%** para Estilo de Vida (gastos variáveis)
- **20%** para Investimentos/Metas (extras)

O sistema calcula automaticamente e sinaliza quando você está acima ou abaixo dos limites recomendados.

## 🎨 Interface

A interface foi desenvolvida com Tailwind CSS, proporcionando:
- Design moderno e responsivo
- Cores intuitivas (verde para entradas, vermelho para saídas)
- Sinalização visual para status e alertas
- Navegação fluida entre páginas

## 📱 Responsividade

O sistema é totalmente responsivo e funciona bem em:
- Desktop
- Tablet
- Mobile

## 🔄 Atualizações Automáticas

- Contas fixas são atualizadas automaticamente ao mudar de mês
- Status de dívidas é calculado automaticamente
- Próximas datas são recalculadas conforme necessário

## 💡 Dicas de Uso

1. Registre todas as suas entradas e gastos para análises precisas
2. Use as contas fixas para automatizar o controle de despesas recorrentes
3. Acompanhe regularmente as dicas de IA para melhorar seu controle financeiro
4. Defina metas realistas e faça aportes regulares
5. Mantenha suas dívidas organizadas e priorize o pagamento das de maior juros

## 🐛 Problemas Conhecidos

- As senhas são armazenadas em texto simples (apenas para uso local)
- A IA utiliza análise local simulada (não é uma IA real)

## 📄 Licença

Este projeto é de código aberto e está disponível para uso pessoal.

---

Desenvolvido com ❤️ usando React e tecnologias modernas.


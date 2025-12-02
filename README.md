# 🌟 Sistema de Controle Financeiro Pessoal (Portfólio)

Sistema completo de controle financeiro pessoal, desenvolvido como um projeto robusto de portfólio. A aplicação utiliza **React, Vite, Tailwind CSS e IndexedDB** para oferecer uma experiência de gestão financeira completa e responsiva, focada na regra 50/30/20.

> 🔗 **Acesse o Projeto Online:** [](https://vercel.com/ana-leticias-projects-198dfb27/financeiro/7mfVTE3GsnhJfAjLKJD6uuFYdaTR)
>
> 💡 **Status do Projeto:** Em Desenvolvimento (WIP) – Funcionalidades robustas concluídas, com algumas em produção para demonstrar a arquitetura completa.

## 🎯 Visão Geral do Projeto

Este projeto foi desenvolvido para demonstrar proficiência em tecnologias modernas de frontend (React/Vite) e gerenciamento de estado e dados complexos (IndexedDB via Dexie.js). O foco é oferecer uma ferramenta completa para a gestão financeira pessoal, integrando a regra 50/30/20 e sinalização visual para auxiliar o usuário na tomada de decisões.



## 🚀 Tecnologias Utilizadas

### Frontend & Core
* **React JS** com Vite
* **Tailwind CSS** para estilização e design responsivo
* **React Router DOM** para navegação (utilizando `Outlet`)
* **date-fns** para manipulação eficiente de datas
* **Phosphor Icons** para ícones
* **Dexie.js** para persistência de dados local (IndexedDB)

## ✨ Principais Funcionalidades

As funcionalidades marcadas com 🚧 estão em produção, mas a arquitetura já está implementada.

### Módulos Principais
* ✅ **Autenticação:** Login, Cadastro, Logout e Proteção de Rotas.
* ✅ **Dashboard:** Indicadores principais (Entradas, Saídas, Saldo), Relatório 50/30/20.
* ✅ **Entradas:** Tabela mensal, modal de CRUD, filtros avançados.
* ✅ **Gastos:** Categorização em Fixos, Variáveis e Extras, sinalização 50/30/20.

### Recursos em Produção
* 🚧 **Metas:** Cards com progresso visual e histórico de aportes.
* 🚧 **Dívidas:** Listagem, registro de parcelas pagas e status automático (quitada, atrasada, a vencer).
* 🚧 **Contas Fixas:** Tabela com cálculo da próxima data, status automático e reset mensal.

### Funcionalidade de Demonstração
* 🚧 **Dicas de IA:** Análise inteligente simulada do controle financeiro, sugestões personalizadas e alertas de gastos excessivos (Implementado com análise local, não é uma IA real/externa).

## 📊 Regra 50/30/20

O sistema utiliza e monitora ativamente a regra 50/30/20:
* **50%** para Necessidades (gastos fixos)
* **30%** para Estilo de Vida (gastos variáveis)
* **20%** para Investimentos/Metas (extras)

O sistema oferece cálculo automático e sinalização visual clara quando os limites são atingidos ou excedidos.

## 📦 Como Rodar o Projeto Localmente

1.  **Clone o repositório:**
    ```bash
    git clone [Link do seu repositório]
    ```

2.  **Acesse o diretório do projeto:**
    ```bash
    cd [Nome do seu projeto]
    ```

3.  **Instale as dependências:**
    ```bash
    npm install
    ```

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

O aplicativo estará acessível em `http://localhost:5173`.

## 🔒 Segurança (Contexto de Portfólio)

* Todos os dados são armazenados **localmente** no navegador (IndexedDB) para fins de demonstração.
* **Atenção**: As senhas são armazenadas em texto simples. **Isso é intencional para fins de portfólio/uso local e não é uma prática recomendada em ambiente de produção real.**

## 🐛 Problemas Conhecidos (Contexto de Demonstração)

* A funcionalidade "Dicas de IA" utiliza uma **análise local simulada** para oferecer recomendações, não se conectando a um modelo de Machine Learning externo.

## 🤝 Contribuições

Este projeto foi desenvolvido por [Seu Nome/GitHub] e representa uma demonstração das minhas habilidades técnicas em desenvolvimento frontend e arquitetura de aplicações.

## 📄 Licença

Este projeto é de código aberto e está disponível para uso e estudo pessoal.

---

**Desenvolvido com ❤️ usando React e tecnologias modernas.**
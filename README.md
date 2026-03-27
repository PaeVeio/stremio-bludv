# BluDV Stremio Addon

Um addon não-oficial para o Stremio que traz o catálogo de filmes e séries do site [BluDV](https://bludv1.xyz), focado em conteúdo dublado (Dual Áudio) e legendado em Português do Brasil.

O addon suporta integração com serviços Debrid para transformar os links torrent em links diretos de alta velocidade.

## ✨ Funcionalidades

- **Catálogo Completo:** Busca os lançamentos de filmes e séries diretamente do BluDV.
- **Integração Debrid:** Suporte nativo a Real-Debrid, AllDebrid e TorBox.
- **Página de Configuração:** Interface web amigável para configurar o addon e gerar o link de instalação.
- **Qualidade Automática:** Detecta e exibe a qualidade do arquivo (4K, 1080p, 720p).
- **Cache Inteligente:** Utiliza cache em memória para otimizar as requisições ao site do BluDV e às APIs Debrid.

## 🚀 Como usar (Usuário Final)

Se o addon já estiver hospedado em um servidor:

1. Acesse a URL do addon no seu navegador (ex: `http://localhost:7000/`).
2. (Opcional) Selecione seu serviço Debrid e insira a chave de API.
3. Clique em **"Validar Chave"** para garantir que está correta.
4. Clique em **"Gerar Link de Instalação"**.
5. Clique em **"Instalar no Stremio"** ou copie a URL gerada e cole na barra de busca do Stremio.

## 🛠️ Como instalar (Hospedagem)

Você pode hospedar este addon localmente no seu computador ou em um servidor (VPS, Render, Railway, etc).

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 14 ou superior)
- NPM ou Yarn ou PNPM

### Instalação Local (Node.js)

1. Clone ou baixe este repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. O servidor iniciará na porta 7000. Acesse `http://localhost:7000` no seu navegador.

### Instalação com Docker

O projeto inclui um `Dockerfile` e um `docker-compose.yml` para facilitar o deploy.

1. Construa e inicie o container:
   ```bash
   docker-compose up -d
   ```
2. O addon estará disponível na porta 7000.

## 🔧 Estrutura do Projeto

- `src/index.js`: Ponto de entrada do servidor, define as rotas do Stremio e a página web de configuração.
- `src/bludv.js`: Módulo responsável por fazer o scraping do site BluDV e extrair os links e metadados.
- `src/debrid.js`: Módulo que lida com a comunicação com as APIs do Real-Debrid, AllDebrid e TorBox.

## 📝 Aviso Legal

Este é um projeto de código aberto criado apenas para fins educacionais. O desenvolvedor não tem afiliação com o site BluDV ou com os serviços Debrid mencionados, nem se responsabiliza pelo conteúdo acessado através do addon.

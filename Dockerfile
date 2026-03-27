FROM node:20-slim

# Metadados
LABEL maintainer="BluDV Stremio Addon"
LABEL description="Stremio addon para BluDV - Versão Torrent Direto"
LABEL version="1.0.2"

# Definir modo não interativo para evitar erros de debconf
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependências básicas para o Node.js
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml* ./

# Instalar pnpm e dependências de produção
RUN npm install -g pnpm && pnpm install --prod

# Copiar código fonte
COPY src/ ./src/

# Porta do servidor (Render/Railway costumam usar a variável PORT)
EXPOSE 7000

# Variáveis de ambiente padrão
ENV PORT=7000
ENV NODE_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:${PORT}/manifest.json | grep -q '"name"' || exit 1

# Iniciar o servidor
CMD ["node", "src/index.js"]


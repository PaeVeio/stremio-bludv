# Guia de Hospedagem Online: BluDV Stremio Addon

Este guia ensina como colocar o seu addon BluDV online de forma gratuita ou de baixo custo usando o **Render** ou **Railway**.

---

## 🛠️ Opção 1: Render (Grátis - Recomendado)

O Render é excelente para iniciantes e oferece um plano gratuito para serviços web.

### 1. Criar uma conta no GitHub
- Se ainda não tiver, crie uma conta em [github.com](https://github.com).
- Crie um novo repositório chamado `stremio-bludv`.
- Suba os arquivos da pasta do addon para este repositório.

### 2. Configurar no Render
1. Acesse o [dashboard.render.com](https://dashboard.render.com) e faça login com seu GitHub.
2. Clique em **"New"** > **"Web Service"**.
3. Selecione o repositório `stremio-bludv` que você criou.
4. Preencha as configurações:
   - **Name:** `stremio-bludv` (ou o que preferir)
   - **Region:** Escolha a mais próxima de você (ex: Ohio ou Frankfurt)
   - **Runtime:** `Docker` (muito importante!)
5. Clique em **"Create Web Service"**.

### 3. Instalar no Stremio
- Assim que o Render terminar o deploy (o status ficará "Live"), você receberá uma URL como `https://stremio-bludv.onrender.com`.
- No Stremio, adicione `/manifest.json` ao final da URL.
- Exemplo: `https://stremio-bludv.onrender.com/manifest.json`

---

## 🚂 Opção 2: Railway (Pago/Créditos - Mais Rápido)

O Railway é extremamente rápido e o deploy é quase instantâneo.

1. Acesse [railway.app](https://railway.app) e conecte seu GitHub.
2. Clique em **"New Project"** > **"Deploy from GitHub repo"**.
3. Selecione seu repositório.
4. O Railway detectará o `Dockerfile` automaticamente e iniciará o deploy.
5. Em **"Settings"**, clique em **"Generate Domain"** para obter sua URL pública.

---

## ⚠️ Observações Importantes

1. **Plano Gratuito do Render:** No plano gratuito, o servidor "dorme" após 15 minutos sem uso. Isso significa que a primeira vez que você abrir o Stremio no dia, o addon pode demorar uns 30 segundos para carregar o catálogo enquanto o servidor "acorda".
2. **Docker:** Certifique-se de que o arquivo `Dockerfile` esteja na raiz do seu repositório do GitHub. Ele é essencial para que o servidor saiba como rodar o addon.
3. **Logs:** Se algo não funcionar, verifique a aba **"Logs"** no painel do Render/Railway para ver se há erros no código.

---

## 📦 Estrutura Necessária no GitHub
Seu repositório deve ficar assim:
```text
/src
  bludv.js
  index.js
Dockerfile
package.json
pnpm-lock.yaml (ou package-lock.json)
README.md
```

Agora você está pronto para ter seu addon BluDV funcionando 24h por dia em qualquer lugar! 🚀🍿

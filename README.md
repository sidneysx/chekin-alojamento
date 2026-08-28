# Sistema de Check-in de Alojamento

Site estático (HTML/CSS/JS puro) hospedado no GitHub Pages, com as planilhas do Google Sheets como banco de dados via Google Apps Script.

## Estrutura do projeto

```
/checkin-alojamento
├── index.html
├── css/style.css
├── js/config.js
├── js/api.js
├── js/app.js
├── apps-script/Code.gs      ← cole este código no Apps Script (não faz parte do site)
└── assets/                  ← coloque aqui seu logo.png, se tiver
```

## Passo a passo

### 1) Preparar as duas planilhas

**Planilha 1 — Base de colaboradores**
Colunas na primeira linha (cabeçalho), exatamente: `nome`, `matricula`, `setor`, `cpf`.

**Planilha 2 — Controle de check-in**
Colunas na primeira linha: `nome`, `matricula`, `setor`, `cpf`, `data_alojamento`. Pode começar vazia — o script preenche as linhas automaticamente.

> Os IDs das duas planilhas que você me enviou já estão preenchidos em `apps-script/Code.gs` (`ID_PLANILHA_COLABORADORES` e `ID_PLANILHA_CHECKIN`). Se o nome da aba não for `Página1`, ajuste as variáveis `ABA_COLABORADORES` e `ABA_CHECKIN` no topo do arquivo.

### 2) Criar o projeto no Google Apps Script

1. Abra a **Planilha 1** (ou qualquer uma das duas).
2. Vá em **Extensões → Apps Script**.
3. Apague o conteúdo padrão de `Code.gs` e cole o conteúdo do arquivo `apps-script/Code.gs` deste projeto.
4. Salve (ícone de disquete ou `Ctrl+S`).

### 3) Publicar como Web App

1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. Em "Selecionar tipo", escolha **App da Web**.
3. Configure:
   - **Executar como:** Eu (sua conta)
   - **Quem pode acessar:** **Qualquer pessoa** (importante — sem isso o GitHub Pages não consegue chamar a API)
4. Clique em **Implantar**.
5. Na primeira vez, o Google vai pedir para autorizar o script a acessar suas planilhas — aceite as permissões.

### 4) Copiar a URL da API

Após implantar, o Google mostra uma **URL do app da Web**, algo como:

```
https://script.google.com/macros/s/AKfycb.../exec
```

Copie essa URL completa (termina em `/exec`).

### 5) Colocar a URL no `config.js`

Abra `js/config.js` e substitua:

```js
const API_URL = "URL_DO_GOOGLE_APPS_SCRIPT";
```

pela URL copiada:

```js
const API_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

### 6) Testar localmente

Como o navegador bloqueia `fetch` em arquivos abertos direto como `file://`, sirva a pasta com um servidor local simples. Exemplos:

- **VS Code:** extensão "Live Server" → botão direito em `index.html` → "Open with Live Server".
- **Python:** dentro da pasta do projeto, rode `python3 -m http.server 8000` e acesse `http://localhost:8000`.

Teste os três fluxos: colaborador encontrado, colaborador não encontrado, check-in duplicado no mesmo dia.

### 7) Criar o repositório no GitHub

1. Crie um repositório novo (ex.: `checkin-alojamento`).
2. Envie todos os arquivos deste projeto para a raiz do repositório (mantendo a estrutura de pastas `css/`, `js/`, `assets/`). O arquivo `apps-script/Code.gs` pode subir também só como referência — ele não roda no GitHub, é usado apenas dentro do Google Apps Script.

```bash
git init
git add .
git commit -m "Sistema de check-in de alojamento"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/checkin-alojamento.git
git push -u origin main
```

### 8) Publicar com GitHub Pages

1. No repositório, vá em **Settings → Pages**.
2. Em "Source", selecione a branch `main` e a pasta `/root`.
3. Salve. Em alguns minutos o site fica disponível em:

```
https://SEU-USUARIO.github.io/checkin-alojamento/
```

### 9) Colocar a logo (opcional)

Coloque o arquivo em `assets/logo.png` e, no `index.html`, troque o `<div class="logo-mark">` por:

```html
<img class="logo-mark" src="assets/logo.png" alt="Logo da empresa">
```

### 10) Manutenção

- Trocar a URL da API no futuro: edite só `js/config.js`.
- Adicionar/remover colaboradores: edite direto a Planilha 1.
- Ver o histórico de check-ins: consulte a Planilha 2 — cada check-in vira uma linha nova, então dá pra montar relatórios (por dia, por setor etc.) direto na planilha ou com Tabela Dinâmica.

## Notas de segurança

- Nenhuma credencial fica no código do GitHub — o Apps Script atua como intermediário e só ele acessa as planilhas diretamente.
- A validação contra check-in duplicado é feita tanto no navegador (`app.js`) quanto no servidor (`Code.gs`), então mesmo chamando a API diretamente não dá pra burlar a regra.
- Como a implantação usa "Qualquer pessoa" para permitir o acesso do GitHub Pages, evite armazenar dados sensíveis além do necessário nas planilhas (o modelo atual já usa apenas nome, matrícula, setor e CPF, conforme solicitado).
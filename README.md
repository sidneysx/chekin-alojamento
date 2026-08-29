# Sistema de Alojamento

Site estático (HTML/CSS/JS puro), com planilhas do Google Sheets como banco de dados via Google Apps Script. Código versionado no GitHub, hospedado em servidor local exposto ao IP público via nginx.

Modelo: o colaborador escolhe um alojamento e fica alocado até fazer **check-out manual** — a vaga só volta a ficar disponível nesse momento (não é um check-in diário).

## Estrutura do projeto

```
/checkin-alojamento
├── index.html
├── css/style.css
├── js/config.js
├── js/api.js
├── js/app.js
├── apps-script/Code.gs      ← cole este código no Apps Script (não faz parte do site)
└── assets/logo-dpl.png
```

## Passo a passo

### 1) Preparar as três planilhas

**Planilha 1 — Base de colaboradores**
Colunas na primeira linha (cabeçalho), exatamente: `nome`, `matricula`, `setor`, `cpf`.

**Planilha 2 — Alojamentos**
Colunas: `nome`, `endereco`, `camas_totais`. Uma linha por alojamento, ex.: `Alojamento X | Rua Tal, 123 | 8`.

**Planilha 3 — Controle de alocação**
Colunas: `nome`, `matricula`, `setor`, `cpf`, `alojamento`, `data_checkin`, `data_checkout`, `status`. Pode começar vazia — o script preenche automaticamente. `status` fica `ocupando` enquanto a pessoa está alojada, e vira `saiu` no check-out.

> Os IDs das planilhas 1 e 3 já estão preenchidos em `apps-script/Code.gs` (`ID_PLANILHA_COLABORADORES` e `ID_PLANILHA_ALOCACAO`). Crie a planilha 2 e cole o ID dela em `ID_PLANILHA_ALOJAMENTOS`. Se algum nome de aba não for `Página1`, ajuste as variáveis `ABA_*` no topo do arquivo.

### 2) Criar o projeto no Google Apps Script

1. Abra qualquer uma das três planilhas.
2. Vá em **Extensões → Apps Script**.
3. Apague o conteúdo padrão de `Code.gs` e cole o conteúdo do arquivo `apps-script/Code.gs` deste projeto.
4. Salve (ícone de disquete ou `Ctrl+S`).

### 3) Publicar como Web App

1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. Em "Selecionar tipo", escolha **App da Web**.
3. Configure:
   - **Executar como:** Eu (sua conta)
   - **Quem pode acessar:** **Qualquer pessoa** (importante — sem isso o site não consegue chamar a API)
4. Clique em **Implantar** e aceite as permissões pedidas na primeira vez.

> Ao editar o `Code.gs` depois, publique uma **nova versão** da implantação existente (Implantar → Gerenciar implantações → editar → Nova versão) para a URL atual refletir as mudanças, sem precisar mexer no `config.js`.

### 4) Copiar a URL da API

Após implantar, o Google mostra uma **URL do app da Web**, terminando em `/exec`. Copie essa URL completa.

### 5) Colocar a URL no `config.js`

> Esse passo já está feito no projeto atual — só repita se publicar uma implantação totalmente nova (não uma nova versão da mesma).

```js
const API_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

### 6) Testar localmente

Como o navegador bloqueia `fetch` em arquivos abertos como `file://`, sirva a pasta com um servidor local:

- **VS Code:** extensão "Live Server" → botão direito em `index.html` → "Open with Live Server".
- **Python:** `python3 -m http.server 8000` dentro da pasta, acesse `http://localhost:8000`.

Teste os fluxos: colaborador não encontrado, colaborador sem alocação (aparece lista de alojamentos), check-in com sucesso, alojamento lotado, colaborador já alocado (aparece botão de check-out), check-out com sucesso.

### 7) Subir o projeto para o GitHub

```bash
git init
git add .
git commit -m "Sistema de alojamento"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

> Use a URL **HTTPS** do repositório, não a SSH (`git@github.com:...`), a menos que já tenha uma chave SSH cadastrada. Com HTTPS, o `git push` abre login do GitHub pelo navegador na primeira vez. Se pedir usuário/senha direto no terminal, use um **Personal Access Token** no lugar da senha.

Atualizações futuras:

```bash
git add .
git commit -m "descrição do que mudou"
git push
```

### 8) Colocar o site no ar (servidor local + nginx)

No servidor, depois de cada `git push`:

```bash
cd /var/www/checkin-alojamento
git pull
```

Configuração em `/etc/nginx/sites-available/checkin-alojamento`:

```nginx
server {
    listen 80;
    server_name checkin.seudominio.com;

    root /var/www/checkin-alojamento;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(css|js)$ {
        expires 1d;
        add_header Cache-Control "public";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/checkin-alojamento /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Libere as portas 80/443 no roteador/firewall. Para HTTPS (com domínio apontando pro IP público):

```bash
sudo certbot --nginx -d checkin.seudominio.com
```

### 9) Colocar a logo

Arquivo em `assets/logo-dpl.png`. Já referenciado no `index.html`:

```html
<div class="logo-mark"><img src="assets/logo-dpl.png" alt="Logo"></div>
```

### 10) Manutenção

- Trocar a URL da API no futuro: edite só `js/config.js`.
- Adicionar/remover colaboradores: edite direto a Planilha 1.
- Adicionar/remover alojamentos ou mudar quantidade de camas: edite direto a Planilha 2.
- Ver quem está alojado agora: filtre a Planilha 3 por `status = ocupando`. As vagas de cada alojamento são calculadas automaticamente (camas_totais − quantos "ocupando" apontam pra ele), não precisa ajustar manualmente.
- Ver histórico completo (quem entrou, quem saiu, quando): Planilha 3 inteira, dá pra montar Tabela Dinâmica por alojamento, setor, período etc.

## Notas de segurança

- Nenhuma credencial fica no código do GitHub — o Apps Script atua como intermediário e só ele acessa as planilhas diretamente.
- A validação de vaga disponível e de alocação duplicada é feita tanto no navegador (`app.js`) quanto no servidor (`Code.gs`), então mesmo chamando a API diretamente não dá pra burlar a regra.
- Como a implantação usa "Qualquer pessoa" para permitir o acesso externo, evite armazenar dados sensíveis além do necessário nas planilhas (o modelo atual usa apenas nome, matrícula, setor e CPF).
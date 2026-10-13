# Download Hub

Site minimalista no tema **dark** para publicar e disponibilizar **arquivos, audios, fotos e videos** para download gratuito.

- Pagina publica: qualquer pessoa ve a demonstracao (foto / video / audio) e clica em **Baixar** (sem login, sem pagamento).
- Menu lateral (as 3 barrinhas) com navegacao e lista de categorias; ao clicar numa categoria voce **entra** nela.
- Fundo com **particulas animadas** e opcao de definir uma **foto de fundo** para o site (pelo painel admin).
- Painel do administrador (`/admin`): apenas administradores podem **publicar arquivos** e **criar/excluir categorias** (cada categoria pode ter uma **imagem de capa**).
- Categorias ja incluidas: Sfx-Pure, Wallpaper, Citizen, Otimizacao, Tutoriais FiveM, Tutoriais Edicao, Plugins Editor, OBS Lite, Outros, Banners.

## Pre-requisitos
- Node.js 16 ou superior (https://nodejs.org)

## Como rodar (passo a passo)

1. Abra o terminal dentro desta pasta e instale as dependencias:
   ```
   npm install
   ```
2. Crie as categorias iniciais:
   ```
   node scripts/seed.js
   ```
3. Crie o seu usuario administrador (escolha o usuario e a senha):
   ```
   npm run init-admin -- seu_usuario sua_senha
   ```
4. Inicie o site:
   ```
   npm start
   ```
5. Abra no navegador:
   - Site publico: http://127.0.0.1:3000
   - Painel admin: http://127.0.0.1:3000/admin

## Configuracao (opcional, por variaveis de ambiente)
- `PORT` - porta (padrao 3000)
- `HOST` - endereco (padrao 127.0.0.1; use 0.0.0.0 para expor na rede)
- `SESSION_SECRET` - segredo da sessao (defina um valor longo e aleatorio em producao)

Exemplo:
```
SESSION_SECRET="um-segredo-bem-grande" PORT=8080 npm start
```

## Importante sobre seguranca
- **Troque a senha padrao** e use uma senha forte no `init-admin`.
- Defina `SESSION_SECRET` em producao.
- Coloque o site atras de **HTTPS** (ex.: Nginx/Caddy) antes de publicar na internet, pois o login trafega credenciais.
- Os arquivos enviados sao salvos na pasta `uploads/` e os dados em `data/*.json`. Faca backup dessas pastas.
- O limite de upload por arquivo e de 1 GB (ajustavel em `server.js`).

## Estrutura
```
server.js        -> servidor (API + rotas)
lib/db.js        -> armazenamento em JSON
scripts/seed.js  -> cria categorias iniciais
scripts/create-admin.js -> cria/atualiza administrador
public/          -> site (HTML/CSS/JS, tema dark)
data/            -> dados (categorias, itens, usuarios)
uploads/         -> arquivos enviados
```

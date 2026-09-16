# PDF para QR Code

Aplicação React com Bootstrap que envia um PDF, armazena o arquivo no PostgreSQL e gera um QR Code para o respectivo download.

## Docker (recomendado)

Execute `docker compose up --build -d` e abra http://localhost:8080. A aplicação, API e PostgreSQL são iniciados juntos. Para acompanhar, use `docker compose logs -f`.

Para gerar QR Codes com seu domínio, defina `PUBLIC_URL` antes de iniciar, por exemplo no PowerShell: `$env:PUBLIC_URL = 'https://pdf.seudominio.com'; docker compose up --build -d`.

## Executar localmente

1. Crie o banco `pdftoqrcode` no PostgreSQL.
2. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`.
3. Execute o SQL em `server/schema.sql` no banco criado.
4. Em um terminal, inicie a API com `npm run server`.
5. Em outro terminal, inicie o front-end com `npm run dev`.

O QR Code usa `PUBLIC_URL/download/:token`. Para publicar, defina `PUBLIC_URL` com o seu domínio, por exemplo `https://pdf.seudominio.com`. A rota React redireciona automaticamente para a API, que responde o PDF como anexo para download.

## API

- `POST /api/documents`: recebe o campo de formulário `pdf` (máximo 20 MB) e cria o link.
- `GET /api/documents/:token/download`: obtém o arquivo da coluna `BYTEA` no PostgreSQL e força o download.
- `GET /api/health`: verifica a conectividade com o banco.

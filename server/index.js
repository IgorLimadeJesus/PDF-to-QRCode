import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import pg from 'pg'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT ?? 3001)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype === 'application/pdf'),
})

function passwordHash(password, salt) {
  return scryptSync(password, salt, 64).toString('hex')
}

function sendDocument(response, document) {
  response.set({
    'Content-Type': document.mime_type,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.original_name)}`,
    'Content-Length': document.file_data.length,
  })
  response.send(document.file_data)
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id BIGSERIAL PRIMARY KEY, token UUID NOT NULL UNIQUE, original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/pdf', file_data BYTEA NOT NULL,
      password_hash TEXT, password_salt TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS password_hash TEXT')
  await pool.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS password_salt TEXT')
}

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json())

app.get('/api/health', async (_request, response, next) => {
  try { await pool.query('SELECT 1'); response.json({ ok: true }) } catch (error) { next(error) }
})

app.post('/api/documents', upload.single('pdf'), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ message: 'Envie um arquivo PDF válido.' })
    const password = request.body.password?.trim() ?? ''
    if (password.length > 128) return response.status(400).json({ message: 'A senha deve ter no máximo 128 caracteres.' })
    const token = randomUUID()
    const salt = password ? randomBytes(16).toString('hex') : null
    const hash = salt ? passwordHash(password, salt) : null
    const result = await pool.query(
      `INSERT INTO documents (token, original_name, mime_type, file_data, password_hash, password_salt)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING token, original_name, created_at`,
      [token, request.file.originalname, request.file.mimetype, request.file.buffer, hash, salt],
    )
    const document = result.rows[0]
    const publicUrl = (process.env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, '')
    response.status(201).json({ token: document.token, originalName: document.original_name, createdAt: document.created_at, downloadUrl: `${publicUrl}/download/${document.token}` })
  } catch (error) { next(error) }
})

app.get('/api/documents/:token', async (request, response, next) => {
  try {
    const result = await pool.query('SELECT original_name, password_hash IS NOT NULL AS password_protected FROM documents WHERE token = $1', [request.params.token])
    const document = result.rows[0]
    if (!document) return response.status(404).json({ message: 'PDF não encontrado.' })
    response.json({ originalName: document.original_name, passwordProtected: document.password_protected })
  } catch (error) { next(error) }
})

app.get('/api/documents/:token/download', async (request, response, next) => {
  try {
    const result = await pool.query('SELECT original_name, mime_type, file_data, password_hash FROM documents WHERE token = $1', [request.params.token])
    const document = result.rows[0]
    if (!document) return response.status(404).json({ message: 'PDF não encontrado.' })
    if (document.password_hash) return response.status(401).json({ message: 'Este documento é protegido por senha.' })
    sendDocument(response, document)
  } catch (error) { next(error) }
})

app.post('/api/documents/:token/download', async (request, response, next) => {
  try {
    const result = await pool.query('SELECT original_name, mime_type, file_data, password_hash, password_salt FROM documents WHERE token = $1', [request.params.token])
    const document = result.rows[0]
    if (!document) return response.status(404).json({ message: 'PDF não encontrado.' })
    if (document.password_hash) {
      const candidate = request.body.password ?? ''
      const matches = timingSafeEqual(Buffer.from(document.password_hash, 'hex'), Buffer.from(passwordHash(candidate, document.password_salt), 'hex'))
      if (!matches) return response.status(401).json({ message: 'Senha incorreta.' })
    }
    sendDocument(response, document)
  } catch (error) { next(error) }
})

app.use((error, _request, response, _next) => {
  void _next
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ message: 'O PDF deve ter no máximo 20 MB.' })
  console.error(error)
  response.status(500).json({ message: 'Ocorreu um erro ao processar o PDF.' })
})

initializeDatabase().then(() => app.listen(port, () => console.log(`API disponível em http://localhost:${port}`))).catch((error) => { console.error('Não foi possível inicializar o banco de dados.', error); process.exit(1) })

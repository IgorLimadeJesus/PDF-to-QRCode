import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import pg from 'pg'
import { randomUUID } from 'node:crypto'
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

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))

app.get('/api/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1')
    response.json({ ok: true })
  } catch (error) { next(error) }
})

app.post('/api/documents', upload.single('pdf'), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ message: 'Envie um arquivo PDF válido.' })
    const token = randomUUID()
    const result = await pool.query(
      `INSERT INTO documents (token, original_name, mime_type, file_data)
       VALUES ($1, $2, $3, $4) RETURNING token, original_name, created_at`,
      [token, request.file.originalname, request.file.mimetype, request.file.buffer],
    )
    const document = result.rows[0]
    const publicUrl = (process.env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, '')
    response.status(201).json({ token: document.token, originalName: document.original_name, createdAt: document.created_at, downloadUrl: `${publicUrl}/download/${document.token}` })
  } catch (error) { next(error) }
})

app.get('/api/documents/:token/download', async (request, response, next) => {
  try {
    const result = await pool.query('SELECT original_name, mime_type, file_data FROM documents WHERE token = $1', [request.params.token])
    const document = result.rows[0]
    if (!document) return response.status(404).json({ message: 'PDF não encontrado.' })
    response.set({
      'Content-Type': document.mime_type,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.original_name)}`,
      'Content-Length': document.file_data.length,
    })
    response.send(document.file_data)
  } catch (error) { next(error) }
})

app.use((error, _request, response, _next) => {
  void _next
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ message: 'O PDF deve ter no máximo 20 MB.' })
  console.error(error)
  response.status(500).json({ message: 'Ocorreu um erro ao processar o PDF.' })
})

app.listen(port, () => console.log(`API disponível em http://localhost:${port}`))

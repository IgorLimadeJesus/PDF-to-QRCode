import { useEffect, useState } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import './App.css'

const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function makeQrCode(url, logo) {
  const qr = await QRCode.toDataURL(url, { width: 720, margin: 2, errorCorrectionLevel: 'H' })
  if (!logo) return qr
  const image = new Image()
  const objectUrl = URL.createObjectURL(logo)
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = objectUrl })
  const canvas = document.createElement('canvas')
  canvas.width = 720; canvas.height = 720
  const context = canvas.getContext('2d')
  const qrImage = new Image()
  await new Promise((resolve) => { qrImage.onload = resolve; qrImage.src = qr })
  context.drawImage(qrImage, 0, 0)
  const size = 126; const position = (720 - size) / 2
  context.fillStyle = '#fff'; context.fillRect(position - 12, position - 12, size + 24, size + 24)
  context.drawImage(image, position, position, size, size)
  URL.revokeObjectURL(objectUrl)
  return canvas.toDataURL('image/png')
}

function HomePage() {
  const [file, setFile] = useState(null)
  const [logo, setLogo] = useState(null)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file) return
    setStatus('uploading'); setError('')
    const form = new FormData()
    form.append('pdf', file)
    if (password) form.append('password', password)
    try {
      const response = await fetch(`${apiUrl}/documents`, { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message ?? 'Não foi possível enviar o PDF.')
      const qrCode = await makeQrCode(data.downloadUrl, logo)
      setResult({ ...data, qrCode }); setStatus('done')
    } catch (uploadError) { setError(uploadError.message); setStatus('idle') }
  }

  function reset() { setFile(null); setLogo(null); setPassword(''); setResult(null); setError(''); setStatus('idle') }

  return <main className="app-main"><a className="rittech-top" href="https://rittech.com.br/br" target="_blank" rel="noreferrer" aria-label="Visitar Rittech"><img src="/rittech-logo.png" alt="Rittech" /></a><section className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">GERADOR DE QR CODE</span><h1>Enviar documento</h1><p>Selecione um PDF para gerar um link e QR Code para download.</p></div><span className="format-badge">PDF · até 1 GB</span></div>
    {!result ? <div className="upload-card"><form onSubmit={handleSubmit}>
      <label htmlFor="pdf" className={`dropzone ${file ? 'has-file' : ''}`}><input id="pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /><span className="file-icon">{file ? '✓' : '↑'}</span><span className="dropzone-title">{file ? file.name : 'Clique para escolher o seu PDF'}</span><span className="dropzone-subtitle">{file ? 'Arquivo pronto para gerar o QR Code' : 'ou arraste e solte aqui'}</span></label>
      <div className="options-grid"><label className="option-field">Senha de acesso <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Opcional" maxLength="128" /></label><label className="option-field logo-field">Logo no QR Code <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} /><span>{logo ? logo.name : 'Selecionar imagem'}</span></label></div>
      {error && <div className="error-message" role="alert">{error}</div>}<button className="primary-button" type="submit" disabled={!file || status === 'uploading'}>{status === 'uploading' ? 'Gerando link…' : <>Gerar QR Code <span>→</span></>}</button>
    </form><p className="file-note">Senha e logo são opcionais. QR Codes com logo usam correção reforçada.</p></div> : <div className="result-card"><div className="success-icon">✓</div><span className="eyebrow">DOCUMENTO PRONTO</span><h2>QR Code gerado</h2><p>Aponte a câmera para baixar <strong>{result.originalName}</strong>.</p><img className="qr-code" src={result.qrCode} alt={`QR Code para baixar ${result.originalName}`} /><div className="url-row"><input value={result.downloadUrl} readOnly aria-label="Link de download" /><button type="button" onClick={() => navigator.clipboard.writeText(result.downloadUrl)}>Copiar</button></div><div className="result-actions"><a className="primary-button" href={result.downloadUrl}>Testar download <span>→</span></a><button className="secondary-button" type="button" onClick={reset}>Enviar outro PDF</button></div></div>}
  </section></main>
}

function DownloadPage() {
  const { token } = useParams()
  const [document, setDocument] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { fetch(`${apiUrl}/documents/${token}`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setDocument(data) }).catch((requestError) => setError(requestError.message)) }, [token])
  useEffect(() => { if (document && !document.passwordProtected) downloadDocument() }, [document]) // eslint-disable-line react-hooks/exhaustive-deps
  async function downloadDocument(event) {
    event?.preventDefault(); setDownloading(true); setError('')
    try { const response = await fetch(`${apiUrl}/documents/${token}/download`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); if (!response.ok) { const data = await response.json(); throw new Error(data.message) }; const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = window.document.createElement('a'); link.href = url; link.download = document?.originalName ?? 'documento.pdf'; link.click(); URL.revokeObjectURL(url) } catch (downloadError) { setError(downloadError.message) } finally { setDownloading(false) }
  }
  if (!document && !error) return <main className="download-page"><div className="download-card"><div className="loader" /><h1>Preparando seu download</h1></div></main>
  return <main className="download-page"><div className="download-card"><h1>{document?.passwordProtected ? 'Documento protegido' : 'Download pronto'}</h1><p>{document?.passwordProtected ? 'Digite a senha definida pelo remetente para baixar o arquivo.' : 'Seu download será iniciado automaticamente.'}</p>{document?.passwordProtected && <form onSubmit={downloadDocument}><input className="password-input" type="password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha de acesso" required />{error && <div className="error-message">{error}</div>}<button className="primary-button" type="submit" disabled={downloading}>{downloading ? 'Baixando…' : 'Baixar PDF'}</button></form>}{error && !document && <div className="error-message">{error}</div>}</div></main>
}

function App() { return <><Routes><Route path="/" element={<HomePage />} /><Route path="/download/:token" element={<DownloadPage />} /><Route path="*" element={<HomePage />} /></Routes><footer><span>PDF para QR Code</span></footer></> }
export default App

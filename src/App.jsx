import { useEffect, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import './App.css'

const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

function Brand() {
  return <Link className="brand" to="/" aria-label="PDF para QR — início"><span className="brand-mark">P</span><span>pdf<span className="brand-accent">.qr</span></span></Link>
}

function HomePage() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file) return
    setStatus('uploading')
    setError('')
    const form = new FormData()
    form.append('pdf', file)
    try {
      const response = await fetch(`${apiUrl}/documents`, { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message ?? 'Não foi possível enviar o PDF.')
      const qrCode = await QRCode.toDataURL(data.downloadUrl, { width: 360, margin: 2, errorCorrectionLevel: 'M' })
      setResult({ ...data, qrCode })
      setStatus('done')
    } catch (uploadError) {
      setError(uploadError.message)
      setStatus('idle')
    }
  }

  function reset() { setFile(null); setResult(null); setError(''); setStatus('idle') }

  return <main className="home">
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> Compartilhe sem atrito</span>
        <h1>Seu PDF, a um <em>scan</em> de distância.</h1>
        <p>Envie o arquivo, gere um QR Code e compartilhe um download seguro em poucos segundos.</p>
        <div className="hero-points"><span>✓ Sem cadastro</span><span>✓ Link seguro</span><span>✓ Até 20 MB</span></div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="hero-qr"><i /><i /><i /><i /><b /></div><span className="scan-line" /></div>
    </section>
    <section className="workspace">
      <div className="workspace-heading"><span className="step">01</span><div><h2>Envie seu documento</h2><p>Selecione um PDF para criar seu QR Code.</p></div></div>
      {!result ? <div className="upload-card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="pdf" className={`dropzone ${file ? 'has-file' : ''}`}>
            <input id="pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
            <span className="file-icon">{file ? '✓' : '↑'}</span>
            <span className="dropzone-title">{file ? file.name : 'Clique para escolher o seu PDF'}</span>
            <span className="dropzone-subtitle">{file ? 'Arquivo pronto para gerar o QR Code' : 'ou arraste e solte aqui'}</span>
          </label>
          {error && <div className="error-message" role="alert">{error}</div>}
          <button className="primary-button" type="submit" disabled={!file || status === 'uploading'}>{status === 'uploading' ? 'Gerando link…' : <>Gerar QR Code <span>→</span></>}</button>
        </form>
        <p className="file-note">Apenas PDF · Tamanho máximo de 20 MB</p>
      </div> : <div className="result-card">
        <div className="success-icon">✓</div><span className="eyebrow">Tudo pronto</span><h2>QR Code gerado!</h2>
        <p>Aponte a câmera para baixar <strong>{result.originalName}</strong>.</p>
        <img className="qr-code" src={result.qrCode} alt={`QR Code para baixar ${result.originalName}`} />
        <div className="url-row"><input value={result.downloadUrl} readOnly aria-label="Link de download" /><button type="button" onClick={() => navigator.clipboard.writeText(result.downloadUrl)}>Copiar</button></div>
        <div className="result-actions"><a className="primary-button" href={result.downloadUrl}>Testar download <span>→</span></a><button className="secondary-button" type="button" onClick={reset}>Enviar outro PDF</button></div>
      </div>}
    </section>
  </main>
}

function DownloadPage() {
  const { token } = useParams()
  useEffect(() => { window.location.replace(`${apiUrl}/documents/${token}/download`) }, [token])
  return <main className="download-page"><div className="download-card"><div className="loader" role="status"><span className="visually-hidden">Baixando PDF…</span></div><h1>Preparando seu download</h1><p>Se o download não começar, verifique se o link está correto.</p></div></main>
}

function App() {
  return <><header><nav><Brand /><span className="nav-status"><span /> Serviço online</span></nav></header><Routes><Route path="/" element={<HomePage />} /><Route path="/download/:token" element={<DownloadPage />} /><Route path="*" element={<HomePage />} /></Routes><footer><span>pdf.qr</span><span>Compartilhamento simples e rápido</span><span>© {new Date().getFullYear()}</span></footer></>
}

export default App

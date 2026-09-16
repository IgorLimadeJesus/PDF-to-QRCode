import { useEffect, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import './App.css'

const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

function Brand() {
  return <Link className="navbar-brand fw-semibold" to="/"><span className="text-primary">PDF</span> para QR</Link>
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

  function reset() {
    setFile(null)
    setResult(null)
    setError('')
    setStatus('idle')
  }

  return (
    <main className="container py-5">
      <section className="row justify-content-center text-center mb-5">
        <div className="col-lg-8">
          <span className="badge text-bg-primary-subtle text-primary-emphasis mb-3">Compartilhe PDFs em segundos</span>
          <h1 className="display-5 fw-bold">Transforme seu PDF em um QR Code</h1>
          <p className="lead text-body-secondary">Envie um arquivo, gere um link seguro no seu domínio e deixe o download a um scan de distância.</p>
        </div>
      </section>
      <section className="row justify-content-center">
        <div className="col-lg-8">
          {!result ? (
            <div className="card shadow-sm border-0"><div className="card-body p-4 p-md-5">
              <h2 className="h4 mb-1">Enviar PDF</h2><p className="text-body-secondary mb-4">Aceitamos arquivos PDF de até 20 MB.</p>
              <form onSubmit={handleSubmit}>
                <label htmlFor="pdf" className="form-label">Arquivo PDF</label>
                <input id="pdf" className="form-control form-control-lg" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
                {file && <div className="form-text">Selecionado: {file.name}</div>}
                {error && <div className="alert alert-danger mt-4 mb-0" role="alert">{error}</div>}
                <button className="btn btn-primary btn-lg w-100 mt-4" type="submit" disabled={!file || status === 'uploading'}>
                  {status === 'uploading' ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Gerando link…</> : 'Gerar QR Code'}
                </button>
              </form>
            </div></div>
          ) : (
            <div className="card shadow-sm border-0 text-center"><div className="card-body p-4 p-md-5">
              <div className="text-success fs-1 mb-2" aria-hidden="true">✓</div><h2 className="h3">QR Code gerado!</h2>
              <p className="text-body-secondary">Aponte a câmera para baixar <strong>{result.originalName}</strong>.</p>
              <img className="img-fluid qr-code my-3" src={result.qrCode} alt={`QR Code para baixar ${result.originalName}`} />
              <div className="input-group mt-2"><input className="form-control" value={result.downloadUrl} readOnly aria-label="Link de download" /><button className="btn btn-outline-primary" type="button" onClick={() => navigator.clipboard.writeText(result.downloadUrl)}>Copiar</button></div>
              <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 mt-4"><a className="btn btn-primary" href={result.downloadUrl}>Testar download</a><button className="btn btn-outline-secondary" type="button" onClick={reset}>Enviar outro PDF</button></div>
            </div></div>
          )}
        </div>
      </section>
    </main>
  )
}

function DownloadPage() {
  const { token } = useParams()

  useEffect(() => {
    window.location.replace(`${apiUrl}/documents/${token}/download`)
  }, [token])

  return <main className="container py-5 text-center"><div className="card mx-auto shadow-sm border-0 download-card"><div className="card-body p-5"><div className="spinner-border text-primary mb-3" role="status"><span className="visually-hidden">Baixando PDF…</span></div><h1 className="h3">Preparando seu download</h1><p className="text-body-secondary mb-0">Se o download não começar, verifique se o link está correto.</p></div></div></main>
}

function App() {
  return <><header className="border-bottom bg-white"><nav className="navbar container py-3"><Brand /><span className="navbar-text small">PDFs para QR Code</span></nav></header><Routes><Route path="/" element={<HomePage />} /><Route path="/download/:token" element={<DownloadPage />} /><Route path="*" element={<HomePage />} /></Routes><footer className="border-top py-4 text-center text-body-secondary small">PDF para QR · Compartilhamento simples e rápido</footer></>
}

export default App

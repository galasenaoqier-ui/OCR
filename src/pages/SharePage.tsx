import { Copy, Download, ExternalLink, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageShell, Panel } from '../components/ui'

export default function SharePage() {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get('url')
    if (query) { setUrl(query); return }
    const base = import.meta.env.BASE_URL || './'
    void fetch(`${base}qr/yinqi-h5-url.txt`).then((r) => r.ok ? r.text() : '').then((value) => setUrl(value.trim())).catch(() => setUrl(window.location.origin + '/'))
  }, [])
  async function copyUrl() {
    if (!url) return
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  const isTemporaryUrl = /\.trycloudflare\.com\b/i.test(url)
  return <PageShell eyebrow="H5 分享" title="手机扫码进入殷契拾文" lead="使用手机相机扫描二维码，打开响应式 H5 首页。">
    <Panel className="mx-auto max-w-xl p-5 sm:p-8">
      <div className="flex items-center gap-2 text-sm font-medium text-ink"><QrCode className="h-5 w-5 text-bronze" /> 手机扫码访问</div>
      <div className="mx-auto mt-6 flex max-w-[320px] items-center justify-center rounded-xl border border-line bg-white p-4"><img src={`${import.meta.env.BASE_URL || './'}qr/yinqi-h5.svg`} alt="殷契拾文 H5 二维码" className="h-auto w-full" /></div>
      <p className="mt-5 break-all rounded-lg bg-bone px-3 py-2 text-xs leading-5 text-muted">{url || '正在读取分享地址…'}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3"><button type="button" className="btn-primary min-h-11 !px-3 text-xs" onClick={copyUrl}><Copy className="h-4 w-4" />{copied ? '已复制' : '复制链接'}</button><a className="btn-ghost min-h-11 !px-3 text-xs" href={`${import.meta.env.BASE_URL || './'}qr/yinqi-h5.png`} download="yinqi-h5.png"><Download className="h-4 w-4" />下载 PNG</a>{url ? <a className="btn-ghost min-h-11 !px-3 text-xs" href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />打开 H5</a> : null}</div>
      <p className="mt-5 text-xs leading-5 text-muted">手机需要联网。{isTemporaryUrl ? 'Cloudflare Quick Tunnel 关闭后，本二维码对应的临时地址将不可访问。' : '二维码使用固定的 GitHub Pages 地址。'}</p>
    </Panel>
  </PageShell>
}

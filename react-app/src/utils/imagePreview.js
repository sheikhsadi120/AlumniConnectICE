// Simple global image preview helper
// - exposes `window.openImagePreview(url, title)`
// - adds delegated click handler for <img> elements to open preview

function createOverlay(src, title) {
  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'rgba(10,10,15,0.85)'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.zIndex = 2000
  overlay.style.cursor = 'zoom-out'

  const container = document.createElement('div')
  container.style.maxWidth = '90vw'
  container.style.maxHeight = '90vh'
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.gap = '12px'
  container.style.alignItems = 'center'

  const img = document.createElement('img')
  img.src = src
  img.alt = title || ''
  img.style.maxWidth = '100%'
  img.style.maxHeight = 'calc(90vh - 60px)'
  img.style.borderRadius = '8px'
  img.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)'

  const caption = document.createElement('div')
  caption.textContent = title || ''
  caption.style.color = '#fff'
  caption.style.fontSize = '14px'
  caption.style.opacity = '0.9'

  container.appendChild(img)
  if (title) container.appendChild(caption)
  overlay.appendChild(container)

  function remove() {
    overlay.removeEventListener('click', remove)
    document.removeEventListener('keydown', onKey)
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
  }
  function onKey(e) {
    if (e.key === 'Escape') remove()
  }
  overlay.addEventListener('click', remove)
  document.addEventListener('keydown', onKey)

  document.body.appendChild(overlay)
}

function openImagePreview(src, title) {
  if (!src) return
  createOverlay(src, title)
}

// Expose globally so components can call `window.openImagePreview(...)`
window.openImagePreview = openImagePreview

// Delegate clicks on images to preview (skip images explicitly opting out: data-preview="false")
document.addEventListener('click', (e) => {
  // Priority 1: any element explicitly declaring a preview src
  const previewAttrEl = e.target.closest && e.target.closest('[data-preview-src]')
  if (previewAttrEl) {
    const src = previewAttrEl.dataset.previewSrc || previewAttrEl.getAttribute('data-preview-src')
    const title = previewAttrEl.dataset.previewTitle || previewAttrEl.getAttribute('data-preview-title') || ''
    if (src) {
      openImagePreview(src, title)
      return
    }
  }

  // Priority 2: normal <img> elements
  const imgEl = e.target.closest && e.target.closest('img')
  if (imgEl) {
    if (imgEl.dataset && imgEl.dataset.preview === 'false') return
    openImagePreview(imgEl.src, imgEl.alt || '')
    return
  }

  // Priority 3: elements with a background-image and opt-in with data-preview-bg
  const bgEl = e.target.closest && e.target.closest('[data-preview-bg]')
  if (bgEl) {
    const style = window.getComputedStyle(bgEl)
    const bg = style && style.backgroundImage
    const m = bg && bg.match(/url\((?:"|')?(.*?)(?:"|')?\)/)
    if (m && m[1]) {
      const title = bgEl.dataset.previewTitle || ''
      openImagePreview(m[1], title)
    }
  }
})

export { openImagePreview }

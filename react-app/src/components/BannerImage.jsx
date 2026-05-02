import { useEffect, useMemo, useState } from 'react'
import { getUploadUrl } from '../services/api'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

const pickBannerCandidates = (ev) => {
  const candidates = []
  // Prefer full URL from backend when available, otherwise try stored filename
  const direct = ev?.banner_image_url || ev?.banner_image || ev?.image_url || ev?.image || ev?.banner

  if (direct) {
    candidates.push(getUploadUrl(direct))
  }

  if (ev?.id != null) {
    IMAGE_EXTENSIONS.forEach((ext) => {
      candidates.push(getUploadUrl(`events/${ev.id}.${ext}`))
    })
  }

  return Array.from(new Set(candidates.filter(Boolean)))
}

export default function BannerImage({ ev }) {
  const candidates = useMemo(() => pickBannerCandidates(ev), [ev])
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setCandidateIndex(0)
    setLoaded(false)
  }, [candidates])

  const src = candidates[candidateIndex] || null

  return (
    <>
      {src ? (
        <img
          src={src}
          alt={ev?.title || 'Event banner'}
          className="ec-banner-img"
          loading="eager"
          decoding="async"
          onLoad={(e) => {
            setLoaded(true)
            const ph = e.target.parentNode.querySelector('.ec-banner-placeholder')
            if (ph) ph.style.display = 'none'
            e.target.style.display = 'block'
          }}
          onError={(e) => {
            setLoaded(false)
            const ph = e.target.parentNode.querySelector('.ec-banner-placeholder')
            if (ph) ph.style.display = 'block'
            // try next candidate
            setCandidateIndex((index) => (index + 1 < candidates.length ? index + 1 : index))
            e.target.style.display = 'none'
          }}
        />
      ) : null}
      <div className="ec-banner-placeholder" style={{ display: loaded ? 'none' : 'block' }} />
    </>
  )
}
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getEvents, getUploadUrl } from '../services/api'
import '../styles/event-details.css'

export default function EventDetailsPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleBackClick = () => {
    const referrerView = location.state?.referrerView
    const dashboardType = location.state?.dashboardType || 'alumni'
    const dashboardPath = dashboardType === 'student' ? '/student-dashboard' : '/alumni-dashboard'
    
    if (referrerView === 'events') {
      // Go back to Events view in dashboard
      navigate(dashboardPath, { state: { activeView: 'events' } })
    } else if (referrerView === 'dashboard') {
      // Go back to Dashboard view
      navigate(dashboardPath, { state: { activeView: 'dashboard' } })
    } else {
      // Fallback to browser history
      navigate(-1)
    }
  }

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { ok, data } = await getEvents()
        if (ok) {
          const foundEvent = data.find(ev => ev.id === parseInt(eventId))
          if (foundEvent) {
            setEvent(foundEvent)
          } else {
            setError('Event not found')
          }
        } else {
          setError('Failed to load event')
        }
      } catch (err) {
        setError('Error loading event: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const parseDateValue = (value) => {
    if (!value) return null
    const text = String(value).trim()

    const direct = new Date(text)
    if (!Number.isNaN(direct.getTime())) return direct

    const midnight = new Date(`${text}T00:00:00`)
    if (!Number.isNaN(midnight.getTime())) return midnight

    return null
  }

  const formatDate = (dateStr) => {
    const parsed = parseDateValue(dateStr)
    if (!parsed) return String(dateStr || 'Date TBD')
    return parsed.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return 'Time TBD'
    const text = String(timeStr).trim()
    const normalized = text
      .replace(/\s+/g, ' ')
      .replace(/\b([ap])\.?(m)\.?$/i, (_, p1, p2) => `${p1}${p2}`.toUpperCase())

    const timeMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?$/i)
    if (timeMatch) {
      const hours = Number(timeMatch[1])
      const minutes = Number(timeMatch[2])
      const seconds = Number(timeMatch[3] || 0)
      const meridiem = timeMatch[4]?.toUpperCase()
      const date = new Date(2000, 0, 1, hours, minutes, seconds)

      if (!Number.isNaN(date.getTime())) {
        if (meridiem) {
          return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${meridiem}`
        }
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      }
    }

    const parsed = parseDateValue(text)
    if (parsed) return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    return text
  }

  if (loading) {
    return (
      <div className="event-details-page">
        <div className="ed-loading">Loading event details...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="event-details-page">
        <div className="ed-error">
          <i className="fa-solid fa-exclamation-circle"></i>
          {error || 'Event not found'}
        </div>
        <button className="ed-back-btn" onClick={handleBackClick}>
          <i className="fa-solid fa-arrow-left"></i> Go Back
        </button>
      </div>
    )
  }

  const badge = event.audience === 'both' ? 'For Alumni & Students' : event.audience === 'alumni' ? 'Alumni Only' : 'Students Only'
  // Prefer full URL returned by backend (banner_image_url); fall back to upload mapping
  const bannerUrl = event.banner_image_url ? event.banner_image_url : (event.banner_image ? getUploadUrl(event.banner_image) : null)

  return (
    <div className="event-details-page">
      <button className="ed-back-btn" onClick={handleBackClick}>
        <i className="fa-solid fa-arrow-left"></i> Back
      </button>

      <div className="ed-container">
        {bannerUrl && (
          <div className="ed-banner">
            <img src={bannerUrl} alt={event.title} />
          </div>
        )}

        <div className="ed-content">
          <div className="ed-header">
            <div className="ed-header-top">
              <div className="ed-badge">{badge}</div>
              <div className="ed-id">Event #{event.id}</div>
            </div>
            <h1 className="ed-title">{event.title}</h1>
          </div>

          <div className="ed-info-grid">
            <div className="ed-info-box">
              <div className="ed-info-icon">
                <i className="fa-solid fa-calendar"></i>
              </div>
              <div className="ed-info-content">
                <div className="ed-info-label">Date</div>
                <div className="ed-info-value">{formatDate(event.date)}</div>
              </div>
            </div>

            <div className="ed-info-box">
              <div className="ed-info-icon">
                <i className="fa-solid fa-clock"></i>
              </div>
              <div className="ed-info-content">
                <div className="ed-info-label">Time</div>
                <div className="ed-info-value">{formatTime(event.event_time || event.time)}</div>
              </div>
            </div>

            <div className="ed-info-box">
              <div className="ed-info-icon">
                <i className="fa-solid fa-location-dot"></i>
              </div>
              <div className="ed-info-content">
                <div className="ed-info-label">Location</div>
                <div className="ed-info-value">{event.location || 'Location TBD'}</div>
              </div>
            </div>

            {Number(event.fee) > 0 && (
              <div className="ed-info-box">
                <div className="ed-info-icon">
                  <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                </div>
                <div className="ed-info-content">
                  <div className="ed-info-label">Registration Fee</div>
                  <div className="ed-info-value">৳{Number(event.fee).toLocaleString()}</div>
                </div>
              </div>
            )}

            {event.registration_deadline && (
              <div className="ed-info-box">
                <div className="ed-info-icon">
                  <i className="fa-solid fa-hourglass-end"></i>
                </div>
                <div className="ed-info-content">
                  <div className="ed-info-label">Registration Deadline</div>
                  <div className="ed-info-value">{formatDate(event.registration_deadline)}</div>
                </div>
              </div>
            )}

            {event.payment_account && (
              <div className="ed-info-box">
                <div className="ed-info-icon">
                  <i className="fa-solid fa-building-columns"></i>
                </div>
                <div className="ed-info-content">
                  <div className="ed-info-label">Payment Account</div>
                  <div className="ed-info-value">{event.payment_account}</div>
                </div>
              </div>
            )}
          </div>

          <div className="ed-description-section">
            <h2 className="ed-section-title">About This Event</h2>
            <div className="ed-description">
              {event.description || 'No description provided'}
            </div>
          </div>

          <div className="ed-metadata">
            {event.created_at && (
              <div className="ed-meta-item">
                <span className="ed-meta-label">Created:</span>
                <span className="ed-meta-value">
                  {formatDate(event.created_at)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Modal, Alert } from 'react-bootstrap'
import { getUploadUrl } from '../services/api'

// Event Registration Form Modal
export function EventRegistrationModal({ show, onHide, event, onSubmit, loading }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', transaction_id: '' })
  const [alert, setAlert] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.phone) {
      setAlert({ type: 'danger', msg: 'Please fill in all required fields' })
      return
    }
    
    const result = await onSubmit(formData)
    if (result.success) {
      setAlert({ type: 'success', msg: 'Registration successful!' })
      setTimeout(() => {
        onHide()
        setFormData({ name: '', email: '', phone: '', transaction_id: '' })
        setAlert(null)
      }, 1500)
    } else {
      setAlert({ type: 'danger', msg: result.message || 'Registration failed' })
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered contentClassName="bg-transparent border-0 shadow-none p-0">
      <div className="modal-box">
        <h3><i className="fa-solid fa-pen-fancy" style={{ color: '#00a3a3' }}></i> Register for Event</h3>
        {event && <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}><strong>{event.title}</strong></p>}
        
        {alert && (
          <Alert variant={alert.type} style={{ marginBottom: 16, fontSize: 13 }}>
            {alert.msg}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <label>Full Name *</label>
          <input 
            type="text" 
            placeholder="Your full name" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
          
          <label>Email *</label>
          <input 
            type="email" 
            placeholder="your@email.com" 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
          />
          
          <label>Phone Number *</label>
          <input 
            type="tel" 
            placeholder="+880 1712345678" 
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            required
          />
          
          {event?.fee > 0 && (
            <>
              <label>Transaction ID / Payment Reference</label>
              <input 
                type="text" 
                placeholder="e.g., TRX123456789" 
                value={formData.transaction_id}
                onChange={e => setFormData({...formData, transaction_id: e.target.value})}
              />
            </>
          )}
          
          <div className="modal-actions">
            <button type="submit" className="btn-primary-admin" disabled={loading}>
              <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-check'}`}></i> 
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
            <button type="button" className="btn-cancel" onClick={onHide}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// Event Details Modal
export function EventDetailsModal({ show, onHide, event, onRegisterClick }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatSchedule = (date, time) => {
    if (!date) return 'Date TBD'
    const dateObj = new Date(date + 'T00:00:00')
    const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Time TBD'
    return `${dayStr} — ${timeStr}`
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg" contentClassName="bg-transparent border-0 shadow-none p-0">
      <div className="modal-box" style={{ width: '100%', maxWidth: '600px' }}>
        <h3><i className="fa-solid fa-circle-info" style={{ color: '#00a3a3' }}></i> Event Details</h3>
        
        {event && (
          <>
            {(event.banner_image_url || event.banner_image) && (
              <img 
                src={getUploadUrl(event.banner_image_url || event.banner_image)} 
                alt={event.title}
                style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }}
              />
            )}
            
            <div style={{ marginBottom: 14 }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: 18 }}>{event.title}</h4>
              {event.audience && (
                <span style={{ display: 'inline-block', background: '#e0f2f5', color: '#00838f', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  For {event.audience === 'both' ? 'alumni & students' : event.audience}
                </span>
              )}
            </div>
            
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <i className="fa-solid fa-calendar" style={{ color: '#00a3a3', minWidth: 16 }}></i>
                <span><strong>When:</strong> {formatSchedule(event.date, event.event_time)}</span>
              </div>
              
              {event.registration_deadline && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <i className="fa-solid fa-hourglass-end" style={{ color: '#e88c00', minWidth: 16 }}></i>
                  <span><strong>Registration Closes:</strong> {formatDate(event.registration_deadline)}</span>
                </div>
              )}
              
              {event.location && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <i className="fa-solid fa-location-dot" style={{ color: '#00a3a3', minWidth: 16 }}></i>
                  <span><strong>Location:</strong> {event.location}</span>
                </div>
              )}
              
              {event.fee > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <i className="fa-solid fa-bangladeshi-taka-sign" style={{ color: '#00a3a3', minWidth: 16 }}></i>
                  <span><strong>Fee:</strong> ৳{Number(event.fee).toLocaleString()}</span>
                </div>
              )}
              
              {event.payment_account && event.fee > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <i className="fa-solid fa-building-columns" style={{ color: '#00a3a3', minWidth: 16 }}></i>
                  <span><strong>Payment:</strong> {event.payment_account}</span>
                </div>
              )}
            </div>
            
            {event.description && (
              <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                {event.description}
              </div>
            )}
            
            <div className="modal-actions">
              <button type="button" className="btn-primary-admin" onClick={onRegisterClick}>
                <i className="fa-solid fa-pencil"></i> Register Now
              </button>
              <button type="button" className="btn-cancel" onClick={onHide}>Close</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// Professional Event Card Component
export function ProfessionalEventCard({ event, onRegisterClick, onDetailsClick, themeColor = '#00a3a3' }) {
  const [liked, setLiked] = useState(false)

  const formatDate = (dateStr) => {
    if (!dateStr) return { day: '?', month: '?' }
    const d = new Date(dateStr + 'T00:00:00')
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    }
  }

  const formatSchedule = (date, time) => {
    if (!date) return 'Date TBD'
    const dateObj = new Date(date + 'T00:00:00')
    const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const timeStr = time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBD'
    return `${dayStr} — ${timeStr}`
  }

  const imageSrc = getUploadUrl(event.banner_image_url || event.banner_image)
  const badge = event.audience === 'both' ? 'For Alumni & Students' : event.audience === 'alumni' ? 'Alumni Only' : 'Students Only'
  
  const dateObj = formatDate(event.date)

  return (
    <div className="event-card-pro">
      <div className="event-card-pro-image-wrap" style={{ backgroundColor: imageSrc ? 'transparent' : '#f0f0f0' }}>
        {imageSrc && <img className="event-card-pro-image" src={imageSrc} alt={event.title} />}
        
        <div className="event-card-pro-date-badge">
          <div className="event-card-pro-date-badge-day">{dateObj.day}</div>
          <div className="event-card-pro-date-badge-month">{dateObj.month}</div>
        </div>
        
        <button 
          className="event-card-pro-heart" 
          onClick={() => setLiked(!liked)}
          style={{ background: liked ? '#fff5f5' : 'white', color: liked ? '#c41d38' : '#ccc' }}
        >
          <i className={`fa-${liked ? 'solid' : 'regular'} fa-heart`}></i>
        </button>
        
        <div className="event-card-pro-attendees">
          <div className="event-card-pro-attendees-avatars">
            <div className="event-card-pro-attendees-avatar">+4K</div>
          </div>
          <span className="event-card-pro-attendees-text">Going</span>
        </div>
      </div>
      
      <div className="event-card-pro-body">
        <div className="event-card-pro-badge">{badge}</div>
        <h4 className="event-card-pro-title">{event.title}</h4>
        
        <div className="event-card-pro-details">
          <div className="event-card-pro-details-item">
            <i className="fa-solid fa-location-dot"></i>
            <span>{event.location || 'Location TBD'}</span>
          </div>
          
          <div className="event-card-pro-details-item">
            <i className="fa-solid fa-calendar"></i>
            <span>{formatSchedule(event.date, event.event_time)}</span>
          </div>
          
          {event.fee > 0 && (
            <div className="event-card-pro-details-item">
              <i className="fa-solid fa-bangladeshi-taka-sign"></i>
              <span>৳{Number(event.fee).toLocaleString()}</span>
            </div>
          )}
        </div>
        
        <div className="event-card-pro-actions">
          <button className="event-card-pro-btn event-card-pro-btn-register" onClick={onRegisterClick}>
            <i className="fa-solid fa-pen-fancy"></i> Register
          </button>
          <button className="event-card-pro-btn event-card-pro-btn-details" onClick={onDetailsClick}>
            <i className="fa-solid fa-circle-info"></i> Details
          </button>
        </div>
      </div>
    </div>
  )
}

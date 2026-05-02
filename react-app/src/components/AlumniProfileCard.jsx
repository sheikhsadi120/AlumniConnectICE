import React, { useEffect, useState } from 'react';
import { getUploadUrl } from '../services/api';
import '../styles/alumni-profile-card.css';

const RU_LOGO_FILENAME = '7cbe1217a9234326b95b9ead930413b4_RU_Official_Logo-768x782.jpg';
const RU_LOGO_FALLBACK = '/assets/site-logo.jpg';

const splitTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const normalizePastJobs = (jobs) => {
  if (!jobs) return [];
  let source = jobs;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch (_) { source = []; }
  }
  if (source && !Array.isArray(source) && typeof source === 'object') {
    source = source.past_jobs || source.jobs || source.items || [];
  }
  if (!Array.isArray(source)) return [];
  return source
    .map((job) => ({
      company: String(job?.company || job?.company_name || job?.organization || job?.org || '').trim(),
      designation: String(job?.designation || job?.role || job?.title || job?.position || '').trim(),
      start_date: job?.start_date || job?.startDate || job?.from || '',
      end_date: job?.end_date || job?.endDate || job?.to || '',
    }))
    .filter((job) => job.company || job.designation);
};

const formatMonthYear = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatPeriod = (startDate, endDate, isCurrent = false) => {
  const startLabel = formatMonthYear(startDate);
  const endLabel = isCurrent ? 'Present' : formatMonthYear(endDate);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `Since ${startLabel}`;
  if (endLabel && !isCurrent) return `Until ${endLabel}`;
  return 'Duration not provided';
};

export default function AlumniProfileCard({ profile, avatarUrl, onClose, onAvatarClick, viewerType = 'alumni' }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [logoSrc, setLogoSrc] = useState(() => getUploadUrl(RU_LOGO_FILENAME));
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(profile || {});

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    setEditData(profile || {});
  }, [profile]);

  if (!profile) return null;

  const name = profile.name || 'Alumni';
  const nameInitial = name.trim().charAt(0).toUpperCase() || 'A';
  const designation = profile.designation || 'Alumni';
  const organization = profile.company || profile.organization || '';
  const aboutText = profile.about_me || profile.bio || 'Professional passionate about technology, innovation, and service.';
  const departmentSession = [profile.department || 'N/A', profile.session || 'N/A'].join(' · ');
  const expertiseTags = splitTags(profile.research_interests);
  const activities = splitTags(profile.extracurricular_activities || profile.extracurricular || profile.activities);
  const pastJobs = normalizePastJobs(profile.past_jobs);
  const currentRole = organization ? `${designation} @ ${organization}` : designation;
  const inferredViewerType = typeof window !== 'undefined' && window.location.pathname.includes('/student-dashboard')
    ? 'student'
    : 'alumni';
  const normalizedViewerType = String(viewerType || inferredViewerType).toLowerCase();
  const profileKicker = 'INFORMATION AND COMMUNICATION ENGINEERING ALUMNI';
  const hasSocialLinks = Boolean(profile.email || profile.website || profile.linkedin || profile.github || profile.twitter);
  const publications = Array.isArray(profile.publications)
    ? profile.publications.map((item) => String(item).trim()).filter(Boolean).join(', ')
    : String(profile.publications || '').trim();

  const studentIdValue = profile.student_id ? String(profile.student_id) : ''

  const contactItems = [
    { label: 'Department / Session', value: departmentSession, icon: 'fa-graduation-cap' },
    { label: 'Student ID', value: studentIdValue, icon: 'fa-id-badge' },
    { label: 'Hall / Residential', value: profile.hall_name, icon: 'fa-home' },
    { label: 'Email', value: profile.email, icon: 'fa-envelope', href: profile.email ? `mailto:${profile.email}` : '' },
    { label: 'Phone', value: profile.phone, icon: 'fa-phone', href: profile.phone ? `tel:${profile.phone}` : '' },
    { label: 'Address', value: profile.address, icon: 'fa-location-dot' },
    { label: 'Publications', value: publications, icon: 'fa-book-open' },
  ].filter((item) => item.value);

  const handleLogoError = () => setLogoSrc(RU_LOGO_FALLBACK);

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-shell" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="profile-close-btn" onClick={onClose} aria-label="Close profile">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <article className="profile-card premium-card">
          <header className="profile-banner">
            <div className="profile-banner-brand">
              <div className="profile-banner-circle">
                <img src={logoSrc} alt="Rajshahi University logo" className="profile-banner-seal" onError={handleLogoError} />
              </div>
              <div className="profile-banner-brand-copy">
                <span className="profile-banner-brand-title">AlumniConnect</span>
                <span className="profile-banner-brand-sub">ICE Department</span>
              </div>
            </div>

            <div className="profile-banner-copy">
              <span className="profile-kicker">{profileKicker}</span>
              <h1 className="profile-name">{name}</h1>
              <p className="profile-title-line">{designation}{organization ? ` · ${organization}` : ''}</p>
            </div>
            <div className="profile-banner-glow"></div>
          </header>

          <div className="profile-body">
            <section className="profile-hero">
              <div className="profile-avatar-column">
                <div className="profile-avatar-frame">
                  {avatarUrl && !avatarFailed ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="profile-avatar-image"
                      onError={() => setAvatarFailed(true)}
                      onClick={onAvatarClick || undefined}
                      role={onAvatarClick ? 'button' : undefined}
                    />
                  ) : (
                    <div className="profile-avatar-fallback">{nameInitial}</div>
                  )}
                </div>

                <div className="verified-badge">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>Verified Alumni</span>
                </div>
              </div>

              <div className="profile-about-card">
                <div className="profile-section-label">About Me</div>
                <p className="profile-about-text">{aboutText}</p>

                {hasSocialLinks && (
                  <div className="profile-icon-row">
                    {profile.email && <a className="profile-icon-link" href={`mailto:${profile.email}`} aria-label="Email"><i className="fa-solid fa-envelope"></i></a>}
                    {profile.website && <a className="profile-icon-link" href={profile.website} target="_blank" rel="noreferrer" aria-label="Website"><i className="fa-solid fa-link"></i></a>}
                    {profile.linkedin && <a className="profile-icon-link" href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in"></i></a>}
                    {profile.github && <a className="profile-icon-link" href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub"><i className="fa-brands fa-github"></i></a>}
                    {profile.twitter && <a className="profile-icon-link" href={profile.twitter} target="_blank" rel="noreferrer" aria-label="Twitter"><i className="fa-brands fa-x-twitter"></i></a>}
                  </div>
                )}
              </div>
            </section>

            <section className="profile-grid">
              <div className="profile-panel">
                <h2 className="profile-panel-title">Contact &amp; Personal Info</h2>
                <div className="contact-list">
                  {contactItems.map((item) => {
                    const parts = String(item.value).split('·').map((s) => s.trim()).filter(Boolean);
                    const valueNodes = parts.length > 1 ? parts.map((p, idx) => <span className="contact-value" key={idx}>{p}</span>) : <span className="contact-value">{item.value}</span>;

                    return item.href ? (
                      <a className="contact-item" href={item.href} key={item.label}>
                        <span className="contact-icon"><i className={`fa-solid ${item.icon}`}></i></span>
                        <span className="contact-copy"><span className="contact-label">{item.label}</span>{valueNodes}</span>
                      </a>
                    ) : (
                      <div className="contact-item" key={item.label}>
                        <span className="contact-icon"><i className={`fa-solid ${item.icon}`}></i></span>
                        <span className="contact-copy"><span className="contact-label">{item.label}</span>{valueNodes}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="profile-split">
              <div className="profile-panel profile-panel--chips">
                <h2 className="profile-panel-title">Research Interest</h2>
                <div className="chip-group">
                  {expertiseTags.length > 0 ? expertiseTags.map((tag, index) => <span className={`chip chip--skill chip--${index % 5}`} key={`${tag}-${index}`}>{tag}</span>) : <span className="chip chip--empty">No research interests specified</span>}
                </div>
              </div>

              <div className="profile-panel profile-panel--chips">
                <h2 className="profile-panel-title">Extracurricular Activities</h2>
                <div className="chip-group">
                  {activities.length > 0 ? activities.map((activity, index) => <span className={`chip chip--activity chip--activity-${index % 4}`} key={`${activity}-${index}`}>{activity}</span>) : <span className="chip chip--empty">No activities specified</span>}
                </div>
              </div>
            </section>

            <div className="profile-footer-actions">
              <button type="button" className="profile-edit-btn" onClick={() => setEditMode(true)}>
                <i className="fa-solid fa-pen"></i>
                Edit Profile
              </button>
            </div>
          </div>
        </article>

        {editMode && (
          <div className="profile-overlay" onClick={() => setEditMode(false)}>
            <div className="profile-shell" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="profile-close-btn" onClick={() => setEditMode(false)} aria-label="Close edit">
                <i className="fa-solid fa-xmark"></i>
              </button>

              <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', maxHeight: '88vh', overflow: 'auto' }}>
                <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '800' }}>Edit Profile</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Name</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Email</label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Designation</label>
                    <input
                      type="text"
                      value={editData.designation || ''}
                      onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Organization</label>
                    <input
                      type="text"
                      value={editData.company || ''}
                      onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>About Me</label>
                  <textarea
                    value={editData.about_me || ''}
                    onChange={(e) => setEditData({ ...editData, about_me: e.target.value })}
                    rows="4"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f3f4f6', color: '#111', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                    }}
                    style={{ padding: '10px 18px', borderRadius: '8px', border: '0', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

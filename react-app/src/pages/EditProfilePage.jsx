import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { editProfile, getMyProfile, resolveAvatarUrl } from '../services/api'
import { ProfileSectionCard, TagCloud } from '../components/profile/ProfileBlocks'
import { getStoredUser, normalizeProfileResponse, splitTags } from '../utils/profile-utils'
import '../styles/profile-page.css'

const baseFormState = (profile = {}) => ({
  name: profile.name || '',
  bio: profile.bio || '',
  department: profile.department || 'ICE',
  session: profile.session || '',
  student_id: profile.student_id || '',
  hall_name: profile.hall_name || '',
  company: profile.company || '',
  designation: profile.designation || '',
  current_job_start_date: profile.current_job_start_date || '',
  phone: profile.phone || '',
  address: profile.address || '',
  research_interests: profile.research_interests || '',
  extracurricular: profile.extracurricular || '',
})

export default function EditProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useMemo(() => getStoredUser(), [])
  const [profile, setProfile] = useState(() => normalizeProfileResponse(location.state?.profile || currentUser || {}))
  const [form, setForm] = useState(() => baseFormState(location.state?.profile || currentUser || {}))
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadCurrentProfile = async () => {
      if (location.state?.profile) return
      if (!currentUser?.id) return

      const result = await getMyProfile(currentUser.id, currentUser.user_type)
      if (cancelled) return
      if (result.ok) {
        const nextProfile = normalizeProfileResponse(result.data.profile || result.data)
        setProfile(nextProfile)
        setForm(baseFormState(nextProfile))
      }
    }

    loadCurrentProfile()

    return () => {
      cancelled = true
    }
  }, [currentUser?.id, currentUser?.user_type, location.state?.profile])

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('')
      return
    }

    const preview = URL.createObjectURL(photoFile)
    setPhotoPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [photoFile])

  const avatarUrl = photoPreview || resolveAvatarUrl(profile)
  const expertiseTags = splitTags(form.research_interests)
  const activityTags = splitTags(form.extracurricular)

  const handleChange = (event) => {
    const { name, value } = event.target
    setSuccess('')
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const persistLocalUser = (nextProfile) => {
    if (typeof window === 'undefined') return
    const key = nextProfile.user_type === 'student' ? 'studentUser' : 'alumniUser'
    localStorage.setItem(key, JSON.stringify(nextProfile))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = new FormData()
      payload.append('user_id', String(profile.id || currentUser?.id || ''))
      payload.append('user_type', profile.user_type || currentUser?.user_type || 'alumni')

      Object.entries(form).forEach(([key, value]) => payload.append(key, value || ''))
      if (photoFile) {
        payload.append('photo', photoFile)
      }

      const result = await editProfile(payload)
      if (!result.ok) {
        setError(result.data?.message || 'Failed to update profile.')
        return
      }

      const nextProfile = normalizeProfileResponse(result.data.profile || result.data)
      setProfile(nextProfile)
      setForm(baseFormState(nextProfile))
      persistLocalUser(nextProfile)
      setPhotoFile(null)
      setSuccess('saved')
    } catch (err) {
      setError(err?.message || 'Unable to save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!profile.id && !currentUser?.id) {
    return (
      <div className="profile-page">
        <main className="profile-page__shell profile-page__shell--error">
          <h1>Sign in required</h1>
          <p>Please log in to edit your profile.</p>
          <button className="profile-primary-btn" onClick={() => navigate('/')}>Go to home</button>
        </main>
      </div>
    )
  }

  return (
    <div className="profile-page profile-page--edit">
      <div className="profile-page__ambient" />
      <main className="profile-page__shell">
        <header className="profile-hero profile-hero--edit">
          <div className="profile-hero__banner">
            <div>
              <div className="profile-hero__eyebrow">Edit profile</div>
              <h1>Update your profile</h1>
              <p>Keep your professional and academic details current.</p>
            </div>
            <div className="profile-hero__brand-chip">RU ICE</div>
          </div>

          <div className="profile-hero__body profile-hero__body--edit">
            <div className="profile-hero__identity">
              <button type="button" className="profile-back-btn" onClick={() => navigate(-1)}>
                <i className="fa-solid fa-arrow-left" /> Back
              </button>
              <div className="profile-avatar-frame">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.name || 'Profile'} />
                ) : (
                  <span>{(profile.name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="profile-hero__copy">
                <div className="profile-hero__labels">
                  <span className="profile-kicker">Edit mode</span>
                </div>
                <h2>{profile.name || 'Unnamed Profile'}</h2>
                <p>Use the form below to update your public profile page.</p>
              </div>
            </div>
          </div>
        </header>

        <form className="profile-edit-form" onSubmit={handleSubmit}>
          {error && <div className="profile-form-alert profile-form-alert--error">{error}</div>}
          {success && <div className="profile-form-alert profile-form-alert--success">{success}</div>}

          <ProfileSectionCard title="Profile Photo" eyebrow="Header image">
            <div className="profile-photo-picker">
              <div className="profile-photo-picker__preview">
                {avatarUrl ? <img src={avatarUrl} alt={profile.name || 'Profile'} /> : <span>{(profile.name || 'U').charAt(0).toUpperCase()}</span>}
              </div>
              <label className="profile-file-input">
                <span>Select image</span>
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </ProfileSectionCard>

          <section className="profile-edit-grid">
            <ProfileSectionCard title="Basic Details" eyebrow="Identity">
              <div className="profile-form-grid">
                <div className="profile-readonly-field"><span>Name</span><strong>{form.name || '—'}</strong></div>
                <div className="profile-readonly-field"><span>Department</span><strong>{form.department || '—'}</strong></div>
                <div className="profile-readonly-field"><span>Session / Batch</span><strong>{form.session || '—'}</strong></div>
                <div className="profile-readonly-field"><span>Student ID</span><strong>{form.student_id || '—'}</strong></div>
                <div className="profile-readonly-field profile-form-grid__full"><span>Hall</span><strong>{form.hall_name || '—'}</strong></div>
              </div>
            </ProfileSectionCard>
          </section>

          <div className="profile-page__footer profile-page__footer--edit">
            <button type="button" className="profile-secondary-btn" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="profile-primary-btn profile-primary-btn--wide" disabled={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

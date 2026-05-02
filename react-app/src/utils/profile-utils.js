export const getStoredUser = () => {
  if (typeof window === 'undefined') return null

  const sources = ['alumniUser', 'studentUser']
  for (const key of sources) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    } catch (_) {}
  }

  return null
}

export const isOwnProfile = (profile, currentUser = getStoredUser()) => {
  if (!profile || !currentUser) return false
  return String(profile.id || '') === String(currentUser.id || '')
}

export const splitTags = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export const formatMonthYear = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  const direct = new Date(text)
  if (!Number.isNaN(direct.getTime())) {
    return direct.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return text
}

export const formatPeriod = (startValue, endValue) => {
  const start = formatMonthYear(startValue)
  const end = endValue ? formatMonthYear(endValue) : 'Present'
  if (start && end) return `${start} - ${end}`
  return start || end || ''
}

export const buildTimelineEntries = (profile = {}) => {
  const entries = []

  if (profile.session || profile.department) {
    entries.push({
      title: 'Academic Journey',
      meta: [profile.department, profile.session].filter(Boolean).join(' · '),
      date: profile.graduation_year ? `Batch ${profile.graduation_year}` : '',
      tone: 'academic',
    })
  }

  if (profile.company || profile.designation) {
    entries.push({
      title: [profile.designation, profile.company].filter(Boolean).join(' at ') || 'Current role',
      meta: formatPeriod(profile.current_job_start_date, null),
      date: 'Current',
      tone: 'career',
    })
  }

  const pastJobs = Array.isArray(profile.past_jobs) ? profile.past_jobs : []
  pastJobs.forEach((job, index) => {
    entries.push({
      title: [job?.designation, job?.company].filter(Boolean).join(' at ') || `Previous role ${index + 1}`,
      meta: formatPeriod(job?.start_date, job?.end_date),
      date: 'past job/role',
      tone: 'past',
    })
  })

  return entries
}

export const normalizeProfileResponse = (profile = {}) => ({
  ...profile,
  bio: profile.bio || '',
  research_interests: profile.research_interests || '',
  extracurricular: profile.extracurricular || '',
  linkedin: profile.linkedin || '',
  github: profile.github || '',
  twitter: profile.twitter || '',
  website: profile.website || '',
  phone: profile.phone || '',
  address: profile.address || '',
  company: profile.company || '',
  designation: profile.designation || '',
  department: profile.department || 'ICE',
  session: profile.session || '',
  graduation_year: profile.graduation_year || '',
  hall_name: profile.hall_name || '',
  current_job_start_date: profile.current_job_start_date || '',
  photo_url: profile.photo_url || profile.photo || '',
  past_jobs: Array.isArray(profile.past_jobs) ? profile.past_jobs : [],
})

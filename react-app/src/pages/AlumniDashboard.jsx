import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Modal } from 'react-bootstrap'
import '../styles/alumni-dashboard.css'
import {
  getEvents, getTrainings, getAlumni, getStudents,
  joinEvent, leaveEvent,
  enrollTraining, unenrollTraining,
  updateAlumni, getJobs, submitJob,
  registerForEvent,
  registerForTraining,
  addTraining,
  getTrainingAttendees,
  getEnrolledTrainingIds,
  getRegisteredEventIds,
  getFundRequests,
  getTransactions,
  addTransaction,
  updateAlumniPhoto,
  resolveAvatarUrl,
  createReferral,
  getReferralsByAlumni,
} from '../services/api'

const sidebarItems = [
  { view: 'dashboard',    icon: 'fa-gauge',           label: 'Dashboard'    },
  { view: 'profile',      icon: 'fa-user-circle',     label: 'My Profile'   },
  { view: 'directory',    icon: 'fa-user-graduate',   label: 'All Alumni'   },
  { view: 'students-dir', icon: 'fa-users',           label: 'All Students' },
  { view: 'events',       icon: 'fa-calendar-days',   label: 'Events'       },
  { view: 'jobs',         icon: 'fa-briefcase',       label: 'Jobs'         },
  { view: 'trainings',    icon: 'fa-chalkboard-user', label: 'Trainings'    },
  { view: 'refer-alumni', icon: 'fa-user-plus',       label: 'Refer Alumni' },
  { view: 'membership',   icon: 'fa-id-card',         label: 'Membership'   },
  { view: 'fund-transaction', icon: 'fa-money-bill-wave', label: 'Fund Transection' },
]

const titles = {
  dashboard:    { title: 'Dashboard',          sub: 'Welcome back! Here\'s your overview'        },
  profile:      { title: 'My Profile',         sub: 'View and manage your profile info'           },
  directory:    { title: 'Alumni Directory',   sub: 'All approved alumni of ICE Department'       },
  'students-dir':{ title: 'Student Directory', sub: 'All approved students of ICE Department'    },
  events:       { title: 'Events',             sub: 'Upcoming alumni events'                      },
  jobs:         { title: 'Jobs',               sub: 'Browse and post job opportunities'           },
  trainings:    { title: 'Trainings',          sub: 'Available training programs'                 },
  'refer-alumni': { title: 'Refer Alumni',     sub: 'Refer known alumni for admin review'         },
  membership:   { title: 'Membership',         sub: 'Your membership details'                    },
  'fund-transaction': { title: 'Fund Transection', sub: 'Track your fund payments and records'   },
}

const normalizePastJobs = (jobs = []) => {
  let source = jobs

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source)
    } catch (_) {
      source = []
    }
  }

  if (source && !Array.isArray(source) && typeof source === 'object') {
    source = source.past_jobs || source.jobs || source.items || []
  }

  if (!Array.isArray(source)) return []

  return source
    .map((j) => ({
      company: String(j?.company || j?.company_name || j?.organization || j?.org || '').trim(),
      designation: String(j?.designation || j?.role || j?.title || j?.position || '').trim(),
      start_date: j?.start_date || j?.startDate || j?.from || '',
      end_date: j?.end_date || j?.endDate || j?.to || '',
    }))
    .filter((j) => j.company || j.designation)
}

const getAlumniPastJobs = (alumni) => {
  const normalized = normalizePastJobs(alumni?.past_jobs)
  if (normalized.length > 0) return normalized

  // Backward-compatibility with legacy single-entry fields.
  return normalizePastJobs([
    {
      company: alumni?.past_company || alumni?.previous_company || '',
      designation: alumni?.past_designation || alumni?.previous_designation || '',
      start_date: alumni?.past_job_start_date || alumni?.previous_job_start_date || '',
      end_date: alumni?.past_job_end_date || alumni?.previous_job_end_date || '',
    },
  ])
}

const samePastJob = (a, b) => (
  (a.company || '') === (b.company || '') &&
  (a.designation || '') === (b.designation || '') &&
  (a.start_date || '') === (b.start_date || '') &&
  (a.end_date || '') === (b.end_date || '')
)

export default function AlumniDashboard() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const formatEventSchedule = (ev) => [ev?.date, ev?.time].filter(Boolean).join(' · ')

  // Persist user info across refreshes using localStorage
  const alumniInfo = (() => {
    let base = null
    if (location.state?.alumni) {
      localStorage.setItem('alumniUser', JSON.stringify(location.state.alumni))
      base = location.state.alumni
    }
    if (!base) {
      try {
        const stored = localStorage.getItem('alumniUser')
        if (stored) base = JSON.parse(stored)
      } catch (_) {}
    }
    if (!base) {
      base = {
        name: 'Alumni User',
        email: 'alumni@example.com',
        phone: '+8801700000000',
        department: 'ICE',
        student_id: '1804001',
        session: '2018-2022',
        company: 'TechCorp',
        designation: 'Software Engineer',
        status: 'approved',
      }
    }

    return {
      ...base,
      current_job_start_date: base.current_job_start_date || '',
      past_jobs: normalizePastJobs(base.past_jobs),
      photo_url: resolveAvatarUrl(base),
    }
  })()

  const [activeView, setActiveView]   = useState('dashboard')
  const [profile, setProfile]         = useState(alumniInfo)
  const [editMode, setEditMode]       = useState(false)
  const [editData, setEditData]       = useState(alumniInfo)
  const [joinedEvents, setJoinedEvents] = useState([])
  const [enrolledTrainings, setEnrolledTrainings] = useState([])
  const [registeredEventIds, setRegisteredEventIds] = useState([])
  const [showRegisterModal,  setShowRegisterModal]  = useState(false)
  const [registerEvent,      setRegisterEvent]      = useState(null)
  const [registerForm,       setRegisterForm]       = useState({ name:'', student_id:'', session:'', email:'', phone:'', transaction_id:'' })
  const [registerSubmitting, setRegisterSubmitting] = useState(false)
  const [registerMsg,        setRegisterMsg]        = useState('')
  // Training enrollment modal state
  const [showTrainEnrollModal,  setShowTrainEnrollModal]  = useState(false)
  const [enrollTrainingItem,    setEnrollTrainingItem]    = useState(null)
  const [trainEnrollForm,       setTrainEnrollForm]       = useState({ name:'', student_id:'', email:'', phone:'', payment_method:'', transaction_id:'' })
  const [trainEnrollSubmitting, setTrainEnrollSubmitting] = useState(false)
  const [trainEnrollMsg,        setTrainEnrollMsg]        = useState('')
  const [enrolledTrainingIds,   setEnrolledTrainingIds]   = useState([])
  // Alumni "Add Training" modal
  const [showAddTrainModal,  setShowAddTrainModal]  = useState(false)
  const [addTrainForm,       setAddTrainForm]       = useState({ title:'', trainer:'', date:'', seats:'', status:'Upcoming', fee:'', payment_account:'' })
  const [addTrainSubmitting, setAddTrainSubmitting] = useState(false)
  const [addTrainMsg,        setAddTrainMsg]        = useState('')
  // Training attendees modal (only for creator)
  const [showMyTrainAttendeesModal, setShowMyTrainAttendeesModal] = useState(false)
  const [myTrainAttendeesItem,      setMyTrainAttendeesItem]      = useState(null)
  const [myTrainAttendees,          setMyTrainAttendees]          = useState([])
  const [myTrainAttendeesLoading,   setMyTrainAttendeesLoading]   = useState(false)
  const [events,    setEvents]    = useState([])
  const [trainings, setTrainings] = useState([])
  const [allAlumni, setAllAlumni] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [alumniSearch, setAlumniSearch] = useState('')
  const [dashEventSearch, setDashEventSearch] = useState('')
  const [selectedAlumni, setSelectedAlumni] = useState(null)
  const [jobs, setJobs] = useState([])
  const [showJobModal, setShowJobModal] = useState(false)
  const [jobForm, setJobForm] = useState({ title:'', company:'', location:'', type:'Full-time', deadline:'', description:'', apply_link:'' })
  const [jobSubmitting, setJobSubmitting] = useState(false)
  const [jobSubmitMsg, setJobSubmitMsg] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [fundRequests, setFundRequests] = useState([])
  const [myFundTransactions, setMyFundTransactions] = useState([])
  const [fundSubmittingFor, setFundSubmittingFor] = useState(null)
  const [fundFormByRequest, setFundFormByRequest] = useState({})
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false)
  const [referralForm, setReferralForm] = useState({
    referred_name: '',
    referred_email: '',
    referred_phone: '',
    referred_student_id: '',
    referred_session: '',
    referred_department: 'ICE',
    relation_note: '',
  })
  const [referralSubmitting, setReferralSubmitting] = useState(false)
  const [referralMsg, setReferralMsg] = useState('')
  const [myReferrals, setMyReferrals] = useState([])
  const [isCompactDirectory, setIsCompactDirectory] = useState(() => window.innerWidth <= 900)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const selectedAlumniPastJobs = useMemo(() => getAlumniPastJobs(selectedAlumni), [selectedAlumni])

  const profileAvatarUrl = useMemo(() => resolveAvatarUrl(profile), [profile])

  useEffect(() => {
    setAvatarLoadFailed(false)
  }, [profileAvatarUrl])

  useEffect(() => {
    const onResize = () => setIsCompactDirectory(window.innerWidth <= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1024) setMobileMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const lockState = { dashboardLock: true, role: 'alumni' }
    const dashboardPath = '/alumni-dashboard'
    const homePath = '/'
    window.history.replaceState({ dashboardSeed: true, role: 'alumni', view: 'home' }, '', homePath)
    window.history.pushState(lockState, '', dashboardPath)

    const onPopState = () => {
      if (activeView !== 'dashboard') {
        setActiveView('dashboard')
        setMobileMenuOpen(false)
        window.history.pushState(lockState, '', window.location.href)
        return
      }

      setMobileMenuOpen(false)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [activeView])

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false)
  const [seenKeys, setSeenKeys] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`notif_seen_${alumniInfo.id || 'guest'}`) || '[]')) }
    catch { return new Set() }
  })
  const notifRef = useRef(null)

  // Load events, trainings and alumni directory from API
  useEffect(() => {
    getEvents().then(({ ok, data })    => { if (ok) setEvents(data) }).catch(() => {})
    getTrainings().then(({ ok, data }) => { if (ok) setTrainings(data) }).catch(() => {})
    getAlumni().then(({ ok, data })    => {
      if (ok) {
        setAllAlumni((data || []).map((a) => ({
          ...a,
          past_jobs: getAlumniPastJobs(a),
        })))
      }
    }).catch(() => {})
    getStudents().then(({ ok, data })  => { if (ok) setAllStudents(data) }).catch(() => {})
    getJobs().then(({ ok, data })      => { if (ok) setJobs(data) }).catch(() => {})
    getFundRequests({ status: 'open' }).then(({ ok, data }) => { if (ok) setFundRequests(data) }).catch(() => {})
    if (alumniInfo.id) {
      getEnrolledTrainingIds(alumniInfo.id)
        .then(({ ok, data }) => { if (ok) setEnrolledTrainingIds(data) })
        .catch(() => {})
      getRegisteredEventIds(alumniInfo.id)
        .then(({ ok, data }) => { if (ok) setRegisteredEventIds(data) })
        .catch(() => {})
      getTransactions({ alumni_id: alumniInfo.id })
        .then(({ ok, data }) => { if (ok) setMyFundTransactions(data) })
        .catch(() => {})
      getReferralsByAlumni(alumniInfo.id)
        .then(({ ok, data }) => { if (ok) setMyReferrals(Array.isArray(data) ? data : []) })
        .catch(() => {})
    }
  }, [])

  const handleSubmitReferral = async (e) => {
    e.preventDefault()
    if (!alumniInfo.id) return
    if (!referralForm.referred_name.trim() || !referralForm.referred_email.trim()) {
      setReferralMsg('error')
      return
    }

    setReferralSubmitting(true)
    setReferralMsg('')
    try {
      const payload = {
        referred_by_alumni_id: alumniInfo.id,
        ...referralForm,
      }
      const { ok } = await createReferral(payload)
      if (!ok) {
        setReferralMsg('error')
        return
      }

      setReferralMsg('success')
      setReferralForm({
        referred_name: '',
        referred_email: '',
        referred_phone: '',
        referred_student_id: '',
        referred_session: '',
        referred_department: 'ICE',
        relation_note: '',
      })

      const refreshed = await getReferralsByAlumni(alumniInfo.id)
      if (refreshed.ok) setMyReferrals(Array.isArray(refreshed.data) ? refreshed.data : [])
    } catch (_) {
      setReferralMsg('error')
    } finally {
      setReferralSubmitting(false)
    }
  }

  const handleFundInputChange = (requestId, key, value) => {
    setFundFormByRequest(prev => ({
      ...prev,
      [requestId]: {
        payment_method: prev[requestId]?.payment_method || 'bkash',
        amount: prev[requestId]?.amount || '',
        payment_reference: prev[requestId]?.payment_reference || '',
        note: prev[requestId]?.note || '',
        [key]: value,
      }
    }))
  }

  const handleSubmitFundPayment = async (fr) => {
    const form = fundFormByRequest[fr.id] || {}
    if (!form.amount || !form.payment_reference) {
      alert('Please enter amount and transaction/reference id.')
      return
    }
    setFundSubmittingFor(fr.id)
    try {
      const payload = {
        donor: profile.name,
        type: 'Donation',
        amount: Number(form.amount),
        date: new Date().toISOString().slice(0, 10),
        note: form.note || `Paid for request: ${fr.title}`,
        request_id: fr.id,
        alumni_id: alumniInfo.id || null,
        payment_method: form.payment_method || 'bkash',
        payment_reference: form.payment_reference,
        created_by_role: 'alumni',
        status: 'paid',
      }
      const { ok } = await addTransaction(payload)
      if (!ok) {
        alert('Could not submit payment. Please try again.')
        return
      }

      const refreshed = await getTransactions({ alumni_id: alumniInfo.id })
      if (refreshed.ok) setMyFundTransactions(refreshed.data)
      setFundFormByRequest(prev => ({
        ...prev,
        [fr.id]: { payment_method: 'bkash', amount: '', payment_reference: '', note: '' },
      }))
      alert('Payment submitted successfully.')
    } catch (_) {
      alert('Could not submit payment. Please try again.')
    } finally {
      setFundSubmittingFor(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('alumniUser')
    navigate('/')
  }

  const notifications = useMemo(() => [
    ...events.map(e   => ({ key: `event-${e.id}`,    id: e.id,   icon: 'fa-calendar-days',   color: '#0f4ea8', label: 'Event',    title: e.title,                   meta: formatEventSchedule(e) || '' })),
    ...jobs.map(j     => ({ key: `job-${j.id}`,      id: j.id,   icon: 'fa-briefcase',        color: '#0066cc', label: 'Job',      title: `${j.title} — ${j.company}`, meta: j.deadline || '' })),
    ...trainings.map(t=> ({ key: `training-${t.id}`, id: t.id,   icon: 'fa-chalkboard-user',  color: '#22a06b', label: 'Training', title: t.title,                   meta: t.date    || '' })),
  ].sort((a, b) => b.id - a.id), [events, jobs, trainings])

  const unreadCount = useMemo(() => notifications.filter(n => !seenKeys.has(n.key)).length, [notifications, seenKeys])

  const menuUnreadCounts = useMemo(() => ({
    events: notifications.filter((n) => n.key.startsWith('event-') && !seenKeys.has(n.key)).length,
    jobs: notifications.filter((n) => n.key.startsWith('job-') && !seenKeys.has(n.key)).length,
    trainings: notifications.filter((n) => n.key.startsWith('training-') && !seenKeys.has(n.key)).length,
  }), [notifications, seenKeys])

  const markAllRead = () => {
    const all = new Set(notifications.map(n => n.key))
    setSeenKeys(all)
    localStorage.setItem(`notif_seen_${alumniInfo.id || 'guest'}`, JSON.stringify([...all]))
  }

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  useEffect(() => {
    const prefixByView = {
      events: 'event-',
      jobs: 'job-',
      trainings: 'training-',
    }
    const targetPrefix = prefixByView[activeView]
    if (!targetPrefix || notifications.length === 0) return

    setSeenKeys((prev) => {
      const next = new Set(prev)
      let changed = false
      notifications.forEach((n) => {
        if (n.key.startsWith(targetPrefix) && !next.has(n.key)) {
          next.add(n.key)
          changed = true
        }
      })
      if (changed) {
        localStorage.setItem(`notif_seen_${alumniInfo.id || 'guest'}`, JSON.stringify([...next]))
        return next
      }
      return prev
    })
  }, [activeView, notifications, alumniInfo.id])

  const handleSubmitJob = async (e) => {
    e.preventDefault()
    setJobSubmitting(true)
    setJobSubmitMsg('')
    try {
      const payload = { ...jobForm, submitted_by: alumniInfo.id || null }
      const { ok } = await submitJob(payload)
      if (ok) {
        setJobSubmitMsg('success')
        setJobForm({ title:'', company:'', location:'', type:'Full-time', deadline:'', description:'', apply_link:'' })
        setTimeout(() => { setShowJobModal(false); setJobSubmitMsg('') }, 2000)
      } else {
        setJobSubmitMsg('error')
      }
    } catch (_) {
      setJobSubmitMsg('error')
    } finally {
      setJobSubmitting(false)
    }
  }

  const handleSaveProfile = async () => {
    const previousCompany = String(profile.company || '').trim()
    const previousDesignation = String(profile.designation || '').trim()
    const changedCurrentJob =
      previousCompany !== String(editData.company || '').trim() ||
      previousDesignation !== String(editData.designation || '').trim()

    let nextPastJobs = normalizePastJobs(editData.past_jobs)
    if (changedCurrentJob && (previousCompany || previousDesignation)) {
      const movedJob = {
        company: previousCompany,
        designation: previousDesignation,
        start_date: profile.current_job_start_date || '',
        end_date: editData.current_job_start_date || new Date().toISOString().slice(0, 10),
      }
      if (!nextPastJobs.some((j) => samePastJob(j, movedJob))) {
        nextPastJobs = [movedJob, ...nextPastJobs]
      }
    }

    const nextProfile = {
      ...editData,
      current_job_start_date: editData.current_job_start_date || '',
      past_jobs: nextPastJobs,
    }

    setProfile(nextProfile)
    setEditData(nextProfile)
    setEditMode(false)
    if (alumniInfo.id) {
      await updateAlumni(alumniInfo.id, {
        phone:                nextProfile.phone,
        address:              nextProfile.address,
        company:              nextProfile.company,
        designation:          nextProfile.designation,
        current_job_start_date: nextProfile.current_job_start_date || null,
        higher_study:         nextProfile.higher_study,
        bio:                  nextProfile.bio,
        research_interests:   nextProfile.research_interests,
        extracurricular:      nextProfile.extracurricular,
        linkedin:             nextProfile.linkedin,
        github:               nextProfile.github,
        twitter:              nextProfile.twitter,
        website:              nextProfile.website,
        past_jobs:            nextProfile.past_jobs,
      }).catch(() => {})
    }
  }

  const handleProfilePhotoUpload = async () => {
    if (!profilePhotoFile || !alumniInfo.id) return
    if (profile.status !== 'approved') {
      alert('Profile photo can be changed after approval.')
      return
    }

    setProfilePhotoUploading(true)
    try {
      const { ok, data } = await updateAlumniPhoto(alumniInfo.id, profilePhotoFile)
      if (!ok) {
        alert(data?.message || 'Failed to update profile image.')
        return
      }

      const nextProfile = {
        ...profile,
        photo_url: data?.photo_url || profile.photo_url,
        photo: data?.photo || profile.photo,
      }
      setProfile(nextProfile)
      setEditData(nextProfile)
      localStorage.setItem('alumniUser', JSON.stringify(nextProfile))
      setProfilePhotoFile(null)
      setAvatarLoadFailed(false)
      alert('Profile image updated successfully.')
    } catch (_) {
      alert('Failed to update profile image.')
    } finally {
      setProfilePhotoUploading(false)
    }
  }

  const toggleEvent = async (id) => {
    const joined = joinedEvents.includes(id)
    if (joined) {
      setJoinedEvents(prev => prev.filter(e => e !== id))
      if (alumniInfo.id) await leaveEvent(id, alumniInfo.id).catch(() => {})
    } else {
      setJoinedEvents(prev => [...prev, id])
      if (alumniInfo.id) await joinEvent(id, alumniInfo.id).catch(() => {})
    }
  }

  const toggleTraining = async (id) => {
    const training = trainings.find(t => t.id === id)
    const enrolled = enrolledTrainings.includes(id)
    if (!enrolled && training?.status === 'Full') return
    if (enrolled) {
      setEnrolledTrainings(prev => prev.filter(t => t !== id))
      if (alumniInfo.id) await unenrollTraining(id, alumniInfo.id).catch(() => {})
    } else {
      setEnrolledTrainings(prev => [...prev, id])
      if (alumniInfo.id) await enrollTraining(id, alumniInfo.id).catch(() => {})
    }
  }

  const handleAlumniAddTraining = async (e) => {
    e.preventDefault()
    setAddTrainSubmitting(true)
    setAddTrainMsg('')
    try {
      const { ok, data } = await addTraining({
        ...addTrainForm,
        seats: Number(addTrainForm.seats),
        enrolled: 0,
        fee: Number(addTrainForm.fee) || 0,
        created_by: alumniInfo.id || null,
      })
      if (ok) {
        setTrainings(prev => [...prev, {
          ...addTrainForm,
          id: data.id,
          enrolled: 0,
          seats: Number(addTrainForm.seats),
          fee: Number(addTrainForm.fee) || 0,
          created_by: alumniInfo.id || null,
        }])
        setAddTrainMsg('success')
        setAddTrainForm({ title:'', trainer:'', date:'', seats:'', status:'Upcoming', fee:'', payment_account:'' })
        setTimeout(() => { setShowAddTrainModal(false); setAddTrainMsg('') }, 1800)
      } else {
        setAddTrainMsg('error')
      }
    } catch (_) {
      setAddTrainMsg('error')
    } finally {
      setAddTrainSubmitting(false)
    }
  }

  const openMyTrainAttendees = async (tr) => {
    setMyTrainAttendeesItem(tr)
    setMyTrainAttendees([])
    setMyTrainAttendeesLoading(true)
    setShowMyTrainAttendeesModal(true)
    const { ok, data } = await getTrainingAttendees(tr.id)
    if (ok) setMyTrainAttendees(data)
    setMyTrainAttendeesLoading(false)
  }

  const openTrainEnrollModal = (tr) => {
    setEnrollTrainingItem(tr)
    setTrainEnrollForm({
      name:           profile.name       || '',
      student_id:     profile.student_id || '',
      email:          profile.email      || '',
      phone:          profile.phone      || '',
      payment_method: '',
      transaction_id: '',
    })
    setTrainEnrollMsg('')
    setShowTrainEnrollModal(true)
  }

  const handleTrainEnroll = async (e) => {
    e.preventDefault()
    setTrainEnrollSubmitting(true)
    setTrainEnrollMsg('')
    try {
      const payload = { ...trainEnrollForm, alumni_id: alumniInfo.id || null }
      const { ok } = await registerForTraining(enrollTrainingItem.id, payload)
      if (ok) {
        setTrainEnrollMsg('success')
        setEnrolledTrainingIds(prev => [...prev, enrollTrainingItem.id])
        setTrainings(prev => prev.map(t => t.id === enrollTrainingItem.id ? {...t, enrolled: (t.enrolled||0)+1} : t))
        setTimeout(() => { setShowTrainEnrollModal(false); setTrainEnrollMsg('') }, 2200)
      } else {
        setTrainEnrollMsg('error')
      }
    } catch (_) {
      setTrainEnrollMsg('error')
    } finally {
      setTrainEnrollSubmitting(false)
    }
  }

  const openRegisterModal = (ev) => {
    setRegisterEvent(ev)
    setRegisterForm({
      name:           profile.name       || '',
      student_id:     profile.student_id || '',
      session:        profile.session    || '',
      email:          profile.email      || '',
      phone:          profile.phone      || '',
      transaction_id: '',
    })
    setRegisterMsg('')
    setShowRegisterModal(true)
  }

  const handleRegisterForEvent = async (e) => {
    e.preventDefault()
    setRegisterSubmitting(true)
    setRegisterMsg('')
    try {
      const { ok } = await registerForEvent(registerEvent.id, {
        ...registerForm,
        alumni_id: alumniInfo.id || null,
      })
      if (ok) {
        setRegisteredEventIds(prev => [...prev, registerEvent.id])
        setRegisterMsg('success')
        setTimeout(() => { setShowRegisterModal(false); setRegisterMsg('') }, 2200)
      } else {
        setRegisterMsg('error')
      }
    } catch (_) {
      setRegisterMsg('error')
    } finally {
      setRegisterSubmitting(false)
    }
  }

  return (
    <>
    <div className="ad-wrapper">

      {/* ── SIDEBAR ── */}
      <aside className="ad-sidebar">
        <div className="ad-sidebar-logo">
          <div className="ad-logo-circle">
            <img src="/assets/ice-logo-watermark.png" alt="Department Seal" className="ad-logo-seal-image" />
          </div>
          <div>
            <span className="ad-logo-title">AlumniConnect</span>
            <span className="ad-logo-sub">ICE Department</span>
          </div>
        </div>

        <div className="ad-alumni-card">
          <div className="ad-avatar-big">{profile.name[0]}</div>
          <div className="ad-alumni-info">
            <strong>{profile.name}</strong>
            <span>{profile.session}</span>
          </div>
        </div>

        <button
          className="ad-mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(v => !v)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle menu"
        >
          <span><i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i> Menu</span>
          <i className={`fa-solid ${mobileMenuOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
        </button>

        <nav className={`ad-nav${mobileMenuOpen ? ' mobile-open' : ''}`}>
          {sidebarItems.map(item => (
            <button
              key={item.view}
              className={`ad-nav-btn${activeView === item.view ? ' active' : ''}`}
              onClick={() => {
                setActiveView(item.view)
                setMobileMenuOpen(false)
              }}
            >
              <i className={`fa-solid ${item.icon}`}></i>
              {item.label}
              {(item.view === 'events' || item.view === 'jobs' || item.view === 'trainings') && menuUnreadCounts[item.view] > 0 && (
                <span style={{marginLeft:'auto',background:'#d7f4ff',color:'#0f4ea8',fontSize:11,fontWeight:700,padding:'1px 8px',borderRadius:20}}>
                  {menuUnreadCounts[item.view] > 99 ? '99+' : menuUnreadCounts[item.view]}
                </span>
              )}
            </button>
          ))}
        </nav>

      </aside>

      {/* ── MAIN ── */}
      <div className="ad-main">

        {/* Topbar */}
        <div className="ad-topbar">
          <div>
            <h1>{titles[activeView].title}</h1>
            <p>{titles[activeView].sub}</p>
          </div>
          <div className="ad-topbar-right">
            {/* Notification Bell */}
            <div className="notif-bell-wrap" ref={notifRef}>
              <button className="notif-bell-btn" onClick={() => { setNotifOpen(o => { if (!o) markAllRead(); return !o }) }}>
                <i className="fa-solid fa-bell"></i>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <div className="notif-header-left">
                      Notifications
                      {unreadCount > 0 && <span className="notif-unread-pill">{unreadCount} new</span>}
                    </div>
                    <button className="notif-close-btn" onClick={() => setNotifOpen(false)}><i className="fa-solid fa-xmark"></i></button>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0
                      ? <div className="notif-empty"><i className="fa-regular fa-bell-slash" style={{fontSize:28,marginBottom:8,display:'block'}}></i>No notifications yet</div>
                      : notifications.map(n => (
                          <div key={n.key} className={`notif-item${seenKeys.has(n.key) ? '' : ' unread'}`}>
                            <div className="notif-icon" style={{background: n.color + '18', color: n.color}}>
                              <i className={`fa-solid ${n.icon}`}></i>
                            </div>
                            <div className="notif-body">
                              <span className="notif-label">{n.label}</span>
                              <p className="notif-title">{n.title}</p>
                              {n.meta && <span className="notif-meta">{n.meta}</span>}
                            </div>
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>
            {(profileAvatarUrl && !avatarLoadFailed)
              ? <img src={profileAvatarUrl} alt={profile.name} className="ad-topbar-avatar" style={{objectFit:'cover'}} onError={() => setAvatarLoadFailed(true)} />
              : <div className="ad-topbar-avatar">{profile.name[0]}</div>
            }
            <div className="ad-topbar-info">
              <strong>{profile.name}</strong>
              <span className={`ad-status-dot ${profile.status === 'approved' ? 'approved' : 'pending'}`}>
                {profile.status === 'approved' ? '✔ Active Member' : '⏳ Pending Approval'}
              </span>
            </div>
            <button onClick={handleLogout} style={{
              display:'flex', alignItems:'center', gap:7,
              background:'#ffe0e0', color:'#8b1a1a',
              border:'none', padding:'9px 16px', borderRadius:25,
              fontWeight:600, fontSize:13, cursor:'pointer',
              fontFamily:'Inter,sans-serif', transition:'0.2s', flexShrink:0,
              marginLeft:8
            }}
            onMouseEnter={e=>e.currentTarget.style.background='#ffb3b3'}
            onMouseLeave={e=>e.currentTarget.style.background='#ffe0e0'}>
              <i className="fa-solid fa-right-from-bracket"></i> Logout
            </button>
          </div>
        </div>

        <div className="ad-content">

          {/* ══ DASHBOARD ══ */}
          {activeView === 'dashboard' && (
            <>
              {/* Stats */}
              <div className="ad-stat-grid">
                <div className="ad-stat-card">
                  <div className="ad-stat-icon purple"><i className="fa-solid fa-id-card"></i></div>
                  <div className="ad-stat-info">
                    <h3>{profile.status === 'approved' ? 'Active' : 'Pending'}</h3>
                    <p>Membership Status</p>
                  </div>
                </div>
                <div className="ad-stat-card" style={{cursor:'pointer'}} onClick={() => setActiveView('directory')}>
                  <div className="ad-stat-icon orange"><i className="fa-solid fa-user-graduate"></i></div>
                  <div className="ad-stat-info">
                    <h3>{allAlumni.length}</h3>
                    <p>Total Alumni</p>
                  </div>
                </div>
                <div className="ad-stat-card">
                  <div className="ad-stat-icon blue"><i className="fa-solid fa-users"></i></div>
                  <div className="ad-stat-info">
                    <h3>{allStudents.length}</h3>
                    <p>Total Students</p>
                  </div>
                </div>
                <div className="ad-stat-card">
                  <div className="ad-stat-icon pink"><i className="fa-solid fa-calendar-check"></i></div>
                  <div className="ad-stat-info">
                    <h3>{registeredEventIds.length}</h3>
                    <p>Events Joined</p>
                  </div>
                </div>
                <div className="ad-stat-card" style={{cursor:'pointer'}} onClick={() => setActiveView('jobs')}>
                  <div className="ad-stat-icon purple"><i className="fa-solid fa-briefcase"></i></div>
                  <div className="ad-stat-info">
                    <h3>{jobs.length}</h3>
                    <p>Jobs Available</p>
                  </div>
                </div>
                <div className="ad-stat-card">
                  <div className="ad-stat-icon green"><i className="fa-solid fa-book-open"></i></div>
                  <div className="ad-stat-info">
                    <h3>{enrolledTrainingIds.length}</h3>
                    <p>Trainings Enrolled</p>
                  </div>
                </div>
                <div className="ad-stat-card">
                  <div className="ad-stat-icon blue"><i className="fa-solid fa-graduation-cap"></i></div>
                  <div className="ad-stat-info">
                    <h3>{profile.session}</h3>
                    <p>Batch / Session</p>
                  </div>
                </div>
              </div>

              {/* Profile quick view */}
              <div className="ad-section-title">
                <i className="fa-solid fa-user" style={{color:'#00a3a3'}}></i> Quick Profile
              </div>
              <div className="ad-profile-card">
                {(profileAvatarUrl && !avatarLoadFailed)
                  ? <img src={profileAvatarUrl} alt={profile.name} className="ad-profile-avatar" style={{objectFit:'cover'}} onError={() => setAvatarLoadFailed(true)} />
                  : <div className="ad-profile-avatar">{profile.name[0]}</div>
                }
                <div className="ad-profile-details">
                  <div className="ad-profile-row"><span>Name</span><strong>{profile.name}</strong></div>
                  <div className="ad-profile-row"><span>Student ID</span><strong>{profile.student_id || '—'}</strong></div>
                  <div className="ad-profile-row"><span>Email</span><strong>{profile.email}</strong></div>
                  <div className="ad-profile-row"><span>Department</span><strong>{profile.department}</strong></div>
                  <div className="ad-profile-row"><span>Session</span><strong>{profile.session}</strong></div>
                  <div className="ad-profile-row"><span>Organization</span><strong>{profile.company}</strong></div>
                  <div className="ad-profile-row"><span>Designation</span><strong>{profile.designation}</strong></div>
                </div>
                <button className="ad-btn-edit" onClick={() => { setEditData(profile); setActiveView('profile'); setEditMode(true) }}>
                  <i className="fa-solid fa-pen"></i> Edit Profile
                </button>
              </div>

              {/* Upcoming events */}
              <div className="ad-section-title" style={{justifyContent:'space-between',flexWrap:'wrap'}}>
                <span style={{display:'flex',alignItems:'center',gap:10}}>
                  <i className="fa-solid fa-calendar-days" style={{color:'#00a3a3'}}></i> Upcoming Events
                  <span className="ad-badge-count">{events.filter(ev => ev.audience !== 'students').length}</span>
                </span>
                <span style={{position:'relative',display:'flex',alignItems:'center'}}>
                  <i className="fa-solid fa-magnifying-glass" style={{position:'absolute',left:10,color:'#00a3a3',fontSize:13,pointerEvents:'none'}}></i>
                  <input
                    type="text"
                    placeholder="Search events…"
                    value={dashEventSearch}
                    onChange={e => setDashEventSearch(e.target.value)}
                    style={{paddingLeft:30,paddingRight:10,paddingTop:6,paddingBottom:6,border:'1.5px solid #c5dbf5',borderRadius:20,fontSize:13,outline:'none',fontFamily:'Inter,sans-serif',width:180}}
                  />
                </span>
              </div>
              <div className="ad-events-grid">
                {events.filter(ev => ev.audience !== 'students' && (!dashEventSearch.trim() || ev.title.toLowerCase().includes(dashEventSearch.trim().toLowerCase()))).slice().sort((a, b) => b.id - a.id).slice(0, dashEventSearch.trim() ? undefined : 2).map(ev => (
                  <div key={ev.id} className="ad-event-card">
                    <div className="ad-event-date"><i className="fa-solid fa-calendar"></i> {formatEventSchedule(ev)}</div>
                    <h4>{ev.title}</h4>
                    <p><i className="fa-solid fa-location-dot"></i> {ev.location}</p>
                    {ev.audience !== 'students' && (
                    <button
                      className={`ad-btn-join${registeredEventIds.includes(ev.id) ? ' joined' : ''}`}
                      onClick={() => !registeredEventIds.includes(ev.id) && openRegisterModal(ev)}
                      disabled={registeredEventIds.includes(ev.id)}
                    >
                      {registeredEventIds.includes(ev.id) ? '✔ Registered' : 'Register'}
                    </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{textAlign:'center',marginBottom:8}}>
                <button
                  onClick={() => setActiveView('events')}
                  style={{background:'none',border:'1.5px solid #00a3a3',color:'#00a3a3',borderRadius:20,padding:'7px 28px',fontSize:14,fontWeight:600,cursor:'pointer',transition:'0.2s'}}
                  onMouseOver={e=>{e.currentTarget.style.background='#00a3a3';e.currentTarget.style.color='#fff'}}
                  onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#00a3a3'}}
                >
                  <i className="fa-solid fa-calendar-days" style={{marginRight:7}}></i>Show More Events
                </button>
              </div>
            </>
          )}

          {/* ══ ALUMNI DIRECTORY ══ */}
          {activeView === 'directory' && (() => {
            const filtered = allAlumni.filter(a => !alumniSearch || JSON.stringify(a).toLowerCase().includes(alumniSearch.toLowerCase()))
            const cols = isCompactDirectory ? '1fr' : '44px 1fr 150px 1fr 110px'
            return (
            <>
              {/* Header bar */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:16,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#0f4ea8,#00a3a3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="fa-solid fa-user-graduate" style={{color:'white',fontSize:18}}></i>
                  </div>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:'#1a0035'}}>Alumni Directory</div>
                    <div style={{fontSize:12,color:'#999',marginTop:1}}>
                      {filtered.length} of {allAlumni.length} alumni &nbsp;·&nbsp; ICE Dept, University of Rajshahi
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,background:'white',borderRadius:12,padding:'10px 16px',boxShadow:'0 2px 10px rgba(95,44,130,0.08)',minWidth:260,border:'1.5px solid #f0eaff'}}>
                  <i className="fa-solid fa-magnifying-glass" style={{color:'#00a3a3',fontSize:13,flexShrink:0}}></i>
                  <input
                    value={alumniSearch}
                    onChange={e => setAlumniSearch(e.target.value)}
                    placeholder="Search by name, batch/session, company…"
                    style={{border:'none',outline:'none',flex:1,fontSize:13,fontFamily:'Inter,sans-serif',color:'#333',background:'transparent'}}
                  />
                  {alumniSearch && (
                    <button onClick={() => setAlumniSearch('')} style={{border:'none',background:'#f3eeff',color:'#0f4ea8',borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:12,fontFamily:'Inter,sans-serif',lineHeight:1.4}}>✕</button>
                  )}
                </div>
              </div>

              {/* Table card */}
              <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 4px 28px rgba(95,44,130,0.10)',border:'1px solid #ede8f8'}}>

                {/* Head */}
                {!isCompactDirectory && <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)',display:'grid',gridTemplateColumns:cols,gap:0,padding:'13px 24px',alignItems:'center'}}>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.5px',textAlign:'center'}}>#</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.6px'}}>Alumni</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.6px'}}>Batch / Session</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.6px'}}>Contact</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.6px',textAlign:'center'}}>Action</span>
                </div>}

                {/* Empty state */}
                {filtered.length === 0 && (
                  <div style={{textAlign:'center',padding:'60px 0',color:'#ccc'}}>
                    <i className="fa-solid fa-users-slash" style={{fontSize:38,marginBottom:12,display:'block',color:'#e0d5f5'}}></i>
                    <p style={{fontSize:14,color:'#aaa'}}>No alumni found for &ldquo;{alumniSearch}&rdquo;</p>
                  </div>
                )}

                {/* Rows */}
                {filtered.map((a, idx) => (
                  <div key={a.id}
                    style={{
                      display:'grid',gridTemplateColumns:cols,gap:0,
                      padding:isCompactDirectory ? '16px' : '15px 24px',alignItems:isCompactDirectory ? 'stretch' : 'center',cursor:'pointer',
                      borderBottom: idx < filtered.length - 1 ? '1px solid #f4f0fb' : 'none',
                      background: idx % 2 === 0 ? '#fff' : '#fdfbff',
                      transition:'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='#f5eeff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fdfbff'}
                    onClick={() => setSelectedAlumni({
                      ...a,
                      past_jobs: getAlumniPastJobs(a),
                    })}
                  >
                    {/* # */}
                    <div style={{textAlign:isCompactDirectory ? 'left' : 'center',fontSize:12,fontWeight:600,color:'#d0c0e8',marginBottom:isCompactDirectory ? 8 : 0}}>#{idx + 1}</div>

                    {/* Alumni */}
                    <div style={{display:'flex',alignItems:'center',gap:13,minWidth:0,paddingRight:isCompactDirectory ? 0 : 12,marginBottom:isCompactDirectory ? 10 : 0}}>
                      <div style={{
                        width:46,height:46,borderRadius:'50%',flexShrink:0,overflow:'hidden',
                        background:'linear-gradient(135deg,#00a3a3,#0f4ea8)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:18,fontWeight:800,color:'white',
                        boxShadow:'0 3px 10px rgba(95,44,130,0.22)',
                      }}>
                        {resolveAvatarUrl(a)
                          ? <img src={resolveAvatarUrl(a)} alt={a.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : a.name[0].toUpperCase()
                        }
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#1a0035',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.3}}>{a.name}</div>
                        <div style={{fontSize:12,color:'#00a3a3',fontWeight:600,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {[a.designation, a.company].filter(Boolean).join(' · ') || 'ICE Alumni'}
                        </div>
                        <div style={{fontSize:11,color:'#c8b8e0',marginTop:2}}>ID: {a.student_id || '—'}</div>
                      </div>
                    </div>

                    {/* Batch */}
                    <div style={{paddingRight:isCompactDirectory ? 0 : 12,marginBottom:isCompactDirectory ? 10 : 0}}>
                      <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#f0eaff',borderRadius:8,padding:'4px 10px'}}>
                        <i className="fa-solid fa-graduation-cap" style={{color:'#7c3aed',fontSize:10}}></i>
                        <span style={{fontSize:12,fontWeight:700,color:'#0f4ea8'}}>{a.department}</span>
                      </div>
                      <div style={{fontSize:12,color:'#888',marginTop:5,paddingLeft:1,fontWeight:500}}>{a.session}</div>
                    </div>

                    {/* Contact */}
                    <div style={{paddingRight:isCompactDirectory ? 0 : 12,marginBottom:isCompactDirectory ? 10 : 0}}>
                      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                        <span style={{width:22,height:22,borderRadius:6,background:'#f3eeff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <i className="fa-solid fa-envelope" style={{color:'#00a3a3',fontSize:10}}></i>
                        </span>
                        <span style={{fontSize:12,color:'#444',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.email}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <span style={{width:22,height:22,borderRadius:6,background:'#f3eeff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <i className="fa-solid fa-phone" style={{color:'#00a3a3',fontSize:10}}></i>
                        </span>
                        <span style={{fontSize:12,color:'#444'}}>{a.phone || '—'}</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:isCompactDirectory ? 'flex-start' : 'center',gap:7}}>
                      <span style={{background:'#e6f9ef',color:'#15803d',borderRadius:20,padding:'3px 11px',fontSize:11,fontWeight:700,letterSpacing:'0.2px'}}>
                        ✔ Active
                      </span>
                      <button style={{
                        background:'linear-gradient(135deg,#0f4ea8,#00a3a3)',color:'white',
                        border:'none',borderRadius:20,padding:'6px 14px',
                        fontSize:11,fontWeight:700,cursor:'pointer',
                        display:'flex',alignItems:'center',gap:5,
                        boxShadow:'0 3px 10px rgba(95,44,130,0.28)',
                        fontFamily:'Inter,sans-serif',letterSpacing:'0.2px',
                      }}>
                        <i className="fa-solid fa-eye" style={{fontSize:10}}></i> View Profile
                      </button>
                    </div>
                  </div>
                ))}

                {/* Footer */}
                {filtered.length > 0 && (
                  <div style={{background:'#faf8ff',borderTop:'1px solid #ede8f8',padding:'11px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:isCompactDirectory ? 'wrap' : 'nowrap'}}>
                    <span style={{fontSize:12,color:'#aaa'}}>
                      Showing <strong style={{color:'#0f4ea8'}}>{filtered.length}</strong> of <strong style={{color:'#0f4ea8'}}>{allAlumni.length}</strong> alumni
                    </span>
                    <span style={{fontSize:11,color:'#ccc',letterSpacing:'0.3px'}}>ICE DEPARTMENT · UNIVERSITY OF RAJSHAHI</span>
                  </div>
                )}
              </div>
            </>
          )})()}

          {/* ══ PROFILE ══ */}
          {activeView === 'students-dir' && (() => {
            const cols = isCompactDirectory ? '1fr' : '44px 1fr 150px 1fr 110px'
            const filtered = allStudents.filter(a => !alumniSearch || JSON.stringify(a).toLowerCase().includes(alumniSearch.toLowerCase()))
            return (
            <>
              {/* Header bar */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:16,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#1a6eb5,#4aa3e0)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="fa-solid fa-users" style={{color:'white',fontSize:18}}></i>
                  </div>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:'#1a0035'}}>Student Directory</div>
                    <div style={{fontSize:12,color:'#999',marginTop:1}}>
                      {filtered.length} of {allStudents.length} students &nbsp;·&nbsp; ICE Dept, University of Rajshahi
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,background:'white',borderRadius:12,padding:'10px 16px',boxShadow:'0 2px 10px rgba(95,44,130,0.08)',minWidth:260,border:'1.5px solid #f0eaff'}}>
                  <i className="fa-solid fa-magnifying-glass" style={{color:'#00a3a3',fontSize:13,flexShrink:0}}></i>
                  <input
                    value={alumniSearch}
                    onChange={e => setAlumniSearch(e.target.value)}
                    placeholder="Search by name, batch/session, ID…"
                    style={{border:'none',outline:'none',flex:1,fontSize:13,fontFamily:'Inter,sans-serif',color:'#333',background:'transparent'}}
                  />
                  {alumniSearch && (
                    <button onClick={() => setAlumniSearch('')} style={{border:'none',background:'#f3eeff',color:'#0f4ea8',borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:12,fontFamily:'Inter,sans-serif',lineHeight:1.4}}>✕</button>
                  )}
                </div>
              </div>

              {/* Table card */}
              <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 4px 28px rgba(95,44,130,0.10)',border:'1px solid #ede8f8'}}>
                {/* Head */}
                {!isCompactDirectory && <div style={{background:'linear-gradient(135deg,#1a6eb5,#4aa3e0)',display:'grid',gridTemplateColumns:cols,gap:0,padding:'13px 24px',alignItems:'center'}}>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.5px',textAlign:'center'}}>#</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.6px'}}>Student</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.6px'}}>Batch / Session</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.6px'}}>Contact</span>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.6px',textAlign:'center'}}>Status</span>
                </div>}

                {/* Empty state */}
                {filtered.length === 0 && (
                  <div style={{textAlign:'center',padding:'60px 0',color:'#ccc'}}>
                    <i className="fa-solid fa-user-graduate" style={{fontSize:38,marginBottom:12,display:'block',color:'#e0d5f5'}}></i>
                    <p style={{fontSize:14,color:'#aaa'}}>{alumniSearch ? `No students found for "${alumniSearch}"` : 'No approved students yet.'}</p>
                  </div>
                )}

                {/* Rows */}
                {filtered.map((a, idx) => (
                  <div key={a.id}
                    style={{
                      display:'grid',gridTemplateColumns:cols,gap:0,
                      padding:isCompactDirectory ? '16px' : '15px 24px',alignItems:isCompactDirectory ? 'stretch' : 'center',
                      borderBottom: idx < filtered.length - 1 ? '1px solid #f4f0fb' : 'none',
                      background: idx % 2 === 0 ? '#fff' : '#fdfbff',
                      transition:'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fdfbff'}
                  >
                    <div style={{textAlign:isCompactDirectory ? 'left' : 'center',fontSize:12,fontWeight:600,color:'#d0c0e8',marginBottom:isCompactDirectory ? 8 : 0}}>#{idx + 1}</div>
                    <div style={{display:'flex',alignItems:'center',gap:13,minWidth:0,paddingRight:isCompactDirectory ? 0 : 12,marginBottom:isCompactDirectory ? 10 : 0}}>
                      <div style={{
                        width:46,height:46,borderRadius:'50%',flexShrink:0,overflow:'hidden',
                        background:'linear-gradient(135deg,#1a6eb5,#4aa3e0)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:18,fontWeight:800,color:'white',
                        boxShadow:'0 3px 10px rgba(26,110,181,0.22)',
                      }}>
                        {resolveAvatarUrl(a)
                          ? <img src={resolveAvatarUrl(a)} alt={a.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : a.name[0].toUpperCase()
                        }
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#1a0035',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.3}}>{a.name}</div>
                        <div style={{fontSize:12,color:'#1a6eb5',fontWeight:600,marginTop:2}}>ICE Student</div>
                        <div style={{fontSize:11,color:'#c8b8e0',marginTop:2}}>ID: {a.student_id || '—'}</div>
                      </div>
                    </div>
                    <div style={{paddingRight:isCompactDirectory ? 0 : 12,marginBottom:isCompactDirectory ? 10 : 0}}>
                      <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#e0f0ff',borderRadius:8,padding:'4px 10px'}}>
                        <i className="fa-solid fa-graduation-cap" style={{color:'#1a6eb5',fontSize:10}}></i>
                        <span style={{fontSize:12,fontWeight:700,color:'#1a6eb5'}}>{a.department}</span>
                      </div>
                      <div style={{fontSize:12,color:'#888',marginTop:5,paddingLeft:1,fontWeight:500}}>{a.session}</div>
                    </div>
                    <div style={{paddingRight:isCompactDirectory ? 0 : 12,marginBottom:isCompactDirectory ? 10 : 0}}>
                      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                        <span style={{width:22,height:22,borderRadius:6,background:'#e0f0ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <i className="fa-solid fa-envelope" style={{color:'#1a6eb5',fontSize:10}}></i>
                        </span>
                        <span style={{fontSize:12,color:'#444',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.email}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <span style={{width:22,height:22,borderRadius:6,background:'#e0f0ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <i className="fa-solid fa-phone" style={{color:'#1a6eb5',fontSize:10}}></i>
                        </span>
                        <span style={{fontSize:12,color:'#444'}}>{a.phone || '—'}</span>
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:isCompactDirectory ? 'flex-start' : 'center'}}>
                      <span style={{background:'#e6f9ef',color:'#15803d',borderRadius:20,padding:'3px 11px',fontSize:11,fontWeight:700,letterSpacing:'0.2px'}}>✔ Active</span>
                    </div>
                  </div>
                ))}

                {/* Footer */}
                {filtered.length > 0 && (
                  <div style={{background:'#f5f9ff',borderTop:'1px solid #daeeff',padding:'11px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:isCompactDirectory ? 'wrap' : 'nowrap'}}>
                    <span style={{fontSize:12,color:'#aaa'}}>
                      Showing <strong style={{color:'#1a6eb5'}}>{filtered.length}</strong> of <strong style={{color:'#1a6eb5'}}>{allStudents.length}</strong> students
                    </span>
                    <span style={{fontSize:11,color:'#ccc',letterSpacing:'0.3px'}}>ICE DEPARTMENT · UNIVERSITY OF RAJSHAHI</span>
                  </div>
                )}
              </div>
            </>
          )})()}

          {/* ══ PROFILE ══ */}
          {activeView === 'profile' && (
            <>
              <div className="ad-section-title">
                <i className="fa-solid fa-user-circle" style={{color:'#00a3a3'}}></i> My Profile
              </div>
              <div className="ad-profile-card big">
                {(profileAvatarUrl && !avatarLoadFailed)
                  ? <img src={profileAvatarUrl} alt={profile.name} className="ad-profile-avatar large" style={{objectFit:'cover'}} onError={() => setAvatarLoadFailed(true)} />
                  : <div className="ad-profile-avatar large">{profile.name[0]}</div>
                }
                {!editMode ? (
                  <>
                    <div className="ad-profile-details">
                      <div className="ad-profile-row"><span>Full Name</span><strong>{profile.name}</strong></div>
                      <div className="ad-profile-row"><span>Student ID</span><strong>{profile.student_id || '—'}</strong></div>
                      <div className="ad-profile-row"><span>Email</span><strong>{profile.email}</strong></div>
                      <div className="ad-profile-row"><span>Phone</span><strong>{profile.phone}</strong></div>
                      <div className="ad-profile-row"><span>Address</span><strong>{profile.address || '—'}</strong></div>
                      <div className="ad-profile-row"><span>Department</span><strong>{profile.department}</strong></div>
                      <div className="ad-profile-row"><span>Session</span><strong>{profile.session}</strong></div>
                      <div className="ad-profile-row"><span>Organization</span><strong>{profile.company}</strong></div>
                      <div className="ad-profile-row"><span>Designation</span><strong>{profile.designation}</strong></div>
                      {profile.current_job_start_date && (
                        <div className="ad-profile-row"><span>Current Job Start</span><strong>{profile.current_job_start_date}</strong></div>
                      )}
                      {Array.isArray(profile.past_jobs) && profile.past_jobs.length > 0 && (
                        <div className="ad-profile-row ad-profile-row-block">
                          <span>Past Experience</span>
                          <strong className="ad-past-jobs-list">
                            {profile.past_jobs.map((job, idx) => (
                              <div key={`${job.company}-${job.designation}-${idx}`} className="ad-past-job-item">
                                <div className="ad-past-job-title">{job.designation || 'Role'} {job.company ? `@ ${job.company}` : ''}</div>
                                <div className="ad-past-job-dates">{job.start_date || 'N/A'} - {job.end_date || 'Present'}</div>
                              </div>
                            ))}
                          </strong>
                        </div>
                      )}
                      {profile.higher_study && <div className="ad-profile-row"><span>Higher Study</span><strong>{profile.higher_study}</strong></div>}
                      {profile.bio && <div className="ad-profile-row"><span>About Me</span><strong style={{whiteSpace:'pre-wrap'}}>{profile.bio}</strong></div>}
                      {profile.research_interests && <div className="ad-profile-row"><span>Research Interests</span><strong>{profile.research_interests}</strong></div>}
                      {profile.extracurricular && <div className="ad-profile-row"><span>Extracurricular</span><strong>{profile.extracurricular}</strong></div>}
                      {(profile.linkedin||profile.github||profile.twitter||profile.website) && (
                        <div className="ad-profile-row">
                          <span>Social Links</span>
                          <strong style={{display:'flex',flexWrap:'wrap',gap:8}}>
                            {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" style={{color:'#0077b5',textDecoration:'none'}}><i className="fa-brands fa-linkedin"></i> LinkedIn</a>}
                            {profile.github   && <a href={profile.github}   target="_blank" rel="noreferrer" style={{color:'#333',textDecoration:'none'}}><i className="fa-brands fa-github"></i> GitHub</a>}
                            {profile.twitter  && <a href={profile.twitter}  target="_blank" rel="noreferrer" style={{color:'#1da1f2',textDecoration:'none'}}><i className="fa-brands fa-twitter"></i> Twitter</a>}
                            {profile.website  && <a href={profile.website}  target="_blank" rel="noreferrer" style={{color:'#00a3a3',textDecoration:'none'}}><i className="fa-solid fa-globe"></i> Website</a>}
                          </strong>
                        </div>
                      )}
                      <div className="ad-profile-row">
                        <span>Status</span>
                        <strong>
                          <span className={`ad-badge ${profile.status}`}>
                            {profile.status === 'approved' ? '✔ Active Member' : '⏳ Pending'}
                          </span>
                        </strong>
                      </div>
                    </div>
                    <button className="ad-btn-edit" onClick={() => { setEditData(profile); setEditMode(true) }}>
                      <i className="fa-solid fa-pen"></i> Edit Profile
                    </button>
                  </>
                ) : (
                  <div className="ad-edit-form">
                    <div className="ad-form-row">
                      <label>Profile Image</label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="ad-btn-save"
                        onClick={handleProfilePhotoUpload}
                        disabled={!profilePhotoFile || profilePhotoUploading || profile.status !== 'approved'}
                        style={{marginTop:8}}
                      >
                        {profilePhotoUploading ? 'Uploading...' : <><i className="fa-solid fa-image"></i> Upload New Photo</>}
                      </button>
                    </div>
                    <div className="ad-form-row">
                      <label>Phone</label>
                      <input value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
                    </div>
                    <div className="ad-form-row">
                      <label>Address</label>
                      <input value={editData.address||''} onChange={e => setEditData({...editData, address: e.target.value})} placeholder="e.g. Rajshahi, Bangladesh" />
                    </div>
                    <div className="ad-form-row">
                      <label>Organization</label>
                      <input value={editData.company} onChange={e => setEditData({...editData, company: e.target.value})} />
                    </div>
                    <div className="ad-form-row">
                      <label>Designation</label>
                      <input value={editData.designation||''} onChange={e => setEditData({...editData, designation: e.target.value})} />
                    </div>
                    <div className="ad-form-row">
                      <label>Current Job Start Date</label>
                      <input type="date" value={editData.current_job_start_date || ''} onChange={e => setEditData({...editData, current_job_start_date: e.target.value})} />
                    </div>
                    <div style={{margin:'10px 0 4px',fontWeight:700,fontSize:13,color:'#0f4ea8',letterSpacing:'0.3px'}}>Past Job / Experience</div>
                    {(editData.past_jobs || []).map((job, idx) => (
                      <div className="ad-exp-item" key={`past-job-${idx}`}>
                        <div className="ad-form-row">
                          <label>Company</label>
                          <input
                            value={job.company || ''}
                            onChange={e => setEditData(prev => {
                              const next = [...(prev.past_jobs || [])]
                              next[idx] = { ...next[idx], company: e.target.value }
                              return { ...prev, past_jobs: next }
                            })}
                            placeholder="e.g. Grameenphone"
                          />
                        </div>
                        <div className="ad-form-row">
                          <label>Designation</label>
                          <input
                            value={job.designation || ''}
                            onChange={e => setEditData(prev => {
                              const next = [...(prev.past_jobs || [])]
                              next[idx] = { ...next[idx], designation: e.target.value }
                              return { ...prev, past_jobs: next }
                            })}
                            placeholder="e.g. Network Engineer"
                          />
                        </div>
                        <div className="ad-exp-dates">
                          <div className="ad-form-row">
                            <label>Start Date</label>
                            <input
                              type="date"
                              value={job.start_date || ''}
                              onChange={e => setEditData(prev => {
                                const next = [...(prev.past_jobs || [])]
                                next[idx] = { ...next[idx], start_date: e.target.value }
                                return { ...prev, past_jobs: next }
                              })}
                            />
                          </div>
                          <div className="ad-form-row">
                            <label>End Date</label>
                            <input
                              type="date"
                              value={job.end_date || ''}
                              onChange={e => setEditData(prev => {
                                const next = [...(prev.past_jobs || [])]
                                next[idx] = { ...next[idx], end_date: e.target.value }
                                return { ...prev, past_jobs: next }
                              })}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ad-btn-remove-exp"
                          onClick={() => setEditData(prev => ({
                            ...prev,
                            past_jobs: (prev.past_jobs || []).filter((_, i) => i !== idx),
                          }))}
                        >
                          <i className="fa-solid fa-trash"></i> Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="ad-btn-add-exp"
                      onClick={() => setEditData(prev => ({
                        ...prev,
                        past_jobs: [...(prev.past_jobs || []), { company: '', designation: '', start_date: '', end_date: '' }],
                      }))}
                    >
                      <i className="fa-solid fa-plus"></i> Add Past Experience
                    </button>
                    <div className="ad-form-row">
                      <label>Higher Study</label>
                      <input value={editData.higher_study||''} onChange={e => setEditData({...editData, higher_study: e.target.value})} placeholder="e.g. MSc in Data Science, University of X" />
                    </div>
                    <div className="ad-form-row">
                      <label>About Me</label>
                      <textarea rows={3} value={editData.bio||''} onChange={e => setEditData({...editData, bio: e.target.value})} placeholder="A short description about yourself…" style={{resize:'vertical',fontFamily:'Inter,sans-serif',fontSize:14,padding:'10px 14px',border:'1.5px solid #e0d5f5',borderRadius:10,outline:'none',width:'100%',color:'#333'}} />
                    </div>
                    <div className="ad-form-row">
                      <label>Research Interests</label>
                      <input value={editData.research_interests||''} onChange={e => setEditData({...editData, research_interests: e.target.value})} placeholder="e.g. Machine Learning, IoT, NLP…" />
                    </div>
                    <div className="ad-form-row">
                      <label>Extracurricular</label>
                      <input value={editData.extracurricular||''} onChange={e => setEditData({...editData, extracurricular: e.target.value})} placeholder="e.g. Debate Club, Programming Contest…" />
                    </div>
                    <div style={{margin:'8px 0 4px',fontWeight:700,fontSize:13,color:'#0f4ea8',letterSpacing:'0.3px'}}>Social Links</div>
                    <div className="ad-form-row">
                      <label><i className="fa-brands fa-linkedin" style={{color:'#0077b5'}}></i> LinkedIn</label>
                      <input value={editData.linkedin||''} onChange={e => setEditData({...editData, linkedin: e.target.value})} placeholder="https://linkedin.com/in/username" />
                    </div>
                    <div className="ad-form-row">
                      <label><i className="fa-brands fa-github" style={{color:'#333'}}></i> GitHub</label>
                      <input value={editData.github||''} onChange={e => setEditData({...editData, github: e.target.value})} placeholder="https://github.com/username" />
                    </div>
                    <div className="ad-form-row">
                      <label><i className="fa-brands fa-twitter" style={{color:'#1da1f2'}}></i> Twitter</label>
                      <input value={editData.twitter||''} onChange={e => setEditData({...editData, twitter: e.target.value})} placeholder="https://twitter.com/username" />
                    </div>
                    <div className="ad-form-row">
                      <label><i className="fa-solid fa-globe" style={{color:'#00a3a3'}}></i> Website</label>
                      <input value={editData.website||''} onChange={e => setEditData({...editData, website: e.target.value})} placeholder="https://yourwebsite.com" />
                    </div>
                    <div className="ad-form-actions">
                      <button className="ad-btn-save" onClick={handleSaveProfile}><i className="fa-solid fa-floppy-disk"></i> Save</button>
                      <button className="ad-btn-cancel" onClick={() => setEditMode(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══ EVENTS ══ */}
          {activeView === 'events' && (
            <>
              <div className="ad-section-title">
                <i className="fa-solid fa-calendar-days" style={{color:'#00a3a3'}}></i>
                Upcoming Events
                <span className="ad-badge-count">{events.filter(ev => ev.audience !== 'students').length}</span>
              </div>
              <div className="ad-events-grid full">
                {events.filter(ev => ev.audience !== 'students').slice().sort((a, b) => b.id - a.id).map(ev => (
                  <div key={ev.id} className="ad-event-card">
                    <div className="ad-event-date"><i className="fa-solid fa-calendar"></i> {formatEventSchedule(ev)}</div>
                    <h4>{ev.title}</h4>
                    <p className="ad-event-loc"><i className="fa-solid fa-location-dot"></i> {ev.location}</p>
                    <p className="ad-event-desc">{ev.description}</p>
                    {Number(ev.fee) > 0 && (
                      <p style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontWeight:700,color:'#0f4ea8',fontSize:14}}>
                        <i className="fa-solid fa-bangladeshi-taka-sign"></i> Fee: ৳{Number(ev.fee).toLocaleString()}
                      </p>
                    )}
                    {ev.payment_account && (
                      <p style={{fontSize:12,color:'#888',marginTop:2}}>
                        <i className="fa-solid fa-building-columns" style={{color:'#00a3a3',marginRight:4}}></i>
                        Pay to: <strong style={{color:'#333'}}>{ev.payment_account}</strong>
                      </p>
                    )}
                    {ev.audience !== 'students' && (
                    <button
                      className={`ad-btn-join${registeredEventIds.includes(ev.id) ? ' joined' : ''}`}
                      onClick={() => !registeredEventIds.includes(ev.id) && openRegisterModal(ev)}
                      disabled={registeredEventIds.includes(ev.id)}
                      style={{marginTop:12}}
                    >
                      {registeredEventIds.includes(ev.id)
                        ? <><i className="fa-solid fa-check"></i> Registered</>
                        : <><i className="fa-solid fa-pen-to-square"></i> Register for Event</>
                      }
                    </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ══ TRAININGS ══ */}
          {activeView === 'trainings' && (
            <>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12}}>
                <div className="ad-section-title" style={{marginBottom:0}}>
                  <i className="fa-solid fa-chalkboard-user" style={{color:'#00a3a3'}}></i>
                  Available Trainings
                  <span className="ad-badge-count">{trainings.length}</span>
                </div>
                <button onClick={() => { setShowAddTrainModal(true); setAddTrainMsg('') }} style={{
                  display:'flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#0f4ea8,#00a3a3)',
                  color:'white', border:'none', padding:'10px 20px', borderRadius:12, fontWeight:700,
                  fontSize:14, cursor:'pointer', fontFamily:'Inter,sans-serif', boxShadow:'0 4px 14px rgba(95,44,130,0.3)'
                }}>
                  <i className="fa-solid fa-plus"></i> Add Training
                </button>
              </div>
              <div className="ad-training-grid">
                {trainings.map(tr => {
                  const pct = Math.round((tr.enrolled / tr.seats) * 100)
                  return (
                    <div key={tr.id} className="ad-training-card">
                      <div className="ad-training-header">
                        <h4>{tr.title}</h4>
                        <span className={`ad-train-status ${tr.status === 'Full' ? 'full' : 'upcoming'}`}>{tr.status}</span>
                      </div>
                      <p><i className="fa-solid fa-user-tie"></i> {tr.trainer}</p>
                      <p><i className="fa-solid fa-calendar"></i> {tr.date}</p>
                      <div className="ad-progress-bar">
                        <div className="ad-progress-fill" style={{width: `${pct}%`}}></div>
                      </div>
                      <p className="ad-seats-text">{tr.enrolled} / {tr.seats} seats filled</p>
                      {Number(tr.fee) > 0 && (
                        <p style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontWeight:700,color:'#0f4ea8',fontSize:13}}>
                          <i className="fa-solid fa-bangladeshi-taka-sign"></i> Fee: ৳{Number(tr.fee).toLocaleString()}
                        </p>
                      )}
                      {tr.payment_account && (
                        <p style={{fontSize:12,color:'#888',marginTop:2}}>
                          <i className="fa-solid fa-building-columns" style={{color:'#00a3a3',marginRight:4}}></i>
                          Pay to: <strong style={{color:'#333'}}>{tr.payment_account}</strong>
                        </p>
                      )}
                      <button
                        className={`ad-btn-enroll${enrolledTrainingIds.includes(tr.id) ? ' enrolled' : ''}${tr.status === 'Full' && !enrolledTrainingIds.includes(tr.id) ? ' disabled' : ''}`}
                        onClick={() => !enrolledTrainingIds.includes(tr.id) && tr.status !== 'Full' && openTrainEnrollModal(tr)}
                        disabled={tr.status === 'Full' && !enrolledTrainingIds.includes(tr.id)}
                      >
                        {enrolledTrainingIds.includes(tr.id)
                          ? <><i className="fa-solid fa-check"></i> Enrolled</>
                          : tr.status === 'Full'
                            ? 'Seats Full'
                            : <><i className="fa-solid fa-plus"></i> Enroll</>
                        }
                      </button>
                      <button
                        onClick={() => openMyTrainAttendees(tr)}
                        style={{
                          marginTop:4, background:'#f3eeff', color:'#0f4ea8',
                          border:'1.5px solid #d4b8f0', borderRadius:10, padding:'8px 16px',
                          fontSize:13, fontWeight:700, cursor:'pointer',
                          fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6
                        }}
                      >
                        <i className="fa-solid fa-users" style={{fontSize:12}}></i> View Attendees ({tr.enrolled})
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ══ JOBS ══ */}
          {activeView === 'jobs' && (
            <>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12}}>
                <div className="ad-section-title" style={{marginBottom:0}}>
                  <i className="fa-solid fa-briefcase" style={{color:'#00a3a3'}}></i>
                  Job Opportunities
                  <span className="ad-badge-count">{jobs.length}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <span style={{position:'relative',display:'flex',alignItems:'center'}}>
                    <i className="fa-solid fa-magnifying-glass" style={{position:'absolute',left:10,color:'#00a3a3',fontSize:13,pointerEvents:'none'}}></i>
                    <input
                      type="text"
                      placeholder="Search by title or company…"
                      value={jobSearch}
                      onChange={e => setJobSearch(e.target.value)}
                      style={{paddingLeft:30,paddingRight:10,paddingTop:7,paddingBottom:7,border:'1.5px solid #c5dbf5',borderRadius:20,fontSize:13,outline:'none',fontFamily:'Inter,sans-serif',width:210}}
                    />
                  </span>
                <button onClick={() => { setShowJobModal(true); setJobSubmitMsg('') }} style={{
                  display:'flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#0f4ea8,#00a3a3)',
                  color:'white', border:'none', padding:'10px 20px', borderRadius:12, fontWeight:700,
                  fontSize:14, cursor:'pointer', fontFamily:'Inter,sans-serif', boxShadow:'0 4px 14px rgba(95,44,130,0.3)'
                }}>
                  <i className="fa-solid fa-plus"></i> Post a Job
                </button>
                </div>
              </div>

              {jobs.length === 0 ? (
                <div style={{textAlign:'center', padding:'60px 20px', color:'#bbb', background:'white',borderRadius:18, boxShadow:'0 2px 12px rgba(95,44,130,0.06)'}}>
                  <i className="fa-solid fa-briefcase" style={{fontSize:40, marginBottom:12, color:'#ddd'}}></i>
                  <p style={{fontSize:15}}>No job listings yet. Be the first to post one!</p>
                </div>
              ) : (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:20}}>
                  {jobs.filter(job => !jobSearch.trim() || (job.title||'').toLowerCase().includes(jobSearch.trim().toLowerCase()) || (job.company||'').toLowerCase().includes(jobSearch.trim().toLowerCase())).map(job => (
                    <div key={job.id} style={{
                      background:'white', borderRadius:18, boxShadow:'0 4px 18px rgba(95,44,130,0.09)',
                      border:'1.5px solid #ece4f8', overflow:'hidden', display:'flex', flexDirection:'column'
                    }}>
                      {/* Card top bar */}
                      <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', padding:'16px 20px'}}>
                        <div style={{color:'white', fontWeight:800, fontSize:16, marginBottom:4}}>{job.title}</div>
                        <div style={{color:'rgba(255,255,255,0.8)', fontSize:13, display:'flex', alignItems:'center', gap:8}}>
                          <i className="fa-solid fa-building"></i> {job.company || '—'}
                        </div>
                      </div>

                      {/* Details */}
                      <div style={{padding:'14px 20px', flex:1, display:'flex', flexDirection:'column', gap:8}}>
                        <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:4}}>
                          <span style={{background:'#f3eeff', color:'#0f4ea8', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:600}}>
                            {job.type}
                          </span>
                          {job.location && (
                            <span style={{background:'#fff4e6', color:'#b06000', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:600}}>
                              <i className="fa-solid fa-location-dot" style={{marginRight:4}}></i>{job.location}
                            </span>
                          )}
                          {job.deadline && (
                            <span style={{background:'#e8f8f0', color:'#1a6e3c', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:600}}>
                              <i className="fa-solid fa-calendar" style={{marginRight:4}}></i>Deadline: {job.deadline}
                            </span>
                          )}
                        </div>

                        {job.description && (
                          <p style={{fontSize:13, color:'#555', lineHeight:1.6, margin:0,
                            display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                            {job.description}
                          </p>
                        )}

                        <div style={{marginTop:'auto', paddingTop:12}}>
                          {job.apply_link ? (
                            <a href={job.apply_link} target="_blank" rel="noreferrer" style={{
                              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                              background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', color:'white',
                              borderRadius:10, padding:'9px 18px', textDecoration:'none', fontWeight:700,
                              fontSize:13, fontFamily:'Inter,sans-serif', boxShadow:'0 2px 8px rgba(95,44,130,0.2)'
                            }}>
                              <i className="fa-solid fa-arrow-up-right-from-square"></i> Apply / View Circular
                            </a>
                          ) : (
                            <div style={{textAlign:'center', color:'#bbb', fontSize:13, padding:'6px 0'}}>
                              No application link provided
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* POST JOB MODAL */}
              {showJobModal && (
                <div onClick={() => setShowJobModal(false)} style={{
                  position:'fixed', inset:0, background:'rgba(20,0,40,0.55)', zIndex:1000,
                  display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(3px)'
                }}>
                  <div onClick={e => e.stopPropagation()} style={{
                    background:'white', borderRadius:24, width:'100%', maxWidth:520,
                    maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(95,44,130,0.25)'
                  }}>
                    <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', borderRadius:'24px 24px 0 0', padding:'22px 28px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                      <h3 style={{color:'white', margin:0, fontSize:18, fontWeight:800}}>
                        <i className="fa-solid fa-briefcase" style={{marginRight:10}}></i>Post a Job
                      </h3>
                      <button onClick={() => setShowJobModal(false)} style={{background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer', color:'white', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center'}}>✕</button>
                    </div>

                    {jobSubmitMsg === 'success' ? (
                      <div style={{padding:'48px 32px', textAlign:'center'}}>
                        <div style={{fontSize:48, marginBottom:12}}>✅</div>
                        <h3 style={{color:'#1a6e3c', marginBottom:8}}>Submitted Successfully!</h3>
                        <p style={{color:'#666', fontSize:14}}>Your job posting has been submitted for admin review. It will be visible once approved.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitJob} style={{padding:'24px 28px', display:'flex', flexDirection:'column', gap:14}}>
                        {[
                          { label:'Job Title *', name:'title', placeholder:'e.g. Software Engineer', required:true },
                          { label:'Organization / Company *', name:'company', placeholder:'e.g. Google, HSBC, Pathao', required:true },
                          { label:'Location', name:'location', placeholder:'e.g. Dhaka, Remote' },
                          { label:'Deadline', name:'deadline', type:'date' },
                        ].map(f => (
                          <div key={f.name}>
                            <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>{f.label}</label>
                            <input
                              type={f.type || 'text'}
                              placeholder={f.placeholder}
                              value={jobForm[f.name]}
                              onChange={e => setJobForm({...jobForm, [f.name]: e.target.value})}
                              required={f.required}
                              style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                            />
                          </div>
                        ))}

                        <div>
                          <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>Job Type</label>
                          <select value={jobForm.type} onChange={e => setJobForm({...jobForm, type: e.target.value})}
                            style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333'}}>
                            <option>Full-time</option><option>Part-time</option><option>Remote</option><option>Internship</option>
                          </select>
                        </div>

                        <div>
                          <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>Application Link / Circular URL</label>
                          <input
                            type="url"
                            placeholder="https://forms.google.com/… or job portal link"
                            value={jobForm.apply_link}
                            onChange={e => setJobForm({...jobForm, apply_link: e.target.value})}
                            style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                          />
                        </div>

                        <div>
                          <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>Job Description</label>
                          <textarea
                            rows={4}
                            placeholder="Describe the role, responsibilities, requirements…"
                            value={jobForm.description}
                            onChange={e => setJobForm({...jobForm, description: e.target.value})}
                            style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', resize:'vertical', boxSizing:'border-box'}}
                          />
                        </div>

                        <div style={{background:'#fff8e8', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#8a6000', display:'flex', gap:8, alignItems:'flex-start'}}>
                          <i className="fa-solid fa-circle-info" style={{marginTop:1, flexShrink:0}}></i>
                          Your job posting will be reviewed by the admin before being listed publicly.
                        </div>

                        {jobSubmitMsg === 'error' && (
                          <p style={{color:'#ff6b6b', fontSize:13, margin:0}}>Failed to submit. Please try again.</p>
                        )}

                        <div style={{display:'flex', gap:10, marginTop:4}}>
                          <button type="submit" disabled={jobSubmitting} style={{
                            flex:1, background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', color:'white',
                            border:'none', padding:'12px', borderRadius:12, fontWeight:700, fontSize:15,
                            cursor:'pointer', fontFamily:'Inter,sans-serif'
                          }}>
                            {jobSubmitting ? 'Submitting…' : <><i className="fa-solid fa-paper-plane"></i> Submit for Review</>}
                          </button>
                          <button type="button" onClick={() => setShowJobModal(false)} style={{
                            padding:'12px 20px', background:'#edf6ff', color:'#0f4ea8',
                            border:'none', borderRadius:12, fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'Inter,sans-serif'
                          }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ MEMBERSHIP ══ */}
          {activeView === 'refer-alumni' && (
            <>
              <div className="ad-section-title">
                <i className="fa-solid fa-user-plus" style={{color:'#00a3a3'}}></i> Refer a Known Alumni
              </div>
              <div className="ad-membership-card" style={{marginBottom:16}}>
                <div className="ad-mem-header">
                  <div className="ad-mem-icon"><i className="fa-solid fa-share-nodes"></i></div>
                  <div>
                    <h3>Referral Form</h3>
                    <p>Admin approve করলে referred alumni email invitation পাবে।</p>
                  </div>
                </div>
                <form onSubmit={handleSubmitReferral} className="ad-referral-form">
                  <input
                    type="text"
                    placeholder="Referred alumni name *"
                    value={referralForm.referred_name}
                    onChange={e => setReferralForm(prev => ({ ...prev, referred_name: e.target.value }))}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={referralForm.referred_email}
                    onChange={e => setReferralForm(prev => ({ ...prev, referred_email: e.target.value }))}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={referralForm.referred_phone}
                    onChange={e => setReferralForm(prev => ({ ...prev, referred_phone: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Student ID"
                    value={referralForm.referred_student_id}
                    onChange={e => setReferralForm(prev => ({ ...prev, referred_student_id: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Session"
                    value={referralForm.referred_session}
                    onChange={e => setReferralForm(prev => ({ ...prev, referred_session: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Department"
                    value={referralForm.referred_department}
                    onChange={e => setReferralForm(prev => ({ ...prev, referred_department: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Relation note (optional)"
                    value={referralForm.relation_note}
                    onChange={e => setReferralForm(prev => ({ ...prev, relation_note: e.target.value }))}
                    className="ad-referral-note"
                  />
                  <div className="ad-referral-actions">
                    <button className="ad-btn-join" type="submit" disabled={referralSubmitting}>
                      {referralSubmitting ? 'Submitting...' : 'Submit Referral'}
                    </button>
                    {referralMsg === 'success' && <span style={{color:'#1a7a4a',fontSize:13,fontWeight:600}}>Referral submitted successfully.</span>}
                    {referralMsg === 'error' && <span style={{color:'#a32121',fontSize:13,fontWeight:600}}>Submission failed. Please check fields and try again.</span>}
                  </div>
                </form>
              </div>

              <div className="ad-membership-card">
                <div className="ad-mem-header">
                  <div className="ad-mem-icon"><i className="fa-solid fa-list-check"></i></div>
                  <div>
                    <h3>My Referrals</h3>
                    <p>Track current referral approval status.</p>
                  </div>
                </div>
                {myReferrals.length === 0 ? (
                  <div className="ad-mem-notice" style={{marginTop:10}}>
                    <i className="fa-solid fa-circle-info"></i>
                    No referral submitted yet.
                  </div>
                ) : (
                  <div className="ad-referral-table-wrap">
                    <table className="ad-table ad-referral-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Student ID</th>
                          <th>Session</th>
                          <th>Status</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myReferrals.map((r) => (
                          <tr key={r.id}>
                            <td>{r.referred_name}</td>
                            <td>{r.referred_email}</td>
                            <td>{r.referred_student_id || '-'}</td>
                            <td>{r.referred_session || '-'}</td>
                            <td>{r.status}</td>
                            <td>{r.created_at ? String(r.created_at).slice(0, 10) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══ MEMBERSHIP ══ */}
          {activeView === 'membership' && (
            <>
              <div className="ad-section-title">
                <i className="fa-solid fa-id-card" style={{color:'#00a3a3'}}></i> Membership Details
              </div>
              <div className="ad-membership-card">
                <div className="ad-mem-header">
                  <div className="ad-mem-icon"><i className="fa-solid fa-shield-halved"></i></div>
                  <div>
                    <h3>ICE Alumni Association</h3>
                    <p>University of Rajshahi — Department of Information &amp; Communication Engineering</p>
                  </div>
                </div>
                <div className="ad-mem-body">
                  <div className="ad-mem-row"><span>Member Name</span><strong>{profile.name}</strong></div>
                  <div className="ad-mem-row"><span>Student ID / Roll</span><strong>{profile.student_id || '—'}</strong></div>
                  <div className="ad-mem-row"><span>Email</span><strong>{profile.email}</strong></div>
                  <div className="ad-mem-row"><span>Department</span><strong>{profile.department}</strong></div>
                  <div className="ad-mem-row"><span>Session</span><strong>{profile.session}</strong></div>
                  <div className="ad-mem-row">
                    <span>Membership Status</span>
                    <strong>
                      <span className={`ad-badge ${profile.status}`}>
                        {profile.status === 'approved' ? '✔ Active Member' : '⏳ Pending Approval'}
                      </span>
                    </strong>
                  </div>
                  <div className="ad-mem-row"><span>Member Since</span><strong>2026</strong></div>
                </div>
                {profile.status !== 'approved' && (
                  <div className="ad-mem-notice">
                    <i className="fa-solid fa-circle-info"></i>
                    Your membership is under review. The admin will approve it shortly.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══ FUND TRANSECTION ══ */}
          {activeView === 'fund-transaction' && (
            <>
              <div className="ad-section-title">
                <i className="fa-solid fa-money-bill-wave" style={{color:'#00a3a3'}}></i> Fund Transection
              </div>
              {fundRequests.length === 0 ? (
                <div className="ad-mem-notice" style={{marginTop: 10}}>
                  <i className="fa-solid fa-circle-info"></i>
                  No active fund request right now.
                </div>
              ) : (
                <div className="ad-events-grid" style={{marginBottom:18}}>
                  {fundRequests.map(fr => {
                    const form = fundFormByRequest[fr.id] || { payment_method: 'bkash', amount: '', payment_reference: '', note: '' }
                    return (
                      <div key={fr.id} className="ad-event-card" style={{paddingBottom:14}}>
                        <div className="ad-event-date"><i className="fa-solid fa-hand-holding-heart"></i> Request #{fr.id}</div>
                        <h4>{fr.title}</h4>
                        <p style={{marginBottom:10}}>{fr.purpose}</p>
                        <p><strong>Target:</strong> Tk {Number(fr.target_amount || 0).toLocaleString()}</p>
                        {fr.bkash_number && <p><strong>bKash:</strong> {fr.bkash_number}</p>}
                        {fr.bank_name && <p><strong>Bank:</strong> {fr.bank_name} ({fr.bank_account_number})</p>}

                        <div style={{display:'grid',gap:8,marginTop:8}}>
                          <select
                            value={form.payment_method}
                            onChange={e => handleFundInputChange(fr.id, 'payment_method', e.target.value)}
                            style={{padding:'9px 12px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:13,outline:'none',fontFamily:'Inter,sans-serif'}}
                          >
                            <option value="bkash">bKash</option>
                            <option value="bank">Bank</option>
                          </select>
                          <input
                            type="number"
                            min="1"
                            placeholder="Amount (Tk)"
                            value={form.amount}
                            onChange={e => handleFundInputChange(fr.id, 'amount', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Transaction / Reference ID"
                            value={form.payment_reference}
                            onChange={e => handleFundInputChange(fr.id, 'payment_reference', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Note (optional)"
                            value={form.note}
                            onChange={e => handleFundInputChange(fr.id, 'note', e.target.value)}
                          />
                          <button
                            className="ad-btn-join"
                            onClick={() => handleSubmitFundPayment(fr)}
                            disabled={fundSubmittingFor === fr.id}
                          >
                            {fundSubmittingFor === fr.id ? 'Submitting...' : 'Submit Payment'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="ad-membership-card">
                <div className="ad-mem-header">
                  <div className="ad-mem-icon"><i className="fa-solid fa-receipt"></i></div>
                  <div>
                    <h3>My Fund Payment History</h3>
                    <p>All submitted fund payments are listed here.</p>
                  </div>
                </div>
                {myFundTransactions.length === 0 ? (
                  <div className="ad-mem-notice" style={{marginTop: 10}}>
                    <i className="fa-solid fa-circle-info"></i>
                    No fund transection record yet.
                  </div>
                ) : (
                  <div style={{overflowX:'auto', marginTop:12}}>
                    <table className="ad-table" style={{minWidth:760}}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Request</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myFundTransactions.map(tx => (
                          <tr key={tx.id}>
                            <td>{tx.date || '-'}</td>
                            <td>{tx.request_title || tx.type || '-'}</td>
                            <td>{tx.payment_method || '-'}</td>
                            <td>{tx.payment_reference || '-'}</td>
                            <td>Tk {Number(tx.amount || 0).toLocaleString()}</td>
                            <td>{tx.status || 'paid'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ══ ALUMNI PROFILE MODAL ══ */}
      {selectedAlumni && (
        <div
          style={{position:'fixed',inset:0,background:'rgba(20,0,40,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(3px)'}}
          onClick={() => setSelectedAlumni(null)}
        >
          <div
            style={{background:'white',borderRadius:24,width:'100%',maxWidth:600,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(95,44,130,0.25)',position:'relative'}}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header banner */}
            <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)',borderRadius:'24px 24px 0 0',padding:'20px 24px 32px',position:'relative'}}>
              <button
                onClick={() => setSelectedAlumni(null)}
                style={{position:'absolute',top:12,right:12,background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:30,height:30,cursor:'pointer',color:'white',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}
              >✕</button>
              <h2 style={{color:'white',fontSize:18,fontWeight:800,margin:0}}>{selectedAlumni.name}</h2>
              <p style={{color:'rgba(255,255,255,0.8)',marginTop:3,fontSize:13}}>
                {selectedAlumni.designation || 'Alumni'}{selectedAlumni.company ? ` · ${selectedAlumni.company}` : ''}
              </p>
            </div>

            {/* Avatar */}
            <div style={{display:'flex',justifyContent:'center',position:'relative',zIndex:2}}>
              <div style={{
                width:96,height:96,borderRadius:'50%',border:'4px solid white',
                background:'linear-gradient(135deg,#00a3a3,#0f4ea8)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:36,fontWeight:800,color:'white',
                marginTop:-48,overflow:'hidden',boxShadow:'0 6px 24px rgba(95,44,130,0.25)',
              }}>
                {resolveAvatarUrl(selectedAlumni)
                  ? <img src={resolveAvatarUrl(selectedAlumni)} alt={selectedAlumni.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  : selectedAlumni.name[0].toUpperCase()
                }
              </div>
            </div>

            {/* Modal body */}
            <div style={{padding:'20px 32px 32px'}}>
              <div style={{textAlign:'center',marginBottom:20}}>
                <span style={{background:'#e8f8f0',color:'#1a7a4a',borderRadius:20,padding:'4px 16px',fontSize:13,fontWeight:700}}>✔ Active Member</span>
              </div>

              {/* About */}
              {selectedAlumni.bio && (
                <div style={{background:'#faf7ff',borderRadius:14,padding:'16px 20px',marginBottom:20,borderLeft:'4px solid #00a3a3'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#00a3a3',letterSpacing:'0.5px',textTransform:'uppercase',marginBottom:6}}>About Me</div>
                  <p style={{fontSize:14,color:'#444',lineHeight:1.7,margin:0,whiteSpace:'pre-wrap'}}>{selectedAlumni.bio}</p>
                </div>
              )}

              {/* Info rows */}
              {[
                { icon:'fa-graduation-cap', label:'Department / Session', value: `${selectedAlumni.department} · ${selectedAlumni.session}` },
                { icon:'fa-id-badge',       label:'Student ID',           value: selectedAlumni.student_id },
                { icon:'fa-envelope',       label:'Email',                value: selectedAlumni.email },
                { icon:'fa-phone',          label:'Phone',                value: selectedAlumni.phone },
                { icon:'fa-location-dot',   label:'Address',              value: selectedAlumni.address },
                { icon:'fa-building',       label:'Organization',         value: selectedAlumni.company },
                { icon:'fa-briefcase',      label:'Designation',          value: selectedAlumni.designation },
                { icon:'fa-calendar-days',  label:'Current Job Start',    value: selectedAlumni.current_job_start_date },
                { icon:'fa-user-graduate',  label:'Higher Study',         value: selectedAlumni.higher_study },
              ].filter(r => r.value).map((row, i) => (
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:14,padding:'10px 0',borderBottom:'1px solid #f3eeff'}}>
                  <span style={{width:36,height:36,borderRadius:10,background:'#f3eeff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                    <i className={`fa-solid ${row.icon}`} style={{color:'#0f4ea8',fontSize:14}}></i>
                  </span>
                  <div>
                    <div style={{fontSize:11,color:'#999',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px'}}>{row.label}</div>
                    <div style={{fontSize:14,color:'#333',fontWeight:500,marginTop:2}}>{row.value}</div>
                  </div>
                </div>
              ))}

              {selectedAlumniPastJobs.length > 0 && (
                <div style={{marginTop:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f4ea8',letterSpacing:'0.5px',textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    <i className="fa-solid fa-briefcase" style={{color:'#00a3a3'}}></i> Past Experience
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {selectedAlumniPastJobs.map((job, idx) => (
                      <div key={`${job.id || 'past'}-${idx}`} style={{border:'1px solid #eadcf9',borderRadius:12,padding:'10px 12px',background:'#fbf7ff'}}>
                        <div style={{fontSize:14,fontWeight:700,color:'#123b68'}}>
                          {job.designation || 'Role'}{job.company ? ` @ ${job.company}` : ''}
                        </div>
                        <div style={{fontSize:12,color:'#8668a6',marginTop:2}}>
                          {(job.start_date || 'N/A')} - {(job.end_date || 'Present')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Interests */}
              {selectedAlumni.research_interests && (
                <div style={{marginTop:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f4ea8',letterSpacing:'0.5px',textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    <i className="fa-solid fa-flask" style={{color:'#00a3a3'}}></i> Research Interests
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {selectedAlumni.research_interests.split(',').map((item,i) => (
                      <span key={i} style={{background:'#f3eeff',color:'#0f4ea8',borderRadius:20,padding:'4px 14px',fontSize:13,fontWeight:500}}>{item.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracurricular */}
              {selectedAlumni.extracurricular && (
                <div style={{marginTop:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f4ea8',letterSpacing:'0.5px',textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    <i className="fa-solid fa-star" style={{color:'#00a3a3'}}></i> Extracurricular Activities
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {selectedAlumni.extracurricular.split(',').map((item,i) => (
                      <span key={i} style={{background:'#fff7e6',color:'#c07000',borderRadius:20,padding:'4px 14px',fontSize:13,fontWeight:500}}>{item.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {(selectedAlumni.linkedin || selectedAlumni.github || selectedAlumni.twitter || selectedAlumni.website) && (
                <div style={{marginTop:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f4ea8',letterSpacing:'0.5px',textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    <i className="fa-solid fa-share-nodes" style={{color:'#00a3a3'}}></i> Connect
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                    {selectedAlumni.linkedin && (
                      <a href={selectedAlumni.linkedin} target="_blank" rel="noreferrer"
                        style={{display:'flex',alignItems:'center',gap:8,background:'#e8f1fb',color:'#0077b5',borderRadius:12,padding:'8px 16px',textDecoration:'none',fontWeight:600,fontSize:14}}>
                        <i className="fa-brands fa-linkedin" style={{fontSize:18}}></i> LinkedIn
                      </a>
                    )}
                    {selectedAlumni.github && (
                      <a href={selectedAlumni.github} target="_blank" rel="noreferrer"
                        style={{display:'flex',alignItems:'center',gap:8,background:'#f3f3f3',color:'#24292e',borderRadius:12,padding:'8px 16px',textDecoration:'none',fontWeight:600,fontSize:14}}>
                        <i className="fa-brands fa-github" style={{fontSize:18}}></i> GitHub
                      </a>
                    )}
                    {selectedAlumni.twitter && (
                      <a href={selectedAlumni.twitter} target="_blank" rel="noreferrer"
                        style={{display:'flex',alignItems:'center',gap:8,background:'#e8f6fd',color:'#1da1f2',borderRadius:12,padding:'8px 16px',textDecoration:'none',fontWeight:600,fontSize:14}}>
                        <i className="fa-brands fa-twitter" style={{fontSize:18}}></i> Twitter
                      </a>
                    )}
                    {selectedAlumni.website && (
                      <a href={selectedAlumni.website} target="_blank" rel="noreferrer"
                        style={{display:'flex',alignItems:'center',gap:8,background:'#f3eeff',color:'#0f4ea8',borderRadius:12,padding:'8px 16px',textDecoration:'none',fontWeight:600,fontSize:14}}>
                        <i className="fa-solid fa-globe" style={{fontSize:18}}></i> Website
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* ── EVENT REGISTRATION MODAL ── */}
    {registerEvent && (
    <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
      <div style={{
        background:'white', borderRadius:24, width:'100%', maxWidth:520,
        maxHeight:'92vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(95,44,130,0.28)'
      }}>
          {/* Header */}
          <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', borderRadius:'24px 24px 0 0', padding:'22px 28px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <h3 style={{color:'white', margin:0, fontSize:17, fontWeight:800}}>
                <i className="fa-solid fa-pen-to-square" style={{marginRight:10}}></i>Event Registration
              </h3>
              <p style={{color:'rgba(255,255,255,0.75)', fontSize:13, margin:'4px 0 0'}}>{registerEvent.title}</p>
            </div>
            <button onClick={() => setShowRegisterModal(false)} style={{background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer', color:'white', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif'}}>✕</button>
          </div>

          {/* Fee / payment info */}
          {(Number(registerEvent.fee) > 0 || registerEvent.payment_account) && (
            <div style={{background:'#fff8e6', borderLeft:'4px solid #f0a500', margin:'0', padding:'14px 28px', display:'flex', flexDirection:'column', gap:4}}>
              {Number(registerEvent.fee) > 0 && (
                <div style={{display:'flex', alignItems:'center', gap:8, fontWeight:700, color:'#7a4f00', fontSize:14}}>
                  <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                  Registration Fee: ৳{Number(registerEvent.fee).toLocaleString()}
                </div>
              )}
              {registerEvent.payment_account && (
                <div style={{fontSize:13, color:'#6b4000', display:'flex', alignItems:'center', gap:6}}>
                  <i className="fa-solid fa-building-columns" style={{color:'#00a3a3'}}></i>
                  <span>Send payment to: <strong>{registerEvent.payment_account}</strong></span>
                </div>
              )}
              <div style={{fontSize:12, color:'#9a6800', marginTop:4}}>
                After sending, enter your transaction/reference ID below.
              </div>
            </div>
          )}

          {registerMsg === 'success' ? (
            <div style={{padding:'48px 32px', textAlign:'center'}}>
              <div style={{fontSize:52, marginBottom:12}}>✅</div>
              <h3 style={{color:'#1a6e3c', marginBottom:8}}>Registration Successful!</h3>
              <p style={{color:'#666', fontSize:14}}>You've been registered for <strong>{registerEvent.title}</strong>.</p>
            </div>
          ) : (
            <form onSubmit={handleRegisterForEvent} style={{padding:'24px 28px', display:'flex', flexDirection:'column', gap:14}}>
              {[
                { label:'Full Name *',    name:'name',       type:'text',  placeholder:'Your full name',        required:true },
                { label:'Student ID',     name:'student_id', type:'text',  placeholder:'e.g. 1804001' },
                { label:'Session / Batch',name:'session',    type:'text',  placeholder:'e.g. 2018-2022' },
                { label:'Email *',        name:'email',      type:'email', placeholder:'your@email.com',        required:true },
                { label:'Phone Number *', name:'phone',      type:'tel',   placeholder:'e.g. 01712345678',      required:true },
              ].map(f => (
                <div key={f.name}>
                  <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={registerForm[f.name]}
                    onChange={e => setRegisterForm({...registerForm, [f.name]: e.target.value})}
                    required={f.required}
                    style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                  />
                </div>
              ))}
              <div>
                <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>
                  Transaction ID / Reference No {Number(registerEvent.fee) > 0 ? '*' : '(optional)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN1234567890"
                  value={registerForm.transaction_id}
                  onChange={e => setRegisterForm({...registerForm, transaction_id: e.target.value})}
                  required={Number(registerEvent.fee) > 0}
                  style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                />
              </div>

              {registerMsg === 'error' && (
                <p style={{color:'#ff6b6b', fontSize:13, margin:0}}>Registration failed. Please try again.</p>
              )}

              <div style={{display:'flex', gap:10, marginTop:4}}>
                <button type="submit" disabled={registerSubmitting} style={{
                  flex:1, background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', color:'white',
                  border:'none', padding:'12px', borderRadius:25, fontSize:14, fontWeight:700,
                  cursor: registerSubmitting ? 'not-allowed' : 'pointer', fontFamily:'Inter,sans-serif',
                  opacity: registerSubmitting ? 0.7 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8
                }}>
                  {registerSubmitting
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</>
                    : <><i className="fa-solid fa-check"></i> Submit Registration</>
                  }
                </button>
                <button type="button" onClick={() => setShowRegisterModal(false)} style={{
                  flex:1, background:'#f3eeff', color:'#0f4ea8', border:'none', padding:'12px',
                  borderRadius:25, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif'
                }}>Cancel</button>
              </div>
            </form>
          )}
      </div>
    </Modal>
    )}

    {/* ── TRAINING ENROLLMENT MODAL ── */}
    {enrollTrainingItem && (
    <Modal show={showTrainEnrollModal} onHide={() => setShowTrainEnrollModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
      <div style={{
        background:'white', borderRadius:24, width:'100%', maxWidth:520,
        maxHeight:'92vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(95,44,130,0.28)'
      }}>
          {/* Header */}
          <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', borderRadius:'24px 24px 0 0', padding:'22px 28px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <h3 style={{color:'white', margin:0, fontSize:17, fontWeight:800}}>
                <i className="fa-solid fa-chalkboard-user" style={{marginRight:10}}></i>Training Enrollment
              </h3>
              <p style={{color:'rgba(255,255,255,0.75)', fontSize:13, margin:'4px 0 0'}}>{enrollTrainingItem.title}</p>
            </div>
            <button onClick={() => setShowTrainEnrollModal(false)} style={{background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer', color:'white', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif'}}>✕</button>
          </div>

          {/* Fee / payment info */}
          {(Number(enrollTrainingItem.fee) > 0 || enrollTrainingItem.payment_account) && (
            <div style={{background:'#fff8e6', borderLeft:'4px solid #f0a500', margin:'0', padding:'14px 28px', display:'flex', flexDirection:'column', gap:4}}>
              {Number(enrollTrainingItem.fee) > 0 && (
                <div style={{display:'flex', alignItems:'center', gap:8, fontWeight:700, color:'#7a4f00', fontSize:14}}>
                  <i className="fa-solid fa-bangladeshi-taka-sign"></i>
                  Enrollment Fee: ৳{Number(enrollTrainingItem.fee).toLocaleString()}
                </div>
              )}
              {enrollTrainingItem.payment_account && (
                <div style={{fontSize:13, color:'#6b4000', display:'flex', alignItems:'center', gap:6}}>
                  <i className="fa-solid fa-building-columns" style={{color:'#00a3a3'}}></i>
                  <span>Send payment to: <strong>{enrollTrainingItem.payment_account}</strong></span>
                </div>
              )}
              <div style={{fontSize:12, color:'#9a6800', marginTop:4}}>
                After sending, enter your transaction/reference ID below.
              </div>
            </div>
          )}

          {trainEnrollMsg === 'success' ? (
            <div style={{padding:'48px 32px', textAlign:'center'}}>
              <div style={{fontSize:52, marginBottom:12}}>✅</div>
              <h3 style={{color:'#1a6e3c', marginBottom:8}}>Enrollment Successful!</h3>
              <p style={{color:'#666', fontSize:14}}>You've been enrolled in <strong>{enrollTrainingItem.title}</strong>.</p>
            </div>
          ) : (
            <form onSubmit={handleTrainEnroll} style={{padding:'24px 28px', display:'flex', flexDirection:'column', gap:14}}>
              {[
                { label:'Full Name *',    name:'name',           type:'text',  placeholder:'Your full name',        required:true },
                { label:'Student ID',     name:'student_id',     type:'text',  placeholder:'e.g. 1804001' },
                { label:'Email *',        name:'email',          type:'email', placeholder:'your@email.com',        required:true },
                { label:'Phone Number *', name:'phone',          type:'tel',   placeholder:'e.g. 01712345678',      required:true },
                { label:'Payment Method', name:'payment_method', type:'text',  placeholder:'e.g. bKash, Bank Transfer' },
              ].map(f => (
                <div key={f.name}>
                  <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={trainEnrollForm[f.name]}
                    onChange={e => setTrainEnrollForm({...trainEnrollForm, [f.name]: e.target.value})}
                    required={f.required}
                    style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                  />
                </div>
              ))}
              <div>
                <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>
                  Transaction ID / Reference No {Number(enrollTrainingItem.fee) > 0 ? '*' : '(optional)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN1234567890"
                  value={trainEnrollForm.transaction_id}
                  onChange={e => setTrainEnrollForm({...trainEnrollForm, transaction_id: e.target.value})}
                  required={Number(enrollTrainingItem.fee) > 0}
                  style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                />
              </div>

              {trainEnrollMsg === 'error' && (
                <p style={{color:'#ff6b6b', fontSize:13, margin:0}}>Enrollment failed. Please try again.</p>
              )}

              <div style={{display:'flex', gap:10, marginTop:4}}>
                <button type="submit" disabled={trainEnrollSubmitting} style={{
                  flex:1, background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', color:'white',
                  border:'none', padding:'12px', borderRadius:25, fontSize:14, fontWeight:700,
                  cursor: trainEnrollSubmitting ? 'not-allowed' : 'pointer', fontFamily:'Inter,sans-serif',
                  opacity: trainEnrollSubmitting ? 0.7 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8
                }}>
                  {trainEnrollSubmitting
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting…</>
                    : <><i className="fa-solid fa-check"></i> Submit Enrollment</>
                  }
                </button>
                <button type="button" onClick={() => setShowTrainEnrollModal(false)} style={{
                  flex:1, background:'#f3eeff', color:'#0f4ea8', border:'none', padding:'12px',
                  borderRadius:25, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif'
                }}>Cancel</button>
              </div>
            </form>
          )}
      </div>
    </Modal>
    )}

    {/* ── MY TRAINING ATTENDEES MODAL ── */}
    {myTrainAttendeesItem && (
    <Modal show={showMyTrainAttendeesModal} onHide={() => setShowMyTrainAttendeesModal(false)} centered size="lg" scrollable contentClassName="bg-transparent border-0 shadow-none p-0">
      <div style={{
        background:'white', borderRadius:24, width:'100%', maxWidth:700,
        boxShadow:'0 24px 64px rgba(95,44,130,0.28)'
      }}>
          {/* Header */}
          <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', borderRadius:'24px 24px 0 0', padding:'22px 28px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <h3 style={{color:'white', margin:0, fontSize:17, fontWeight:800}}>
                <i className="fa-solid fa-users" style={{marginRight:10}}></i>Enrolled Attendees
              </h3>
              <p style={{color:'rgba(255,255,255,0.75)', fontSize:13, margin:'4px 0 0'}}>{myTrainAttendeesItem.title}</p>
            </div>
            <button onClick={() => setShowMyTrainAttendeesModal(false)} style={{background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer', color:'white', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif'}}>✕</button>
          </div>

          <div style={{padding:'24px 28px'}}>
            {myTrainAttendeesLoading ? (
              <div style={{textAlign:'center', padding:'48px 0', color:'#00a3a3'}}>
                <i className="fa-solid fa-spinner fa-spin" style={{fontSize:32}}></i>
              </div>
            ) : myTrainAttendees.length === 0 ? (
              <div style={{textAlign:'center', padding:'48px 0'}}>
                <i className="fa-solid fa-users-slash" style={{fontSize:38, color:'#ddd', display:'block', marginBottom:12}}></i>
                <p style={{color:'#aaa', fontSize:14}}>No one has enrolled yet.</p>
              </div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <p style={{fontSize:13, color:'#888', marginBottom:12}}>
                  <strong style={{color:'#0f4ea8'}}>{myTrainAttendees.length}</strong> alumni enrolled
                </p>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                  <thead>
                    <tr style={{background:'#f3eeff'}}>
                      {['#','Name','Student ID','Email','Phone','Payment Method','Transaction ID','Enrolled At'].map(h => (
                        <th key={h} style={{padding:'10px 12px', textAlign:'left', fontWeight:700, color:'#0f4ea8', fontSize:12, letterSpacing:'0.3px', whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myTrainAttendees.map((a, i) => (
                      <tr key={a.id} style={{borderBottom:'1px solid #e8f2ff'}}>
                        <td style={{padding:'10px 12px', color:'#aaa'}}>{i+1}</td>
                        <td style={{padding:'10px 12px', fontWeight:600, color:'#333', display:'flex', alignItems:'center', gap:8}}>
                          <div style={{width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:700, flexShrink:0}}>
                            {a.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          {a.name}
                        </td>
                        <td style={{padding:'10px 12px', color:'#666'}}>{a.student_id || '—'}</td>
                        <td style={{padding:'10px 12px', color:'#666'}}>{a.email || '—'}</td>
                        <td style={{padding:'10px 12px', color:'#666'}}>{a.phone || '—'}</td>
                        <td style={{padding:'10px 12px', color:'#666'}}>{a.payment_method || '—'}</td>
                        <td style={{padding:'10px 12px'}}>
                          {a.transaction_id
                            ? <span style={{background:'#edfaf1', color:'#1a6e3c', borderRadius:6, padding:'3px 8px', fontSize:12, fontWeight:700}}>{a.transaction_id}</span>
                            : <span style={{color:'#ccc'}}>—</span>}
                        </td>
                        <td style={{padding:'10px 12px', color:'#aaa', fontSize:12, whiteSpace:'nowrap'}}>{a.registered_at?.slice(0,16)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{marginTop:20, display:'flex', justifyContent:'flex-end'}}>
              <button onClick={() => setShowMyTrainAttendeesModal(false)} style={{
                background:'#f3eeff', color:'#0f4ea8', border:'none', padding:'10px 28px',
                borderRadius:25, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif'
              }}>Close</button>
            </div>
          </div>
      </div>
    </Modal>
    )}

    {/* ── ALUMNI ADD TRAINING MODAL ── */}
    <Modal show={showAddTrainModal} onHide={() => setShowAddTrainModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
      <div style={{
        background:'white', borderRadius:24, width:'100%', maxWidth:520,
        boxShadow:'0 24px 64px rgba(95,44,130,0.28)'
      }}>
          {/* Header */}
          <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', borderRadius:'24px 24px 0 0', padding:'22px 28px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <h3 style={{color:'white', margin:0, fontSize:17, fontWeight:800}}>
                <i className="fa-solid fa-chalkboard-user" style={{marginRight:10}}></i>Add Training
              </h3>
              <p style={{color:'rgba(255,255,255,0.75)', fontSize:13, margin:'4px 0 0'}}>Share a training with other alumni</p>
            </div>
            <button onClick={() => setShowAddTrainModal(false)} style={{background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer', color:'white', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif'}}>✕</button>
          </div>

          {addTrainMsg === 'success' ? (
            <div style={{padding:'48px 32px', textAlign:'center'}}>
              <div style={{fontSize:52, marginBottom:12}}>✅</div>
              <h3 style={{color:'#1a6e3c', marginBottom:8}}>Training Added!</h3>
              <p style={{color:'#666', fontSize:14}}>Your training is now visible to all alumni.</p>
            </div>
          ) : (
            <form onSubmit={handleAlumniAddTraining} style={{padding:'24px 28px', display:'flex', flexDirection:'column', gap:14}}>
              {[
                { label:'Training Title *', name:'title',   type:'text',   placeholder:'e.g., React Bootcamp',   required:true },
                { label:'Trainer / Instructor *', name:'trainer', type:'text', placeholder:'Trainer name', required:true },
                { label:'Date *',          name:'date',    type:'date',   placeholder:'',                       required:true },
                { label:'Total Seats *',   name:'seats',   type:'number', placeholder:'e.g., 30',               required:true },
              ].map(f => (
                <div key={f.name}>
                  <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={addTrainForm[f.name]}
                    onChange={e => setAddTrainForm({...addTrainForm, [f.name]: e.target.value})}
                    required={f.required}
                    min={f.type==='number' ? 1 : undefined}
                    style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                  />
                </div>
              ))}
              <div>
                <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>Status</label>
                <select value={addTrainForm.status} onChange={e => setAddTrainForm({...addTrainForm, status: e.target.value})}
                  style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}>
                  <option>Upcoming</option><option>Ongoing</option><option>Full</option><option>Completed</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>
                  Registration Fee (৳) <span style={{color:'#aaa', fontWeight:400, textTransform:'none'}}>(optional)</span>
                </label>
                <input type="number" min="0" step="0.01" placeholder="0 = free"
                  value={addTrainForm.fee}
                  onChange={e => setAddTrainForm({...addTrainForm, fee: e.target.value})}
                  style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:12, fontWeight:700, color:'#0f4ea8', letterSpacing:'0.3px', textTransform:'uppercase', display:'block', marginBottom:6}}>
                  Payment Account <span style={{color:'#aaa', fontWeight:400, textTransform:'none'}}>(optional)</span>
                </label>
                <input type="text" placeholder="e.g., bKash: 01712345678"
                  value={addTrainForm.payment_account}
                  onChange={e => setAddTrainForm({...addTrainForm, payment_account: e.target.value})}
                  style={{width:'100%', padding:'10px 14px', border:'1.5px solid #e0d5f5', borderRadius:10, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', color:'#333', boxSizing:'border-box'}}
                />
              </div>

              {addTrainMsg === 'error' && (
                <p style={{color:'#ff6b6b', fontSize:13, margin:0}}>Failed to add training. Please try again.</p>
              )}

              <div style={{display:'flex', gap:10, marginTop:4}}>
                <button type="submit" disabled={addTrainSubmitting} style={{
                  flex:1, background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', color:'white',
                  border:'none', padding:'12px', borderRadius:25, fontSize:14, fontWeight:700,
                  cursor: addTrainSubmitting ? 'not-allowed' : 'pointer', fontFamily:'Inter,sans-serif',
                  opacity: addTrainSubmitting ? 0.7 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8
                }}>
                  {addTrainSubmitting
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Adding…</>
                    : <><i className="fa-solid fa-plus"></i> Add Training</>
                  }
                </button>
                <button type="button" onClick={() => setShowAddTrainModal(false)} style={{
                  flex:1, background:'#f3eeff', color:'#0f4ea8', border:'none', padding:'12px',
                  borderRadius:25, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif'
                }}>Cancel</button>
              </div>
            </form>
          )}
      </div>
    </Modal>
    </>
  )
}

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from 'react-bootstrap'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import '../styles/admin.css'
import {
  getPending, getAlumni, getStudents, approveAlumni, rejectAlumni, deleteAlumni,
  getEvents, addEvent, deleteEvent,
  getTransactions, addTransaction, deleteTransaction,
  getFundRequests, addFundRequest,
  getTrainings, addTraining, deleteTraining,
  getJobs, addJob, deleteJob, getPendingJobs, approveJob,
  getExistingLists, uploadExistingList, deleteExistingList, getExistingListData,
  getExistAlumni, addExistAlumni, bulkAddExistAlumni, deleteExistAlumni,
  getStats,
  getEventAttendees,
  getTrainingAttendees,
  getUpgradeRequests, approveUpgrade, rejectUpgrade,
  updateEvent,
  sendAdminEmail,
  getEmailLogs,
} from '../services/api'

// These static arrays remain for chart demo data
const __UNUSED__ = null

const alumniGrowthData = [
  { month: 'Sep', alumni: 12 }, { month: 'Oct', alumni: 19 },
  { month: 'Nov', alumni: 25 }, { month: 'Dec', alumni: 30 },
  { month: 'Jan', alumni: 38 }, { month: 'Feb', alumni: 45 },
  { month: 'Mar', alumni: 48 },
]
const fundChartData = [
  { month: 'Oct', amount: 8000  }, { month: 'Nov', amount: 15000 },
  { month: 'Dec', amount: 9500  }, { month: 'Jan', amount: 21500 },
  { month: 'Feb', amount: 17800 }, { month: 'Mar', amount: 21500 },
]
const deptData = [
  { name: 'CSE', value: 38 }, { name: 'EEE', value: 22 },
  { name: 'BBA', value: 18 }, { name: 'MBA', value: 12 }, { name: 'ICE', value: 10 },
]
const PIE_COLORS = ['#0f4ea8','#00a3a3','#d7f4ff','#7c3aad','#b8e5f5']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('dashboard')

  const [pending,      setPending]      = useState([])
  const [alumni,       setAlumni]       = useState([])
  const [students,     setStudents]     = useState([])
  const [events,       setEvents]       = useState([])
  const [transactions, setTransactions] = useState([])
  const [fundRequests, setFundRequests] = useState([])
  const [trainings,    setTrainings]    = useState([])
  const [jobs,         setJobs]         = useState([])
  const [pendingJobs,  setPendingJobs]  = useState([])
  const [existingLists, setExistingLists] = useState([])
  const [upgradeRequests, setUpgradeRequests] = useState([])
  const [stats,        setStats]        = useState({ total_alumni:0, total_students:0, pending:0, events:0, total_funds:0, total_jobs:0 })
  const [loading,      setLoading]      = useState(true)

  const [showModal,      setShowModal]      = useState(false)
  const [newEvent,       setNewEvent]       = useState({ title:'', date:'', location:'', description:'', fee:'', payment_account:'', audience:'both' })
  const [showEditModal,  setShowEditModal]  = useState(false)
  const [editingEvent,   setEditingEvent]   = useState(null)
  const [showAttendeesModal, setShowAttendeesModal] = useState(false)
  const [attendeesEvent,     setAttendeesEvent]     = useState(null)
  const [attendees,          setAttendees]          = useState([])
  const [attendeesLoading,   setAttendeesLoading]   = useState(false)
  const [attendeesSearch,    setAttendeesSearch]    = useState('')
  const [showFundReqModal, setShowFundReqModal] = useState(false)
  const [newFundReq, setNewFundReq] = useState({
    title:'', purpose:'', target_amount:'', payment_option:'both',
    bkash_number:'', bank_account_name:'', bank_account_number:'', bank_name:''
  })
  const [showTrainModal, setShowTrainModal] = useState(false)
  const [newTraining,    setNewTraining]    = useState({ title:'', trainer:'', date:'', seats:'', status:'Upcoming', fee:'', payment_account:'' })
  const [showTrainAttendeesModal, setShowTrainAttendeesModal] = useState(false)
  const [trainAttendeesTraining,  setTrainAttendeesTraining]  = useState(null)
  const [trainAttendees,          setTrainAttendees]          = useState([])
  const [trainAttendeesLoading,   setTrainAttendeesLoading]   = useState(false)
  const [trainAttendeesSearch,    setTrainAttendeesSearch]    = useState('')
  const [showJobModal,   setShowJobModal]   = useState(false)
  const [newJob,         setNewJob]         = useState({ title:'', company:'', location:'', type:'Full-time', deadline:'', description:'', apply_link:'' })
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchField,    setSearchField]    = useState('name')
  const [pendingTab,     setPendingTab]     = useState('alumni')
  const [emailAudience,  setEmailAudience]  = useState('all')
  const [selectedSessions, setSelectedSessions] = useState([])
  const [emailSearch, setEmailSearch] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailPreheader, setEmailPreheader] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailCallToAction, setEmailCallToAction] = useState('Visit AlumniConnect')
  const [emailSending, setEmailSending] = useState(false)
  const [emailLogs, setEmailLogs] = useState([])
  const [emailLogLoading, setEmailLogLoading] = useState(false)
  const [showEmailListModal, setShowEmailListModal] = useState(false)
  const [smsAudience, setSmsAudience] = useState('all')
  const [selectedSmsSessions, setSelectedSmsSessions] = useState([])
  const [smsSearch, setSmsSearch] = useState('')
  const [smsTemplateName, setSmsTemplateName] = useState('General Notice')
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSenderName, setSmsSenderName] = useState('AlumniConnect Admin')
  const [showSmsListModal, setShowSmsListModal] = useState(false)
  const [existingListFile, setExistingListFile] = useState(null)
  const [existingListUploading, setExistingListUploading] = useState(false)
  const [showExcelDataModal, setShowExcelDataModal] = useState(false)
  const [excelDataLoading, setExcelDataLoading] = useState(false)
  const [excelData, setExcelData] = useState({headers: [], rows: []})
  const [selectedExcelListId, setSelectedExcelListId] = useState(null)
  
  // Existing Alumni list state
  const [existAlumni, setExistAlumni] = useState([])
  const [existAlumniLoading, setExistAlumniLoading] = useState(false)
  const [showAddAlumniModal, setShowAddAlumniModal] = useState(false)
  const [newAlumniForm, setNewAlumniForm] = useState({ name:'', student_id:'', session:'', email:'', phone:'', department:'ICE' })
  const [existAlumniFile, setExistAlumniFile] = useState(null)
  const [existAlumniUploading, setExistAlumniUploading] = useState(false)
  const [existAlumniSearch, setExistAlumniSearch] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pd, al, st, ev, tx, fr, tr, jb, stats_, pj, ur, el, ea] = await Promise.all([
        getPending(), getAlumni(), getStudents(), getEvents(),
        getTransactions(), getFundRequests({ status: 'open' }), getTrainings(), getJobs(), getStats(), getPendingJobs(),
        getUpgradeRequests(),
        getExistingLists(),
        getExistAlumni(),
      ])
      if (pd.ok) setPending(pd.data)
      if (al.ok) setAlumni(al.data)
      if (st.ok) setStudents(st.data)
      if (ev.ok) setEvents(ev.data)
      if (tx.ok) setTransactions(tx.data)
      if (fr.ok) setFundRequests(fr.data)
      if (tr.ok) setTrainings(tr.data)
      if (jb.ok) setJobs(jb.data)
      if (stats_.ok) setStats(stats_.data)
      if (pj.ok) setPendingJobs(pj.data)
      if (ur.ok) setUpgradeRequests(ur.data)
      if (el.ok) setExistingLists(el.data)
      if (ea.ok) setExistAlumni(ea.data)
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const fetchEmailLogs = useCallback(async () => {
    setEmailLogLoading(true)
    try {
      const { ok, data } = await getEmailLogs()
      if (ok) setEmailLogs(Array.isArray(data) ? data : [])
    } catch (_) {}
    setEmailLogLoading(false)
  }, [])

  useEffect(() => {
    if (activeView === 'email-center') fetchEmailLogs()
  }, [activeView, fetchEmailLogs])

  const handleApprove = async (id) => {
    const { ok } = await approveAlumni(id)
    if (ok) {
      const person = { ...pending.find(p => p.id === id), status: 'approved' }
      setPending(prev => prev.filter(p => p.id !== id))
      if (person.user_type === 'student') {
        setStudents(prev => [...prev, person])
        setStats(s => ({ ...s, total_students: s.total_students + 1, pending: Math.max(0, s.pending - 1) }))
      } else {
        setAlumni(prev => [...prev, person])
        setStats(s => ({ ...s, total_alumni: s.total_alumni + 1, pending: Math.max(0, s.pending - 1) }))
      }
    }
  }

  const handleReject = async (id) => {
    const { ok } = await rejectAlumni(id)
    if (ok) {
      setPending(prev => prev.filter(p => p.id !== id))
      setStats(s => ({ ...s, pending: Math.max(0, s.pending - 1) }))
    }
  }

  const handleApproveUpgrade = async (id) => {
    const { ok } = await approveUpgrade(id)
    if (ok) {
      const person = upgradeRequests.find(u => u.id === id)
      setUpgradeRequests(prev => prev.filter(u => u.id !== id))
      if (person) {
        // Move from students list to alumni list
        setStudents(prev => prev.filter(s => s.id !== id))
        setAlumni(prev => [...prev, { ...person, user_type: 'alumni' }])
        setStats(s => ({ ...s, total_alumni: s.total_alumni + 1, total_students: Math.max(0, s.total_students - 1) }))
      }
    }
  }

  const handleRejectUpgrade = async (id) => {
    const { ok } = await rejectUpgrade(id)
    if (ok) {
      setUpgradeRequests(prev => prev.filter(u => u.id !== id))
    }
  }

  const handleDeleteAlumni = async (id) => {
    const { ok } = await deleteAlumni(id)
    if (ok) {
      setAlumni(prev => prev.filter(a => a.id !== id))
      setStats(s => ({ ...s, total_alumni: Math.max(0, s.total_alumni - 1) }))
    }
  }

  const handleDeleteStudent = async (id) => {
    const { ok } = await deleteAlumni(id)
    if (ok) {
      setStudents(prev => prev.filter(s => s.id !== id))
      setStats(s => ({ ...s, total_students: Math.max(0, s.total_students - 1) }))
    }
  }

  const handleAddEvent = async (e) => {
    e.preventDefault()
    const { ok, data } = await addEvent({ ...newEvent, fee: newEvent.fee ? Number(newEvent.fee) : 0 })
    if (ok) {
      setEvents(prev => [...prev, { ...newEvent, id: data.id, fee: Number(newEvent.fee)||0 }])
      setStats(s => ({ ...s, events: s.events + 1 }))
      setNewEvent({ title:'', date:'', location:'', description:'', fee:'', payment_account:'', audience:'both' })
      setShowModal(false)
    }
  }

  const handleUpdateEvent = async (e) => {
    e.preventDefault()
    const { ok } = await updateEvent(editingEvent.id, { ...editingEvent, fee: editingEvent.fee ? Number(editingEvent.fee) : 0 })
    if (ok) {
      setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? { ...editingEvent, fee: Number(editingEvent.fee)||0 } : ev))
      setShowEditModal(false)
      setEditingEvent(null)
    }
  }

  const handleViewAttendees = async (ev) => {
    setAttendeesEvent(ev)
    setAttendeesLoading(true)
    setShowAttendeesModal(true)
    const { ok, data } = await getEventAttendees(ev.id)
    if (ok) setAttendees(data)
    setAttendeesLoading(false)
  }

  const handleDeleteEvent = async (id) => {
    const { ok } = await deleteEvent(id)
    if (ok) {
      setEvents(prev => prev.filter(ev => ev.id !== id))
      setStats(s => ({ ...s, events: Math.max(0, s.events - 1) }))
    }
  }

  const handleAddFundRequest = async (e) => {
    e.preventDefault()
    const payload = {
      ...newFundReq,
      target_amount: Number(newFundReq.target_amount),
      created_by: 'admin',
      status: 'open',
    }
    try {
      const { ok, data } = await addFundRequest(payload)
      if (!ok) {
        alert('Could not publish request. Please try again.')
        setShowFundReqModal(false)
        setActiveView('alumni')
        return
      }

      setFundRequests(prev => [{ ...payload, id: data.id }, ...prev])
      setNewFundReq({
        title:'', purpose:'', target_amount:'', payment_option:'both',
        bkash_number:'', bank_account_name:'', bank_account_number:'', bank_name:''
      })
      setShowFundReqModal(false)
      setActiveView('alumni')
    } catch (_) {
      alert('Could not publish request. Please try again.')
      setShowFundReqModal(false)
      setActiveView('alumni')
    }
  }

  const handleDeleteTx = async (id) => {
    const { ok } = await deleteTransaction(id)
    if (ok) setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const handleAddTraining = async (e) => {
    e.preventDefault()
    const { ok, data } = await addTraining({ ...newTraining, seats: Number(newTraining.seats), enrolled: 0, fee: Number(newTraining.fee)||0 })
    if (ok) {
      setTrainings(prev => [...prev, { ...newTraining, id: data.id, enrolled: 0, seats: Number(newTraining.seats), fee: Number(newTraining.fee)||0 }])
      setNewTraining({ title:'', trainer:'', date:'', seats:'', status:'Upcoming', fee:'', payment_account:'' })
      setShowTrainModal(false)
    }
  }

  const handleViewTrainingAttendees = async (tr) => {
    setTrainAttendeesTraining(tr)
    setTrainAttendees([])
    setTrainAttendeesLoading(true)
    setShowTrainAttendeesModal(true)
    const { ok, data } = await getTrainingAttendees(tr.id)
    if (ok) setTrainAttendees(data)
    setTrainAttendeesLoading(false)
  }

  const handleDeleteTraining = async (id) => {
    const { ok } = await deleteTraining(id)
    if (ok) setTrainings(prev => prev.filter(t => t.id !== id))
  }

  const handleAddJob = async (e) => {
    e.preventDefault()
    const { ok, data } = await addJob(newJob)
    if (ok) {
      setJobs(prev => [{ ...newJob, id: data.id, created_at: new Date().toISOString() }, ...prev])
      setStats(s => ({ ...s, total_jobs: s.total_jobs + 1 }))
      setNewJob({ title:'', company:'', location:'', type:'Full-time', deadline:'', description:'', apply_link:'' })
      setShowJobModal(false)
    }
  }

  const handleApproveJob = async (id) => {
    const { ok } = await approveJob(id)
    if (ok) {
      const job = pendingJobs.find(j => j.id === id)
      if (job) {
        setPendingJobs(prev => prev.filter(j => j.id !== id))
        setJobs(prev => [{ ...job, status:'approved' }, ...prev])
        setStats(s => ({ ...s, total_jobs: s.total_jobs + 1 }))
      }
    }
  }

  const handleDeleteJob = async (id) => {
    const { ok } = await deleteJob(id)
    if (ok) {
      setJobs(prev => prev.filter(j => j.id !== id))
      setStats(s => ({ ...s, total_jobs: Math.max(0, s.total_jobs - 1) }))
    }
  }

  const handleUploadExistingList = async (e) => {
    e.preventDefault()
    if (!existingListFile) {
      alert('Please choose an Excel file first.')
      return
    }

    const lowerName = String(existingListFile.name || '').toLowerCase()
    if (!(lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls'))) {
      alert('Only .xlsx or .xls files are supported.')
      return
    }

    const formData = new FormData()
    formData.append('file', existingListFile)

    setExistingListUploading(true)
    const { ok, data } = await uploadExistingList(formData)
    setExistingListUploading(false)

    if (!ok) {
      alert(data?.message || 'Upload failed. Please try again.')
      return
    }

    setExistingListFile(null)
    const fileInput = document.getElementById('existing-list-file-input')
    if (fileInput) fileInput.value = ''

    const { ok: listOk, data: listData } = await getExistingLists()
    if (listOk) {
      setExistingLists(Array.isArray(listData) ? listData : [])
    }
    alert('Existing list uploaded successfully.')
  }

  const handleDeleteExistingList = async (id) => {
    const confirmed = window.confirm('Delete this list permanently?')
    if (!confirmed) return

    const { ok, data } = await deleteExistingList(id)
    if (!ok) {
      alert(data?.message || 'Could not delete list.')
      return
    }

    setExistingLists((prev) => prev.filter((item) => item.id !== id))
  }

  const handleViewExcelData = async (id) => {
    setSelectedExcelListId(id)
    setExcelDataLoading(true)
    const { ok, data } = await getExistingListData(id)
    setExcelDataLoading(false)
    
    if (!ok) {
      alert(data?.message || 'Could not load Excel data.')
      return
    }
    
    setExcelData({
      headers: data.headers || [],
      rows: data.rows || [],
      total: data.total || 0,
      title: data.title || 'Excel Data'
    })
    setShowExcelDataModal(true)
  }

  // ─── Existing Alumni Handlers ───────────────────────
  const handleAddAlumni = async (e) => {
    e.preventDefault()
    if (!newAlumniForm.name || !newAlumniForm.student_id || !newAlumniForm.email || !newAlumniForm.session || !newAlumniForm.phone) {
      alert('Please fill in all required fields')
      return
    }

    const { ok, data } = await addExistAlumni(newAlumniForm)
    if (!ok) {
      alert(data?.message || 'Failed to add alumni')
      return
    }

    setExistAlumni(prev => [{ ...newAlumniForm, id: data.id, created_at: new Date().toISOString() }, ...prev])
    setNewAlumniForm({ name:'', student_id:'', session:'', email:'', phone:'', department:'ICE' })
    setShowAddAlumniModal(false)
    alert('Alumni added successfully')
  }

  const handleDeleteExistAlumni = async (id) => {
    if (!window.confirm('Delete this alumni record?')) return
    
    const { ok } = await deleteExistAlumni(id)
    if (ok) {
      setExistAlumni(prev => prev.filter(a => a.id !== id))
    } else {
      alert('Failed to delete alumni')
    }
  }

  const handleBulkUploadAlumni = async (e) => {
    e.preventDefault()
    if (!existAlumniFile) {
      alert('Please select an Excel file')
      return
    }

    const lowerName = String(existAlumniFile.name || '').toLowerCase()
    if (!(lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls'))) {
      alert('Only .xlsx or .xls files are supported.')
      return
    }

    setExistAlumniUploading(true)
    const formData = new FormData()
    formData.append('file', existAlumniFile)
    
    const { ok: listOk, data: listData } = await uploadExistingList(formData)
    
    if (!listOk) {
      alert(listData?.message || 'Upload failed')
      setExistAlumniUploading(false)
      return
    }

    const listId = listData.id
    const { ok: dataOk, data: excelData } = await getExistingListData(listId)
    setExistAlumniUploading(false)

    if (!dataOk) {
      alert('Could not read Excel file data')
      return
    }

    // Extract name, student_id, session, email, phone from Excel rows
    const alumniRecords = excelData.rows.map(row => ({
      name: row.name || row.Name || row['Alumni Name'] || '',
      student_id: row.student_id || row['Student ID'] || row['ID'] || row.id || '',
      email: row.email || row.Email || '',
      session: row.session || row.Session || '',
      phone: row.phone || row.Phone || '',
      department: row.department || row.Department || 'ICE'
    })).filter(r => r.name && r.student_id && r.email && r.session && r.phone)

    if (alumniRecords.length === 0) {
      alert('No valid alumni records found in Excel file. Please ensure columns include: name, student_id, email, session, phone')
      return
    }

    const { ok: addOk, data: addData } = await bulkAddExistAlumni(alumniRecords)
    if (!addOk) {
      alert(addData?.message || 'Failed to add alumni records')
      return
    }

    alert(`${addData.added} alumni added successfully${addData.errors?.length > 0 ? `, ${addData.errors.length} failed` : ''}`)
    
    // Refresh the list
    const { ok: refOk, data: refData } = await getExistAlumni()
    if (refOk) setExistAlumni(Array.isArray(refData) ? refData : [])
    
    setExistAlumniFile(null)
    const fileInput = document.getElementById('exist-alumni-file-input')
    if (fileInput) fileInput.value = ''
  }

  const handleLogout = () => navigate('/')
  const paidTransactions = transactions.filter(t => (t.status || 'paid') === 'paid')
  const totalFund = paidTransactions.reduce((s, t) => s + Number(t.amount || 0), 0)

  const emailBaseRecipients = useMemo(() => {
    const normalizedAlumni = alumni.map((person) => ({
      ...person,
      role: 'alumni',
      session: person.session || 'Unknown Session',
    }))
    const normalizedStudents = students.map((person) => ({
      ...person,
      role: 'student',
      session: person.session || 'Unknown Session',
    }))
    const normalizedExistAlumni = existAlumni.map((person) => ({
      ...person,
      role: 'existing-alumni',
      session: person.session || 'Existing Alumni List',
    }))

    if (emailAudience === 'alumni') return normalizedAlumni
    if (emailAudience === 'students') return normalizedStudents
    if (emailAudience === 'existinglist') return normalizedExistAlumni
    return [...normalizedAlumni, ...normalizedStudents]
  }, [alumni, students, existAlumni, emailAudience])

  const availableSessions = useMemo(() => {
    const uniq = Array.from(new Set(emailBaseRecipients.map((person) => String(person.session || '').trim()).filter(Boolean)))
    return uniq.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
  }, [emailBaseRecipients])

  const emailRecipients = useMemo(() => {
    const q = emailSearch.trim().toLowerCase()
    return emailBaseRecipients.filter((person) => {
      const sessionOk = selectedSessions.length === 0 || selectedSessions.includes(person.session)
      if (!sessionOk) return false
      if (!q) return true

      return (
        String(person.name || '').toLowerCase().includes(q) ||
        String(person.email || '').toLowerCase().includes(q) ||
        String(person.session || '').toLowerCase().includes(q) ||
        String(person.student_id || '').toLowerCase().includes(q)
      )
    })
  }, [emailBaseRecipients, selectedSessions, emailSearch])

  const toggleEmailSession = (session) => {
    setSelectedSessions((prev) => (
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session]
    ))
  }

  const selectedAudienceCount = emailBaseRecipients.length
  const canSendEmail = emailRecipients.length > 0 && emailSubject.trim() && emailBody.trim() && !emailSending

  const smsBaseRecipients = useMemo(() => {
    const normalizedAlumni = alumni.map((person) => ({
      ...person,
      role: 'alumni',
      session: person.session || 'Unknown Session',
    }))
    const normalizedStudents = students.map((person) => ({
      ...person,
      role: 'student',
      session: person.session || 'Unknown Session',
    }))
    const normalizedExistAlumni = existAlumni.map((person) => ({
      ...person,
      role: 'existing-alumni',
      session: person.session || 'Existing Alumni List',
    }))

    if (smsAudience === 'alumni') return normalizedAlumni
    if (smsAudience === 'students') return normalizedStudents
    if (smsAudience === 'existinglist') return normalizedExistAlumni
    return [...normalizedAlumni, ...normalizedStudents]
  }, [alumni, students, existAlumni, smsAudience])

  const availableSmsSessions = useMemo(() => {
    const uniq = Array.from(new Set(smsBaseRecipients.map((person) => String(person.session || '').trim()).filter(Boolean)))
    return uniq.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
  }, [smsBaseRecipients])

  const smsRecipients = useMemo(() => {
    const q = smsSearch.trim().toLowerCase()
    return smsBaseRecipients.filter((person) => {
      const sessionOk = selectedSmsSessions.length === 0 || selectedSmsSessions.includes(person.session)
      if (!sessionOk) return false
      if (!q) return true

      return (
        String(person.name || '').toLowerCase().includes(q) ||
        String(person.phone || '').toLowerCase().includes(q) ||
        String(person.email || '').toLowerCase().includes(q) ||
        String(person.session || '').toLowerCase().includes(q) ||
        String(person.student_id || '').toLowerCase().includes(q)
      )
    })
  }, [smsBaseRecipients, selectedSmsSessions, smsSearch])

  const smsDeliverableRecipients = useMemo(
    () => smsRecipients.filter((person) => String(person.phone || '').trim()),
    [smsRecipients],
  )

  const toggleSmsSession = (session) => {
    setSelectedSmsSessions((prev) => (
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session]
    ))
  }

  const handleSendEmail = async () => {
    if (!canSendEmail) return
    setEmailSending(true)
    const payload = {
      recipient_emails: emailRecipients.map((p) => p.email).filter(Boolean),
      subject: emailSubject,
      preheader: emailPreheader,
      message: emailBody,
      cta_text: emailCallToAction,
    }
    const { ok, data } = await sendAdminEmail(payload)
    setEmailSending(false)

    await fetchEmailLogs()

    if (ok) {
      alert(`Email sent successfully. Sent: ${data.sent}, Failed: ${data.failed}`)
      return
    }

    alert(data?.message || 'Email send failed. Check SMTP settings and try again.')
  }

  const navItems = [
    { view:'dashboard',    icon:'fa-gauge-high',      label:'Dashboard',          section:'Main Menu' },
    { view:'pending',      icon:'fa-clock',            label:'Pending Approvals',  badge: pending.length, section:null },
    { view:'alumni',       icon:'fa-users',            label:'All Alumni',         section:null },
    { view:'students',     icon:'fa-user-graduate',    label:'All Students',       section:null },
    { view:'events',       icon:'fa-calendar-days',   label:'Events',             section:null },
    { view:'jobs',         icon:'fa-briefcase',        label:'Jobs',               badge: pendingJobs.length, section:null },
    { view:'exist-alumni', icon:'fa-list',             label:'Existing Alumni list', section:null },
    { view:'email-center', icon:'fa-envelope-open-text', label:'Email Center',    section:'Communication' },
    { view:'sms-center',   icon:'fa-comments',         label:'SMS Center',         section:null },
    { view:'transactions', icon:'fa-money-bill-wave', label:'Fund Transactions',  section:'Finance & Growth' },
    { view:'trainings',    icon:'fa-chalkboard-user', label:'Trainings',          section:null },
  ]
  const titles = {
    dashboard:    { title:'Dashboard',          sub:'Welcome back, Admin 👋' },
    pending:      { title:'Pending Approvals',  sub:'Review new registrations' },
    alumni:       { title:'All Alumni',         sub:'Manage registered alumni' },
    students:     { title:'All Students',       sub:'Manage registered students' },
    events:       { title:'Events Management',  sub:'Create and manage events' },
    jobs:         { title:'Jobs',               sub:'Post and manage job listings' },
    'exist-alumni': { title:'Existing Alumni list', sub:'Add alumni manually or via Excel uploads' },
    'email-center': { title:'Email Center',     sub:'Create polished broadcast emails for selected sessions' },
    'sms-center': { title:'SMS Center',         sub:'Build segmented SMS campaigns with audience and session targeting' },
    transactions: { title:'Fund Transactions',  sub:'Track donations & sponsorships' },
    trainings:    { title:'Trainings',          sub:'Manage alumni training programs' },
    charts:       { title:'Analytics & Charts', sub:'Visualize alumni growth & fund data' },
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',
      background:'linear-gradient(135deg,#f3eeff 0%,#fdf6ff 100%)',
      fontFamily:'Inter,sans-serif', color:'#0f4ea8', fontSize:18, gap:12
    }}>
      <i className="fa-solid fa-spinner fa-spin"></i> Loading\u2026
    </div>
  )

  return (
    <div className="admin-wrapper">

      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="logo-circle">A</div>
          <div><span>ALUMNICONNECT</span><small>Admin Panel</small></div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <span key={item.view}>
              {item.section && <div className="sidebar-section-label">{item.section}</div>}
              <button className={activeView === item.view ? 'active' : ''} onClick={() => setActiveView(item.view)}>
                <i className={`fa-solid ${item.icon}`}></i>
                {item.label}
                {item.badge > 0 && (
                  <span style={{marginLeft:'auto', background:'#d7f4ff', color:'#0f4ea8',
                    fontSize:'11px', fontWeight:700, padding:'1px 8px', borderRadius:'20px'}}>
                    {item.badge}
                  </span>
                )}
              </button>
            </span>
          ))}
        </nav>
      </aside>

      {/* MAIN */}
      <div className="admin-main">

        {/* Topbar */}
        <div className="admin-topbar">
          <div>
            <h1>{titles[activeView].title}</h1>
            <p>{titles[activeView].sub}</p>
          </div>
          {(activeView === 'alumni' || activeView === 'students' || activeView === 'pending') && (
            <div className="topbar-search">
              <select value={searchField} onChange={e => { setSearchField(e.target.value); setSearchQuery('') }} className="search-field-select">
                <option value="name">Name</option>
                <option value="student_id">Student ID</option>
                <option value="session">Session</option>
                <option value="designation">Work Type</option>
                <option value="company">Organization</option>
              </select>
              <div className="search-input-wrap">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="text" className="search-input" placeholder={`Search by ${searchField}\u2026`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                {searchQuery && <button className="search-clear" onClick={() => setSearchQuery('')}>\u2715</button>}
              </div>
            </div>
          )}
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div className="admin-badge"><i className="fa-solid fa-user-shield"></i> Admin</div>
            <button onClick={handleLogout} style={{
              display:'flex', alignItems:'center', gap:8, background:'#ffe0e0', color:'#8b1a1a',
              border:'none', padding:'9px 18px', borderRadius:25, fontWeight:600, fontSize:14,
              cursor:'pointer', transition:'0.2s', fontFamily:'Inter,sans-serif'
            }}
            onMouseEnter={e=>e.currentTarget.style.background='#ffb3b3'}
            onMouseLeave={e=>e.currentTarget.style.background='#ffe0e0'}>
              <i className="fa-solid fa-right-from-bracket"></i> Logout
            </button>
          </div>
        </div>

        <div className="admin-content">

          {/* DASHBOARD */}
          {activeView === 'dashboard' && (
            <>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-icon purple"><i className="fa-solid fa-users"></i></div>
                  <div className="stat-info"><h3>{stats.total_alumni}</h3><p>Total Alumni</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon blue" style={{background:'#e0f0ff'}}><i className="fa-solid fa-user-graduate" style={{color:'#1a6eb5'}}></i></div>
                  <div className="stat-info"><h3>{stats.total_students}</h3><p>Total Students</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon orange"><i className="fa-solid fa-clock"></i></div>
                  <div className="stat-info"><h3>{stats.pending}</h3><p>Pending Approvals</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green"><i className="fa-solid fa-calendar-days"></i></div>
                  <div className="stat-info"><h3>{stats.events}</h3><p>Total Events</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon pink"><i className="fa-solid fa-user-check"></i></div>
                  <div className="stat-info"><h3>{stats.total_alumni + stats.total_students}</h3><p>Registered Users</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green"><i className="fa-solid fa-bangladeshi-taka-sign"></i></div>
                  <div className="stat-info"><h3>{'\u09f3'}{Number(stats.total_funds).toLocaleString()}</h3><p>Total Fund</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon purple"><i className="fa-solid fa-chalkboard-user"></i></div>
                  <div className="stat-info"><h3>{trainings.length}</h3><p>Trainings</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon orange"><i className="fa-solid fa-briefcase"></i></div>
                  <div className="stat-info"><h3>{stats.total_jobs}</h3><p>Total Jobs</p></div>
                </div>
              </div>
              <div className="section-title">
                <i className="fa-solid fa-clock" style={{color:'#00a3a3'}}></i>
                Recent Pending Approvals
                <span className="badge-count">{pending.length}</span>
              </div>
              <PendingCards rows={pending.slice(0,3)} onApprove={handleApprove} onReject={handleReject} />
            </>
          )}

          {/* PENDING APPROVALS */}
          {activeView === 'pending' && (
            <PendingSection
              pending={pending}
              upgradeRequests={upgradeRequests}
              pendingTab={pendingTab}
              setPendingTab={setPendingTab}
              searchQuery={searchQuery}
              searchField={searchField}
              onApprove={handleApprove}
              onReject={handleReject}
              onApproveUpgrade={handleApproveUpgrade}
              onRejectUpgrade={handleRejectUpgrade}
            />
          )}
          {activeView === 'alumni' && (
            <>
              <div className="section-title">
                <i className="fa-solid fa-users" style={{color:'#00a3a3'}}></i>
                All Alumni <span className="badge-count">{alumni.length}</span>
              </div>
              {alumni.length === 0 ? (
                <div className="admin-table-wrap"><div className="empty-state"><i className="fa-solid fa-users"></i><p>No approved alumni yet.</p></div></div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>Name</th><th>Student ID</th><th>Email</th><th>Phone</th><th>Session</th><th>Company</th><th>Designation</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {alumni.filter(a => {
                        if (!searchQuery.trim()) return true
                        return String(a[searchField] ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
                      }).map((a, i) => (
                        <tr key={a.id}>
                          <td>{i+1}</td>
                          <td><div className="alumni-name-cell">{a.photo_url ? <img src={a.photo_url} alt={a.name} className="table-avatar" style={{objectFit:'cover'}} /> : <div className="table-avatar">{a.name[0]}</div>}{a.name}</div></td>
                          <td>{a.student_id || '\u2014'}</td>
                          <td>{a.email}</td>
                          <td>{a.phone}</td>
                          <td>{a.session}</td>
                          <td>{a.company}</td>
                          <td>{a.designation}</td>
                          <td><span className="status-badge approved">\u2714 Approved</span></td>
                          <td><button className="btn-delete" onClick={() => handleDeleteAlumni(a.id)}><i className="fa-solid fa-trash"></i> Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ALL STUDENTS */}
          {activeView === 'students' && (
            <>
              <div className="section-title">
                <i className="fa-solid fa-user-graduate" style={{color:'#00a3a3'}}></i>
                All Students <span className="badge-count">{students.length}</span>
              </div>
              {students.length === 0 ? (
                <div className="admin-table-wrap"><div className="empty-state"><i className="fa-solid fa-user-graduate"></i><p>No approved students yet.</p></div></div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>Name</th><th>Student ID</th><th>Email</th><th>Phone</th><th>Department</th><th>Session</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {students.filter(a => {
                        if (!searchQuery.trim()) return true
                        return String(a[searchField] ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
                      }).map((a, i) => (
                        <tr key={a.id}>
                          <td>{i+1}</td>
                          <td><div className="alumni-name-cell">{a.photo_url ? <img src={a.photo_url} alt={a.name} className="table-avatar" style={{objectFit:'cover'}} /> : <div className="table-avatar">{a.name[0]}</div>}{a.name}</div></td>
                          <td>{a.student_id || '—'}</td>
                          <td>{a.email}</td>
                          <td>{a.phone}</td>
                          <td>{a.department}</td>
                          <td>{a.session}</td>
                          <td><span className="status-badge approved">✔ Approved</span></td>
                          <td><button className="btn-delete" onClick={() => handleDeleteStudent(a.id)}><i className="fa-solid fa-trash"></i> Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* FUND TRANSACTIONS */}
          {activeView === 'email-center' && (
            <>
              <div className="email-center-grid">
                <section className="email-panel email-panel-targets">
                  <div className="email-panel-head">
                    <h3><i className="fa-solid fa-filter"></i> Audience Filters</h3>
                    <p>Choose audience type, then select one or more sessions.</p>
                  </div>

                  <div className="email-audience-toggle" role="group" aria-label="Email audience toggle">
                    <button className={emailAudience === 'all' ? 'active' : ''} onClick={() => setEmailAudience('all')}>
                      <i className="fa-solid fa-users"></i> All Users
                    </button>
                    <button className={emailAudience === 'alumni' ? 'active' : ''} onClick={() => setEmailAudience('alumni')}>
                      <i className="fa-solid fa-user-tie"></i> Alumni
                    </button>
                    <button className={emailAudience === 'students' ? 'active' : ''} onClick={() => setEmailAudience('students')}>
                      <i className="fa-solid fa-user-graduate"></i> Students
                    </button>
                    <button className={emailAudience === 'existinglist' ? 'active' : ''} onClick={() => setEmailAudience('existinglist')}>
                      <i className="fa-solid fa-list"></i> Existing List
                    </button>
                  </div>

                  <div className="email-session-toolbar">
                    <h4>Session Filter</h4>
                    <div>
                      <button type="button" className="btn-session-action" onClick={() => setSelectedSessions(availableSessions)}>All</button>
                      <button type="button" className="btn-session-action" onClick={() => setSelectedSessions([])}>Clear</button>
                    </div>
                  </div>

                  <div className="email-session-chips">
                    {availableSessions.length === 0 ? (
                      <p className="email-empty-note">No sessions found for this audience.</p>
                    ) : availableSessions.map((session) => (
                      <button
                        key={session}
                        type="button"
                        className={`email-chip ${selectedSessions.includes(session) ? 'active' : ''}`}
                        onClick={() => toggleEmailSession(session)}
                      >
                        {session}
                      </button>
                    ))}
                  </div>

                  <div className="email-recipient-stats">
                    <div>
                      <span>Total in audience</span>
                      <strong>{selectedAudienceCount}</strong>
                    </div>
                    <div>
                      <span>Will receive email</span>
                      <strong>{emailRecipients.length}</strong>
                    </div>
                    <div>
                      <span>Sessions selected</span>
                      <strong>{selectedSessions.length || 'All'}</strong>
                    </div>
                  </div>

                  <div className="email-recipient-search">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      placeholder="Search recipients by name, email, ID or session"
                      value={emailSearch}
                      onChange={(e) => setEmailSearch(e.target.value)}
                    />
                  </div>

                  <div className="email-list-launcher">
                    <p className="email-empty-note" style={{marginBottom:10}}>
                      Review full selected recipients before sending.
                    </p>
                    <button
                      type="button"
                      className="btn-see-list"
                      disabled={emailRecipients.length === 0}
                      onClick={() => setShowEmailListModal(true)}
                    >
                      <i className="fa-solid fa-list"></i> See List ({emailRecipients.length})
                    </button>
                  </div>
                </section>

                <section className="email-panel email-panel-compose">
                  <div className="email-panel-head">
                    <h3><i className="fa-solid fa-pen-nib"></i> Compose Email</h3>
                    <p>Professional template preview only. SMTP integration can be connected later.</p>
                  </div>

                  <div className="email-compose-grid">
                    <div className="email-field">
                      <label>Subject</label>
                      <input
                        type="text"
                        placeholder="Example: Important notice for 2019 & 2020 sessions"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                    </div>

                    <div className="email-field">
                      <label>Preheader (optional)</label>
                      <input
                        type="text"
                        placeholder="Short summary shown in inbox preview"
                        value={emailPreheader}
                        onChange={(e) => setEmailPreheader(e.target.value)}
                      />
                    </div>

                    <div className="email-field full">
                      <label>Message Body</label>
                      <textarea
                        rows={8}
                        placeholder="Write your announcement here..."
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                      />
                    </div>

                    <div className="email-field">
                      <label>Call To Action Button Text</label>
                      <input
                        type="text"
                        placeholder="Visit AlumniConnect"
                        value={emailCallToAction}
                        onChange={(e) => setEmailCallToAction(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="email-preview-card">
                    <div className="email-preview-header">
                      <span>EMAIL PREVIEW</span>
                      <strong>AlumniConnect Admin Broadcast</strong>
                    </div>
                    <h4>{emailSubject || 'Your email subject will appear here'}</h4>
                    {emailPreheader && <p className="preheader">{emailPreheader}</p>}
                    <p>{emailBody || 'Compose your message to see preview text. You can target multiple sessions from the filter panel.'}</p>
                    <button type="button" className="preview-cta" disabled>{emailCallToAction || 'Visit AlumniConnect'}</button>
                    <div className="email-preview-footer">
                      Recipients: {emailRecipients.length} users
                    </div>
                  </div>

                  <div className="email-compose-actions">
                    <button type="button" className="btn-add-event" disabled={!canSendEmail} onClick={handleSendEmail}>
                      <i className={`fa-solid ${emailSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                      {emailSending ? 'Sending Email...' : 'Send Email'}
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => {
                        setEmailSubject('')
                        setEmailPreheader('')
                        setEmailBody('')
                        setEmailCallToAction('Visit AlumniConnect')
                      }}
                    >
                      <i className="fa-solid fa-rotate-left"></i> Reset Draft
                    </button>
                  </div>

                  <div className="email-log-panel">
                    <div className="email-log-head">
                      <h4><i className="fa-solid fa-clock-rotate-left"></i> Email Logs</h4>
                      <span>Max 10</span>
                    </div>

                    {emailLogLoading ? (
                      <p className="email-empty-note">Loading email logs...</p>
                    ) : emailLogs.length === 0 ? (
                      <p className="email-empty-note">No email logs yet.</p>
                    ) : (
                      <div className="email-log-list">
                        {emailLogs.map((log) => (
                          <div className="email-log-item" key={log.id}>
                            <div className="email-log-top">
                              <strong>{log.subject || 'No subject'}</strong>
                              <span className={`email-log-status ${log.status || 'failed'}`}>{log.status || 'failed'}</span>
                            </div>
                            <div className="email-log-meta">
                              Users: {log.recipient_count || 0} | Sent: {log.sent_count || 0} | Failed: {log.failed_count || 0}
                            </div>
                            <div className="email-log-time">{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</div>
                            {log.error_message && (
                              <div className="email-log-error">{log.error_message}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}

          {activeView === 'sms-center' && (
            <>
              <div className="email-center-grid">
                <section className="email-panel email-panel-targets">
                  <div className="email-panel-head">
                    <h3><i className="fa-solid fa-users-viewfinder"></i> SMS Audience Filters</h3>
                    <p>Use the same recipient targeting flow as Email Center.</p>
                  </div>

                  <div className="email-audience-toggle" role="group" aria-label="SMS audience toggle">
                    <button className={smsAudience === 'all' ? 'active' : ''} onClick={() => setSmsAudience('all')}>
                      <i className="fa-solid fa-users"></i> All Users
                    </button>
                    <button className={smsAudience === 'alumni' ? 'active' : ''} onClick={() => setSmsAudience('alumni')}>
                      <i className="fa-solid fa-user-tie"></i> Alumni
                    </button>
                    <button className={smsAudience === 'students' ? 'active' : ''} onClick={() => setSmsAudience('students')}>
                      <i className="fa-solid fa-user-graduate"></i> Students
                    </button>
                    <button className={smsAudience === 'existinglist' ? 'active' : ''} onClick={() => setSmsAudience('existinglist')}>
                      <i className="fa-solid fa-list"></i> Existing List
                    </button>
                  </div>

                  <div className="email-session-toolbar">
                    <h4>Session Filter</h4>
                    <div>
                      <button type="button" className="btn-session-action" onClick={() => setSelectedSmsSessions(availableSmsSessions)}>All</button>
                      <button type="button" className="btn-session-action" onClick={() => setSelectedSmsSessions([])}>Clear</button>
                    </div>
                  </div>

                  <div className="email-session-chips">
                    {availableSmsSessions.length === 0 ? (
                      <p className="email-empty-note">No sessions found for this audience.</p>
                    ) : availableSmsSessions.map((session) => (
                      <button
                        key={session}
                        type="button"
                        className={`email-chip ${selectedSmsSessions.includes(session) ? 'active' : ''}`}
                        onClick={() => toggleSmsSession(session)}
                      >
                        {session}
                      </button>
                    ))}
                  </div>

                  <div className="email-recipient-stats">
                    <div>
                      <span>Total in audience</span>
                      <strong>{smsBaseRecipients.length}</strong>
                    </div>
                    <div>
                      <span>With phone number</span>
                      <strong>{smsDeliverableRecipients.length}</strong>
                    </div>
                    <div>
                      <span>Sessions selected</span>
                      <strong>{selectedSmsSessions.length || 'All'}</strong>
                    </div>
                  </div>

                  <div className="email-recipient-search">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      placeholder="Search by name, phone, email, ID or session"
                      value={smsSearch}
                      onChange={(e) => setSmsSearch(e.target.value)}
                    />
                  </div>

                  <div className="email-list-launcher">
                    <p className="email-empty-note" style={{marginBottom:10}}>
                      Review targeted users before SMS integration is connected.
                    </p>
                    <button
                      type="button"
                      className="btn-see-list"
                      disabled={smsRecipients.length === 0}
                      onClick={() => setShowSmsListModal(true)}
                    >
                      <i className="fa-solid fa-list"></i> See List ({smsRecipients.length})
                    </button>
                  </div>
                </section>

                <section className="email-panel email-panel-compose">
                  <div className="email-panel-head">
                    <h3><i className="fa-solid fa-comment-sms"></i> Compose SMS</h3>
                    <p>Layout only. SMS gateway/API will be connected later.</p>
                  </div>

                  <div className="email-compose-grid">
                    <div className="email-field">
                      <label>Campaign / Template Name</label>
                      <input
                        type="text"
                        placeholder="Example: Event Reminder - Reunion"
                        value={smsTemplateName}
                        onChange={(e) => setSmsTemplateName(e.target.value)}
                      />
                    </div>

                    <div className="email-field">
                      <label>Sender Name</label>
                      <input
                        type="text"
                        placeholder="AlumniConnect Admin"
                        value={smsSenderName}
                        onChange={(e) => setSmsSenderName(e.target.value)}
                      />
                    </div>

                    <div className="email-field full">
                      <label>SMS Message</label>
                      <textarea
                        rows={8}
                        placeholder="Write concise SMS content here..."
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="email-preview-card">
                    <div className="email-preview-header">
                      <span>SMS PREVIEW</span>
                      <strong>{smsSenderName || 'AlumniConnect Admin'}</strong>
                    </div>
                    <h4>{smsTemplateName || 'Campaign Name'}</h4>
                    <p>{smsMessage || 'Compose your SMS to preview the message body for selected recipients.'}</p>
                    <div className="email-preview-footer">
                      Targeted: {smsRecipients.length} | Deliverable (phone available): {smsDeliverableRecipients.length}
                    </div>
                  </div>

                  <div className="email-compose-actions">
                    <button type="button" className="btn-add-event" disabled>
                      <i className="fa-solid fa-paper-plane"></i>
                      Send SMS (API Soon)
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => {
                        setSmsTemplateName('General Notice')
                        setSmsSenderName('AlumniConnect Admin')
                        setSmsMessage('')
                      }}
                    >
                      <i className="fa-solid fa-rotate-left"></i> Reset Draft
                    </button>
                  </div>

                  <div className="email-log-panel">
                    <div className="email-log-head">
                      <h4><i className="fa-solid fa-circle-info"></i> Integration Status</h4>
                      <span>Layout Only</span>
                    </div>
                    <p className="email-empty-note" style={{marginBottom:8}}>
                      API and gateway connection are intentionally disabled right now.
                    </p>
                    <p className="email-empty-note">
                      This screen is ready for provider hookup (Twilio, Fast2SMS, SSL Wireless, etc.) when needed.
                    </p>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* FUND TRANSACTIONS */}
          {activeView === 'transactions' && (
            <>
              <div className="events-header">
                <div className="section-title" style={{marginBottom:0}}>
                  <i className="fa-solid fa-money-bill-wave" style={{color:'#00a3a3'}}></i>
                  Fund Transactions <span className="badge-count">{transactions.length}</span>
                </div>
                <button className="btn-add-event" onClick={() => setShowFundReqModal(true)}>
                  <i className="fa-solid fa-plus"></i> Create Fund Request
                </button>
              </div>
              <div className="stat-grid" style={{marginTop:20}}>
                <div className="stat-card">
                  <div className="stat-icon green"><i className="fa-solid fa-bangladeshi-taka-sign"></i></div>
                  <div className="stat-info"><h3>Tk {totalFund.toLocaleString()}</h3><p>Total Fund Collected</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon purple"><i className="fa-solid fa-hand-holding-heart"></i></div>
                  <div className="stat-info"><h3>{paidTransactions.filter(t=>t.type==='Donation').length}</h3><p>Total Donations</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon orange"><i className="fa-solid fa-handshake"></i></div>
                  <div className="stat-info"><h3>{paidTransactions.filter(t=>t.type==='Sponsorship').length}</h3><p>Sponsorships</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon pink"><i className="fa-solid fa-id-card"></i></div>
                  <div className="stat-info"><h3>{paidTransactions.filter(t=>t.type==='Membership Fee').length}</h3><p>Membership Fees</p></div>
                </div>
              </div>

              <div className="section-title" style={{marginTop:24}}>
                <i className="fa-solid fa-file-circle-plus" style={{color:'#00a3a3'}}></i>
                Active Fund Requests <span className="badge-count">{fundRequests.length}</span>
              </div>
              {fundRequests.length === 0 ? (
                <div className="admin-table-wrap"><div className="empty-state"><i className="fa-solid fa-folder-open"></i><p>No active fund request yet.</p></div></div>
              ) : (
                <div className="events-grid" style={{marginTop:12}}>
                  {fundRequests.map((r) => (
                    <div className="event-card" key={r.id} style={{borderTopColor:'#00a3a3'}}>
                      <h4><i className="fa-solid fa-bullhorn" style={{color:'#00a3a3',marginRight:6}}></i>{r.title}</h4>
                      <p><i className="fa-solid fa-circle-info"></i> {r.purpose}</p>
                      <p><i className="fa-solid fa-bangladeshi-taka-sign"></i> Target: Tk {Number(r.target_amount || 0).toLocaleString()}</p>
                      <p><i className="fa-solid fa-credit-card"></i> Payment: <strong>{(r.payment_option || 'both').toUpperCase()}</strong></p>
                      {r.bkash_number && <p style={{fontSize:12,color:'#444'}}>bKash: {r.bkash_number}</p>}
                      {(r.bank_name || r.bank_account_number) && (
                        <p style={{fontSize:12,color:'#444'}}>Bank: {[r.bank_name, r.bank_account_name, r.bank_account_number].filter(Boolean).join(' | ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="admin-table-wrap" style={{marginTop:24}}>
                <table className="admin-table">
                  <thead><tr><th>#</th><th>Donor</th><th>Request</th><th>Type</th><th>Amount (Tk)</th><th>Payment</th><th>Date</th><th>Note</th><th>Action</th></tr></thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={t.id}>
                        <td>{i+1}</td>
                        <td><div className="alumni-name-cell"><div className="table-avatar">{(t.donor || 'U')[0]}</div>{t.donor || 'Unknown'}</div></td>
                        <td>{t.request_title || 'Manual / Legacy'}</td>
                        <td><span className={`status-badge ${t.type==='Donation'?'approved':t.type==='Sponsorship'?'pending':'rejected'}`}>{t.type}</span></td>
                        <td><strong>Tk {Number(t.amount).toLocaleString()}</strong></td>
                        <td>{[t.payment_method, t.payment_reference].filter(Boolean).join(' | ') || '—'}</td>
                        <td>{t.date}</td>
                        <td>{t.note}</td>
                        <td><button className="btn-delete" onClick={()=>handleDeleteTx(t.id)}><i className="fa-solid fa-trash"></i> Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TRAININGS */}
          {activeView === 'trainings' && (
            <>
              <div className="events-header">
                <div className="section-title" style={{marginBottom:0}}>
                  <i className="fa-solid fa-chalkboard-user" style={{color:'#00a3a3'}}></i>
                  Trainings <span className="badge-count">{trainings.length}</span>
                </div>
                <button className="btn-add-event" onClick={() => setShowTrainModal(true)}>
                  <i className="fa-solid fa-plus"></i> Add Training
                </button>
              </div>
              <div className="events-grid" style={{marginTop:20}}>
                {trainings.map(tr => (
                  <div className="event-card" key={tr.id} style={{borderTopColor: tr.status==='Full'?'#00a3a3':'#0f4ea8'}}>
                    <h4><i className="fa-solid fa-chalkboard" style={{color:'#00a3a3',marginRight:6}}></i>{tr.title}</h4>
                    <p><i className="fa-solid fa-user-tie"></i> {tr.trainer}</p>
                    <p><i className="fa-solid fa-calendar"></i> {tr.date}</p>
                    <p><i className="fa-solid fa-chair"></i> {tr.enrolled}/{tr.seats} Enrolled</p>
                    {Number(tr.fee) > 0 && (
                      <p style={{fontWeight:700,color:'#0f4ea8',fontSize:13,marginTop:4}}>
                        <i className="fa-solid fa-bangladeshi-taka-sign" style={{marginRight:4}}></i>Fee: ৳{Number(tr.fee).toLocaleString()}
                      </p>
                    )}
                    {tr.payment_account && (
                      <p style={{fontSize:12,color:'#888',marginTop:2}}>
                        <i className="fa-solid fa-building-columns" style={{color:'#00a3a3',marginRight:4}}></i>
                        Pay to: <strong style={{color:'#333'}}>{tr.payment_account}</strong>
                      </p>
                    )}
                    <div style={{marginTop:10}}>
                      <span className={`status-badge ${tr.status==='Full'?'rejected':tr.status==='Ongoing'?'approved':'pending'}`}>{tr.status}</span>
                    </div>
                    <div style={{marginTop:12,background:'#f3eeff',borderRadius:10,height:8,overflow:'hidden'}}>
                      <div style={{width:`${Math.min(100,Math.round(tr.enrolled/tr.seats*100))}%`,height:'100%',background:'linear-gradient(90deg,#0f4ea8,#00a3a3)',borderRadius:10,transition:'width 0.4s'}}/>
                    </div>
                    <div className="event-actions" style={{marginTop:12}}>
                      <button className="btn-approve" onClick={() => handleViewTrainingAttendees(tr)} style={{marginRight:8}}><i className="fa-solid fa-users"></i> Attendees</button>
                      <button className="btn-delete" onClick={()=>handleDeleteTraining(tr.id)}><i className="fa-solid fa-trash"></i> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CHARTS */}
          {activeView === 'charts' && (
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-card-title"><i className="fa-solid fa-arrow-trend-up"></i> Alumni Growth (Monthly)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={alumniGrowthData} margin={{top:10,right:20,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f2ff"/>
                    <XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/>
                    <Tooltip/><Legend/>
                    <Line type="monotone" dataKey="alumni" stroke="#0f4ea8" strokeWidth={3} dot={{r:5,fill:'#00a3a3'}} name="Alumni"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-card-title"><i className="fa-solid fa-bangladeshi-taka-sign"></i> Fund Collected (Monthly \u09f3)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fundChartData} margin={{top:10,right:20,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f2ff"/>
                    <XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/>
                    <Tooltip formatter={v=>`\u09f3${v.toLocaleString()}`}/><Legend/>
                    <Bar dataKey="amount" name="Fund (\u09f3)" radius={[8,8,0,0]}>
                      {fundChartData.map((_,i)=><Cell key={i} fill={i%2===0?'#0f4ea8':'#00a3a3'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-card-title"><i className="fa-solid fa-chart-pie"></i> Alumni by Department</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={deptData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name"
                      label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                      {deptData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip/><Legend/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-card-title"><i className="fa-solid fa-chalkboard-user"></i> Training Enrollment</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trainings.map(t=>({name:t.title.length>20?t.title.slice(0,20)+'\u2026':t.title,Enrolled:t.enrolled,Seats:t.seats}))} margin={{top:10,right:20,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f2ff"/>
                    <XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:12}}/>
                    <Tooltip/><Legend/>
                    <Bar dataKey="Seats" fill="#c5dbf5" radius={[6,6,0,0]}/>
                    <Bar dataKey="Enrolled" fill="#0f4ea8" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* JOBS */}
          {activeView === 'jobs' && (
            <>
              {/* Pending alumni submissions */}
              {pendingJobs.length > 0 && (
                <>
                  <div className="section-title" style={{marginBottom:14}}>
                    <i className="fa-solid fa-clock" style={{color:'#e88c00'}}></i>
                    Pending Job Submissions from Alumni
                    <span className="badge-count" style={{background:'#fff3cd',color:'#856404'}}>{pendingJobs.length}</span>
                  </div>
                  <div className="events-grid" style={{marginBottom:32}}>
                    {pendingJobs.map(j => (
                      <div className="event-card" key={j.id} style={{borderLeft:'4px solid #e88c00'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                          <h4 style={{margin:0}}><i className="fa-solid fa-briefcase" style={{color:'#00a3a3',marginRight:6}}></i>{j.title}</h4>
                          <span className="status-badge pending" style={{flexShrink:0,marginLeft:8}}>⏳ Pending</span>
                        </div>
                        {j.company  && <p><i className="fa-solid fa-building"></i> {j.company}</p>}
                        {j.location && <p><i className="fa-solid fa-location-dot"></i> {j.location}</p>}
                        <p><i className="fa-solid fa-tag"></i> <span className={`status-badge ${j.type==='Full-time'?'approved':j.type==='Internship'?'pending':'rejected'}`} style={{marginLeft:4}}>{j.type}</span></p>
                        {j.deadline && <p><i className="fa-solid fa-calendar-xmark"></i> Deadline: {j.deadline}</p>}
                        {j.alumni_name && <p style={{fontSize:12,color:'#888'}}><i className="fa-solid fa-user"></i> Submitted by: <strong>{j.alumni_name}</strong> ({j.alumni_email})</p>}
                        {j.description && <p style={{fontSize:13,color:'#666',marginTop:4}}>{j.description}</p>}
                        {j.apply_link && <p style={{fontSize:12}}><i className="fa-solid fa-link" style={{color:'#0f4ea8'}}></i> <a href={j.apply_link} target="_blank" rel="noreferrer" style={{color:'#0f4ea8'}}>{j.apply_link}</a></p>}
                        <div className="event-actions" style={{marginTop:12,gap:8}}>
                          <button className="btn-approve" onClick={() => handleApproveJob(j.id)}><i className="fa-solid fa-check"></i> Approve</button>
                          <button className="btn-delete" onClick={() => handleDeleteJob(j.id)}><i className="fa-solid fa-xmark"></i> Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Approved jobs list */}
              <div className="events-header">
                <div className="section-title" style={{marginBottom:0}}>
                  <i className="fa-solid fa-briefcase" style={{color:'#00a3a3'}}></i>
                  Active Jobs <span className="badge-count">{jobs.length}</span>
                </div>
                <button className="btn-add-event" onClick={() => setShowJobModal(true)}>
                  <i className="fa-solid fa-plus"></i> Post Job
                </button>
              </div>
              {jobs.length === 0 ? (
                <div className="admin-table-wrap"><div className="empty-state"><i className="fa-solid fa-briefcase"></i><p>No job listings yet.</p></div></div>
              ) : (
                <div className="events-grid" style={{marginTop:20}}>
                  {jobs.map(j => (
                    <div className="event-card" key={j.id}>
                      <h4><i className="fa-solid fa-briefcase" style={{color:'#00a3a3',marginRight:6}}></i>{j.title}</h4>
                      {j.company  && <p><i className="fa-solid fa-building"></i> {j.company}</p>}
                      {j.location && <p><i className="fa-solid fa-location-dot"></i> {j.location}</p>}
                      <p><i className="fa-solid fa-tag"></i>
                        <span className={`status-badge ${j.type==='Full-time'?'approved':j.type==='Internship'?'pending':'rejected'}`} style={{marginLeft:6}}>{j.type}</span>
                      </p>
                      {j.deadline && <p><i className="fa-solid fa-calendar-xmark"></i> Deadline: {j.deadline}</p>}
                      {j.description && <p style={{fontSize:13,color:'#666',marginTop:4}}><i className="fa-solid fa-align-left"></i> {j.description}</p>}
                      {j.apply_link && <p style={{fontSize:12,marginTop:4}}><i className="fa-solid fa-link" style={{color:'#0f4ea8',marginRight:4}}></i><a href={j.apply_link} target="_blank" rel="noreferrer" style={{color:'#0f4ea8',fontSize:12}}>Application Link</a></p>}
                      <div className="event-actions" style={{marginTop:12}}>
                        <button className="btn-delete" onClick={() => handleDeleteJob(j.id)}><i className="fa-solid fa-trash"></i> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* EXISTING ALUMNI LIST */}
          {activeView === 'exist-alumni' && (
            <>
              <div className="events-header">
                <div className="section-title" style={{marginBottom:0}}>
                  <i className="fa-solid fa-list" style={{color:'#00a3a3'}}></i>
                  Existing Alumni list <span className="badge-count">{existAlumni.length}</span>
                </div>
                <button className="btn-add-event" onClick={() => setShowAddAlumniModal(true)}>
                  <i className="fa-solid fa-plus"></i> Add Alumni Manually
                </button>
              </div>

              {/* Upload Excel Section */}
              <div style={{marginTop:20, marginBottom:30, background:'white', padding:20, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', border:'1px solid #e8f2ff'}}>
                <h4 style={{margin:'0 0 16px 0', color:'#0f4ea8', fontSize:16, fontWeight:700}}>
                  <i className="fa-solid fa-file-excel" style={{marginRight:8}}></i> Bulk Upload from Excel
                </h4>
                <form onSubmit={handleBulkUploadAlumni} style={{display:'flex', gap:12, alignItems:'flex-start', flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:250}}>
                    <input
                      type="file"
                      id="exist-alumni-file-input"
                      accept=".xlsx,.xls"
                      onChange={e => setExistAlumniFile(e.target.files?.[0] || null)}
                      style={{padding:'8px 12px', border:'1.5px solid #c5dbf5', borderRadius:8, fontSize:13, fontFamily:'Inter,sans-serif', width:'100%', boxSizing:'border-box'}}
                    />
                    <p style={{fontSize:12, color:'#888', margin:'4px 0 0 0'}}>Excel must have columns: name, student_id, email, session, phone</p>
                  </div>
                  <button
                    type="submit"
                    disabled={existAlumniUploading || !existAlumniFile}
                    style={{padding:'10px 16px', background:existAlumniUploading ? '#ddd' : 'linear-gradient(135deg,#0f4ea8,#00a3a3)', color:'white', border:'none', borderRadius:8, cursor:existAlumniUploading ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:13}}
                  >
                    <i className="fa-solid fa-cloud-arrow-up" style={{marginRight:6}}></i>
                    {existAlumniUploading ? 'Uploading...' : 'Upload Excel'}
                  </button>
                </form>
              </div>

              {/* Search Bar */}
              <div style={{marginBottom:20, position:'relative'}}>
                <i className="fa-solid fa-magnifying-glass" style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#00a3a3', fontSize:13, pointerEvents:'none'}}></i>
                <input
                  type="text"
                  placeholder="Search by name, email, student ID or session..."
                  value={existAlumniSearch}
                  onChange={e => setExistAlumniSearch(e.target.value)}
                  style={{width:'100%', padding:'10px 12px 10px 34px', border:'1.5px solid #c5dbf5', borderRadius:10, fontSize:13, fontFamily:'Inter,sans-serif', outline:'none', boxSizing:'border-box'}}
                />
              </div>

              {/* Alumni List Table */}
              {existAlumni.length === 0 ? (
                <div className="admin-table-wrap">
                  <div className="empty-state">
                    <i className="fa-solid fa-users"></i>
                    <p>No alumni added yet. Add them manually or upload an Excel file.</p>
                  </div>
                </div>
              ) : (
                <div className="admin-table-wrap" style={{marginTop:20}}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Student ID</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Session</th>
                        <th>Department</th>
                        <th>Added</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existAlumni.filter(a => {
                        const q = existAlumniSearch.trim().toLowerCase()
                        if (!q) return true
                        return (a.name || '').toLowerCase().includes(q)
                            || (a.email || '').toLowerCase().includes(q)
                            || (a.student_id || '').toLowerCase().includes(q)
                            || (a.session || '').toLowerCase().includes(q)
                      }).map((a, i) => (
                        <tr key={a.id}>
                          <td>{i+1}</td>
                          <td><div className="alumni-name-cell"><div className="table-avatar">{a.name?.[0]}</div>{a.name}</div></td>
                          <td>{a.student_id || '—'}</td>
                          <td style={{fontSize:12}}>{a.email || '—'}</td>
                          <td>{a.phone || '—'}</td>
                          <td>{a.session || '—'}</td>
                          <td>{a.department || 'ICE'}</td>
                          <td style={{fontSize:12, color:'#888'}}>{a.created_at?.slice(0,10)}</td>
                          <td>
                            <button className="btn-delete" onClick={() => handleDeleteExistAlumni(a.id)}>
                              <i className="fa-solid fa-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* EVENTS */}
          {activeView === 'events' && (
            <>
              <div className="events-header">
                <div className="section-title" style={{marginBottom:0}}>
                  <i className="fa-solid fa-calendar-days" style={{color:'#00a3a3'}}></i>
                  Events <span className="badge-count">{events.length}</span>
                </div>
                <button className="btn-add-event" onClick={() => setShowModal(true)}>
                  <i className="fa-solid fa-plus"></i> Add Event
                </button>
              </div>
              {events.length === 0 ? (
                <div className="admin-table-wrap"><div className="empty-state"><i className="fa-solid fa-calendar-days"></i><p>No events yet.</p></div></div>
              ) : (
                <div className="events-grid">
                  {events.map(ev => (
                    <div className="event-card" key={ev.id}>
                      <h4><i className="fa-solid fa-star" style={{color:'#00a3a3',marginRight:6}}></i>{ev.title}</h4>
                      <p><i className="fa-solid fa-calendar"></i> {ev.date}</p>
                      <p><i className="fa-solid fa-location-dot"></i> {ev.location}</p>
                      {ev.description && <p><i className="fa-solid fa-align-left"></i> {ev.description}</p>}
                      {Number(ev.fee) > 0 && <p><i className="fa-solid fa-bangladeshi-taka-sign"></i> Fee: ৳{Number(ev.fee).toLocaleString()}</p>}
                      {ev.payment_account && <p><i className="fa-solid fa-building-columns"></i> Account: {ev.payment_account}</p>}
                      <p style={{marginTop:4}}>
                        <span style={{display:'inline-block',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,
                          background: ev.audience==='alumni' ? '#fde8f5' : ev.audience==='students' ? '#e8f4fd' : '#e8fde8',
                          color: ev.audience==='alumni' ? '#00a3a3' : ev.audience==='students' ? '#1565c0' : '#2e7d32'}}>
                          {ev.audience==='alumni' ? '👤 Alumni Only' : ev.audience==='students' ? '🎓 Students Only' : '👥 Both'}
                        </span>
                      </p>
                      <div className="event-actions">
                        <button className="btn-approve" onClick={() => handleViewAttendees(ev)} style={{background:'#0f4ea8',color:'white'}}>
                          <i className="fa-solid fa-users"></i> Attendees
                        </button>
                        <button className="btn-approve" onClick={() => { setEditingEvent({...ev, audience: ev.audience||'both'}); setShowEditModal(true) }} style={{background:'#00a3a3',color:'white'}}>
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                        <button className="btn-delete" onClick={() => handleDeleteEvent(ev.id)}><i className="fa-solid fa-trash"></i> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ADD ALUMNI MODAL */}
      <Modal show={showAddAlumniModal} onHide={() => setShowAddAlumniModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box">
            <h3><i className="fa-solid fa-user-plus" style={{color:'#00a3a3'}}></i> Add Alumni Manually</h3>
            <form onSubmit={handleAddAlumni}>
              <label>Name *</label>
              <input type="text" placeholder="e.g., John Doe" value={newAlumniForm.name} onChange={e=>setNewAlumniForm({...newAlumniForm,name:e.target.value})} required/>
              <label>Student ID / Employee ID *</label>
              <input type="text" placeholder="e.g., 2020-01-001" value={newAlumniForm.student_id} onChange={e=>setNewAlumniForm({...newAlumniForm,student_id:e.target.value})} required/>
              <label>Email *</label>
              <input type="email" placeholder="e.g., john@example.com" value={newAlumniForm.email} onChange={e=>setNewAlumniForm({...newAlumniForm,email:e.target.value})} required/>
              <label>Session / Batch *</label>
              <input type="text" placeholder="e.g., 2019" value={newAlumniForm.session} onChange={e=>setNewAlumniForm({...newAlumniForm,session:e.target.value})} required/>
              <label>Phone Number *</label>
              <input type="tel" placeholder="e.g., +880 1712345678" value={newAlumniForm.phone} onChange={e=>setNewAlumniForm({...newAlumniForm,phone:e.target.value})} required/>
              <label>Department (optional)</label>
              <select style={{padding:'11px 14px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:14,outline:'none',fontFamily:'Inter,sans-serif'}} value={newAlumniForm.department} onChange={e=>setNewAlumniForm({...newAlumniForm,department:e.target.value})}>
                <option>ICE</option><option>EEE</option><option>ME</option><option>CE</option><option>Other</option>
              </select>
              <div className="modal-actions">
                <button type="submit" className="btn-primary-admin"><i className="fa-solid fa-plus"></i> Add Alumni</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddAlumniModal(false)}>Cancel</button>
              </div>
            </form>
        </div>
      </Modal>

      {/* ADD JOB MODAL */}
      <Modal show={showJobModal} onHide={() => setShowJobModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box">
            <h3><i className="fa-solid fa-briefcase" style={{color:'#00a3a3'}}></i> Post New Job</h3>
            <form onSubmit={handleAddJob}>
              <label>Job Title</label>
              <input type="text" placeholder="e.g., Software Engineer" value={newJob.title} onChange={e=>setNewJob({...newJob,title:e.target.value})} required/>
              <label>Company</label>
              <input type="text" placeholder="e.g., Grameenphone" value={newJob.company} onChange={e=>setNewJob({...newJob,company:e.target.value})}/>
              <label>Location</label>
              <input type="text" placeholder="e.g., Dhaka, Bangladesh" value={newJob.location} onChange={e=>setNewJob({...newJob,location:e.target.value})}/>
              <label>Type</label>
              <select style={{padding:'11px 14px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:14,outline:'none',fontFamily:'Inter,sans-serif'}} value={newJob.type} onChange={e=>setNewJob({...newJob,type:e.target.value})}>
                <option>Full-time</option><option>Part-time</option><option>Remote</option><option>Internship</option>
              </select>
              <label>Application Deadline</label>
              <input type="date" value={newJob.deadline} onChange={e=>setNewJob({...newJob,deadline:e.target.value})}/>
              <label>Application Link / Circular URL (optional)</label>
              <input type="url" placeholder="https://forms.google.com/… or job portal link" value={newJob.apply_link} onChange={e=>setNewJob({...newJob,apply_link:e.target.value})}/>
              <label>Description (optional)</label>
              <textarea placeholder="Brief job description..." value={newJob.description} onChange={e=>setNewJob({...newJob,description:e.target.value})}/>
              <div className="modal-actions">
                <button type="submit" className="btn-primary-admin"><i className="fa-solid fa-plus"></i> Post Job</button>
                <button type="button" className="btn-cancel" onClick={() => setShowJobModal(false)}>Cancel</button>
              </div>
            </form>
        </div>
      </Modal>

      {/* ATTENDEES MODAL */}
      {attendeesEvent && (
      <Modal show={showAttendeesModal} onHide={() => { setShowAttendeesModal(false); setAttendeesSearch('') }} centered size="lg" scrollable contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box" style={{maxHeight:'75vh',overflowY:'auto'}}>
            <h3 style={{marginBottom:4}}>
              <i className="fa-solid fa-users" style={{color:'#00a3a3',marginRight:8}}></i>
              Attendees — {attendeesEvent.title}
            </h3>
            <p style={{fontSize:13,color:'#888',marginBottom:16}}>
              <i className="fa-solid fa-calendar" style={{marginRight:4}}></i>{attendeesEvent.date}
              &nbsp;·&nbsp;<i className="fa-solid fa-location-dot" style={{marginRight:4}}></i>{attendeesEvent.location}
            </p>
            {/* Search Bar */}
            <div style={{marginBottom:16,position:'relative'}}>
              <i className="fa-solid fa-magnifying-glass" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#00a3a3',fontSize:13,pointerEvents:'none'}}></i>
              <input
                type="text"
                placeholder="Search by name, student ID, session or transaction ID…"
                onChange={e => setAttendeesSearch(e.target.value)}
                style={{width:'100%',padding:'9px 12px 9px 34px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:13,fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box'}}
              />
            </div>
            {attendeesLoading ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'#00a3a3'}}>
                <i className="fa-solid fa-spinner fa-spin" style={{fontSize:28}}></i>
              </div>
            ) : attendees.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'#bbb'}}>
                <i className="fa-solid fa-users-slash" style={{fontSize:32,display:'block',marginBottom:10,color:'#ddd'}}></i>
                No alumni have registered for this event yet.
              </div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Student ID</th><th>Session</th>
                      <th>Email</th><th>Phone</th><th>Transaction ID</th><th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.filter(a => {
                      const q = attendeesSearch.trim().toLowerCase()
                      if (!q) return true
                      return (a.name || '').toLowerCase().includes(q)
                          || (a.student_id || '').toLowerCase().includes(q)
                          || (a.session || '').toLowerCase().includes(q)
                          || (a.transaction_id || '').toLowerCase().includes(q)
                    }).map((a,i) => (
                      <tr key={a.id}>
                        <td>{i+1}</td>
                        <td><div className="alumni-name-cell">{a.photo_url ? <img src={a.photo_url} alt={a.name} className="table-avatar" style={{objectFit:'cover'}} /> : <div className="table-avatar">{a.name[0]}</div>}{a.name}</div></td>
                        <td>{a.student_id || '—'}</td>
                        <td>{a.session || '—'}</td>
                        <td>{a.email || '—'}</td>
                        <td>{a.phone || '—'}</td>
                        <td>{a.transaction_id
                          ? <span className="status-badge approved">{a.transaction_id}</span>
                          : <span style={{color:'#bbb'}}>—</span>}
                        </td>
                        <td style={{fontSize:12,color:'#888'}}>{a.registered_at?.slice(0,16)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-actions" style={{marginTop:20}}>
              <button type="button" className="btn-cancel" onClick={() => { setShowAttendeesModal(false); setAttendeesSearch('') }}>Close</button>
            </div>
        </div>
      </Modal>
      )}

      {/* TRAINING ATTENDEES MODAL */}
      {trainAttendeesTraining && (
      <Modal show={showTrainAttendeesModal} onHide={() => { setShowTrainAttendeesModal(false); setTrainAttendeesSearch('') }} centered size="lg" scrollable contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box" style={{maxHeight:'75vh',overflowY:'auto'}}>
            <h3 style={{marginBottom:4}}>
              <i className="fa-solid fa-users" style={{color:'#00a3a3',marginRight:8}}></i>
              Attendees — {trainAttendeesTraining.title}
            </h3>
            <p style={{fontSize:13,color:'#888',marginBottom:16}}>
              <i className="fa-solid fa-user-tie" style={{marginRight:4}}></i>{trainAttendeesTraining.trainer}
              &nbsp;·&nbsp;<i className="fa-solid fa-calendar" style={{marginRight:4}}></i>{trainAttendeesTraining.date}
            </p>
            {/* Search Bar */}
            <div style={{marginBottom:16,position:'relative'}}>
              <i className="fa-solid fa-magnifying-glass" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#00a3a3',fontSize:13,pointerEvents:'none'}}></i>
              <input
                type="text"
                placeholder="Search by name, student ID, session or transaction ID…"
                onChange={e => setTrainAttendeesSearch(e.target.value)}
                style={{width:'100%',padding:'9px 12px 9px 34px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:13,fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box'}}
              />
            </div>
            {trainAttendeesLoading ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'#00a3a3'}}>
                <i className="fa-solid fa-spinner fa-spin" style={{fontSize:28}}></i>
              </div>
            ) : trainAttendees.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'#bbb'}}>
                <i className="fa-solid fa-users-slash" style={{fontSize:32,display:'block',marginBottom:10,color:'#ddd'}}></i>
                No alumni have enrolled for this training yet.
              </div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Student ID</th>
                      <th>Email</th><th>Phone</th><th>Payment Method</th><th>Transaction ID</th><th>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainAttendees.filter(a => {
                      const q = trainAttendeesSearch.trim().toLowerCase()
                      if (!q) return true
                      return (a.name || '').toLowerCase().includes(q)
                          || (a.student_id || '').toLowerCase().includes(q)
                          || (a.session || '').toLowerCase().includes(q)
                          || (a.transaction_id || '').toLowerCase().includes(q)
                    }).map((a,i) => (
                      <tr key={a.id}>
                        <td>{i+1}</td>
                        <td><div className="alumni-name-cell">{a.photo_url ? <img src={a.photo_url} alt={a.name} className="table-avatar" style={{objectFit:'cover'}} /> : <div className="table-avatar">{a.name[0]}</div>}{a.name}</div></td>
                        <td>{a.student_id || '—'}</td>
                        <td>{a.email || '—'}</td>
                        <td>{a.phone || '—'}</td>
                        <td>{a.payment_method || '—'}</td>
                        <td>{a.transaction_id
                          ? <span className="status-badge approved">{a.transaction_id}</span>
                          : <span style={{color:'#bbb'}}>—</span>}
                        </td>
                        <td style={{fontSize:12,color:'#888'}}>{a.registered_at?.slice(0,16)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-actions" style={{marginTop:20}}>
              <button type="button" className="btn-cancel" onClick={() => { setShowTrainAttendeesModal(false); setTrainAttendeesSearch('') }}>Close</button>
            </div>
        </div>
      </Modal>
      )}

      {/* ADD EVENT MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box">
            <h3><i className="fa-solid fa-calendar-plus" style={{color:'#00a3a3'}}></i> Add New Event</h3>
            <form onSubmit={handleAddEvent}>
              <label>Event Title</label>
              <input type="text" placeholder="e.g., Annual Alumni Reunion" value={newEvent.title} onChange={e=>setNewEvent({...newEvent,title:e.target.value})} required/>
              <label>Date</label>
              <input type="date" value={newEvent.date} onChange={e=>setNewEvent({...newEvent,date:e.target.value})} required/>
              <label>Location</label>
              <input type="text" placeholder="e.g., RU Auditorium" value={newEvent.location} onChange={e=>setNewEvent({...newEvent,location:e.target.value})} required/>
              <label>Description (optional)</label>
              <textarea placeholder="Brief description..." value={newEvent.description} onChange={e=>setNewEvent({...newEvent,description:e.target.value})}/>
              <label>Registration Fee (৳) — leave 0 if free</label>
              <input type="number" min="0" step="0.01" placeholder="e.g., 500" value={newEvent.fee} onChange={e=>setNewEvent({...newEvent,fee:e.target.value})}/>
              <label>Payment Account / bKash / Bank Info (shown to alumni)</label>
              <input type="text" placeholder="e.g., bKash: 01712345678 (Send Money)" value={newEvent.payment_account} onChange={e=>setNewEvent({...newEvent,payment_account:e.target.value})}/>
              <label>Event Audience</label>
              <select value={newEvent.audience} onChange={e=>setNewEvent({...newEvent,audience:e.target.value})} style={{padding:'11px 14px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:14,outline:'none',fontFamily:'Inter,sans-serif'}}>
                <option value="both">Both (Alumni &amp; Students)</option>
                <option value="alumni">Alumni Only</option>
                <option value="students">Students Only</option>
              </select>
              <div className="modal-actions">
                <button type="submit" className="btn-primary-admin"><i className="fa-solid fa-plus"></i> Add Event</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
        </div>
      </Modal>

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box">
            <h3><i className="fa-solid fa-pen" style={{color:'#00a3a3'}}></i> Edit Event</h3>
            <form onSubmit={handleUpdateEvent}>
              <label>Event Title</label>
              <input type="text" placeholder="e.g., Annual Alumni Reunion" value={editingEvent.title} onChange={e=>setEditingEvent({...editingEvent,title:e.target.value})} required/>
              <label>Date</label>
              <input type="date" value={editingEvent.date} onChange={e=>setEditingEvent({...editingEvent,date:e.target.value})} required/>
              <label>Location</label>
              <input type="text" placeholder="e.g., RU Auditorium" value={editingEvent.location} onChange={e=>setEditingEvent({...editingEvent,location:e.target.value})} required/>
              <label>Description (optional)</label>
              <textarea placeholder="Brief description..." value={editingEvent.description||''} onChange={e=>setEditingEvent({...editingEvent,description:e.target.value})}/>
              <label>Registration Fee (৳) — leave 0 if free</label>
              <input type="number" min="0" step="0.01" placeholder="e.g., 500" value={editingEvent.fee} onChange={e=>setEditingEvent({...editingEvent,fee:e.target.value})}/>
              <label>Payment Account / bKash / Bank Info</label>
              <input type="text" placeholder="e.g., bKash: 01712345678" value={editingEvent.payment_account||''} onChange={e=>setEditingEvent({...editingEvent,payment_account:e.target.value})}/>
              <label>Event Audience</label>
              <select value={editingEvent.audience||'both'} onChange={e=>setEditingEvent({...editingEvent,audience:e.target.value})} style={{padding:'11px 14px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:14,outline:'none',fontFamily:'Inter,sans-serif'}}>
                <option value="both">Both (Alumni &amp; Students)</option>
                <option value="alumni">Alumni Only</option>
                <option value="students">Students Only</option>
              </select>
              <div className="modal-actions">
                <button type="submit" className="btn-primary-admin"><i className="fa-solid fa-save"></i> Save Changes</button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
        </div>
      </Modal>
      )}

      {/* CREATE FUND REQUEST MODAL */}
      <Modal show={showFundReqModal} onHide={() => setShowFundReqModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box">
            <h3><i className="fa-solid fa-file-circle-plus" style={{color:'#00a3a3'}}></i> Create Fund Request</h3>
            <form onSubmit={handleAddFundRequest}>
              <label>Request Title</label>
              <input type="text" placeholder="e.g., Support Alumni Career Fair 2026" value={newFundReq.title} onChange={e=>setNewFundReq({...newFundReq,title:e.target.value})} required/>
              <label>Why fund is needed?</label>
              <textarea placeholder="Explain purpose clearly for alumni donors..." value={newFundReq.purpose} onChange={e=>setNewFundReq({...newFundReq,purpose:e.target.value})} required/>
              <label>Target Amount (Tk)</label>
              <input type="number" min="1" placeholder="e.g., 50000" value={newFundReq.target_amount} onChange={e=>setNewFundReq({...newFundReq,target_amount:e.target.value})} required/>
              <label>Payment Option</label>
              <select style={{padding:'11px 14px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:14,outline:'none',fontFamily:'Inter,sans-serif'}} value={newFundReq.payment_option} onChange={e=>setNewFundReq({...newFundReq,payment_option:e.target.value})}>
                <option value="both">bKash + Bank</option>
                <option value="bkash">bKash only</option>
                <option value="bank">Bank only</option>
              </select>

              {(newFundReq.payment_option === 'bkash' || newFundReq.payment_option === 'both') && (
                <>
                  <label>bKash Number</label>
                  <input type="text" placeholder="e.g., 017XXXXXXXX" value={newFundReq.bkash_number} onChange={e=>setNewFundReq({...newFundReq,bkash_number:e.target.value})} required={newFundReq.payment_option !== 'bank'} />
                </>
              )}

              {(newFundReq.payment_option === 'bank' || newFundReq.payment_option === 'both') && (
                <>
                  <label>Bank Name</label>
                  <input type="text" placeholder="e.g., Sonali Bank" value={newFundReq.bank_name} onChange={e=>setNewFundReq({...newFundReq,bank_name:e.target.value})} required={newFundReq.payment_option !== 'bkash'} />
                  <label>Bank Account Name</label>
                  <input type="text" placeholder="Account holder name" value={newFundReq.bank_account_name} onChange={e=>setNewFundReq({...newFundReq,bank_account_name:e.target.value})} required={newFundReq.payment_option !== 'bkash'} />
                  <label>Bank Account Number</label>
                  <input type="text" placeholder="Account number" value={newFundReq.bank_account_number} onChange={e=>setNewFundReq({...newFundReq,bank_account_number:e.target.value})} required={newFundReq.payment_option !== 'bkash'} />
                </>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-primary-admin"><i className="fa-solid fa-plus"></i> Publish Request</button>
                <button type="button" className="btn-cancel" onClick={()=>setShowFundReqModal(false)}>Cancel</button>
              </div>
            </form>
        </div>
      </Modal>

      {/* ADD TRAINING MODAL */}
      <Modal show={showTrainModal} onHide={() => setShowTrainModal(false)} centered contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box">
            <h3><i className="fa-solid fa-chalkboard-user" style={{color:'#00a3a3'}}></i> Add Training</h3>
            <form onSubmit={handleAddTraining}>
              <label>Training Title</label>
              <input type="text" placeholder="e.g., React Bootcamp" value={newTraining.title} onChange={e=>setNewTraining({...newTraining,title:e.target.value})} required/>
              <label>Trainer</label>
              <input type="text" placeholder="Trainer name" value={newTraining.trainer} onChange={e=>setNewTraining({...newTraining,trainer:e.target.value})} required/>
              <label>Date</label>
              <input type="date" value={newTraining.date} onChange={e=>setNewTraining({...newTraining,date:e.target.value})} required/>
              <label>Total Seats</label>
              <input type="number" placeholder="e.g., 30" value={newTraining.seats} onChange={e=>setNewTraining({...newTraining,seats:e.target.value})} required/>
              <label>Status</label>
              <select style={{padding:'11px 14px',border:'1.5px solid #c5dbf5',borderRadius:10,fontSize:14,outline:'none',fontFamily:'Inter,sans-serif'}} value={newTraining.status} onChange={e=>setNewTraining({...newTraining,status:e.target.value})}>
                <option>Upcoming</option><option>Ongoing</option><option>Full</option><option>Completed</option>
              </select>
              <label>Registration Fee (৳) <span style={{color:'#aaa',fontWeight:400}}>(optional)</span></label>
              <input type="number" min="0" step="0.01" placeholder="0" value={newTraining.fee} onChange={e=>setNewTraining({...newTraining,fee:e.target.value})}/>
              <label>Payment Account / bKash / Bank Info <span style={{color:'#aaa',fontWeight:400}}>(optional)</span></label>
              <input type="text" placeholder="e.g. bKash: 01712345678" value={newTraining.payment_account} onChange={e=>setNewTraining({...newTraining,payment_account:e.target.value})}/>
              <div className="modal-actions">
                <button type="submit" className="btn-primary-admin"><i className="fa-solid fa-plus"></i> Add</button>
                <button type="button" className="btn-cancel" onClick={()=>setShowTrainModal(false)}>Cancel</button>
              </div>
            </form>
        </div>
      </Modal>

      {/* SELECTED RECIPIENTS LIST MODAL */}
      <Modal show={showEmailListModal} onHide={() => setShowEmailListModal(false)} centered size="lg" scrollable contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box" style={{maxHeight:'75vh',overflowY:'auto'}}>
          <h3 style={{marginBottom:4}}>
            <i className="fa-solid fa-list-check" style={{color:'#00a3a3',marginRight:8}}></i>
            Selected Recipient List
          </h3>
          <p style={{fontSize:13,color:'#888',marginBottom:14}}>
            Total selected recipients: <strong>{emailRecipients.length}</strong>
          </p>

          {emailRecipients.length === 0 ? (
            <div style={{textAlign:'center',padding:'36px 0',color:'#bbb'}}>
              <i className="fa-solid fa-user-slash" style={{fontSize:32,display:'block',marginBottom:10,color:'#ddd'}}></i>
              No recipients selected with current filters.
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>Email</th><th>Session</th><th>Role</th><th>Student ID</th>
                  </tr>
                </thead>
                <tbody>
                  {emailRecipients.map((person, idx) => (
                    <tr key={`${person.role}-${person.id}-modal`}>
                      <td>{idx + 1}</td>
                      <td>{person.name || 'N/A'}</td>
                      <td>{person.email || 'N/A'}</td>
                      <td>{person.session || 'N/A'}</td>
                      <td style={{textTransform:'capitalize'}}>{person.role || 'N/A'}</td>
                      <td>{person.student_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="modal-actions" style={{marginTop:18}}>
            <button type="button" className="btn-cancel" onClick={() => setShowEmailListModal(false)}>Close</button>
          </div>
        </div>
      </Modal>

      {/* SELECTED SMS RECIPIENTS LIST MODAL */}
      <Modal show={showSmsListModal} onHide={() => setShowSmsListModal(false)} centered size="lg" scrollable contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box" style={{maxHeight:'75vh',overflowY:'auto'}}>
          <h3 style={{marginBottom:4}}>
            <i className="fa-solid fa-comment-dots" style={{color:'#00a3a3',marginRight:8}}></i>
            SMS Recipient List
          </h3>
          <p style={{fontSize:13,color:'#888',marginBottom:14}}>
            Total targeted users: <strong>{smsRecipients.length}</strong> | With phone number: <strong>{smsDeliverableRecipients.length}</strong>
          </p>

          {smsRecipients.length === 0 ? (
            <div style={{textAlign:'center',padding:'36px 0',color:'#bbb'}}>
              <i className="fa-solid fa-user-slash" style={{fontSize:32,display:'block',marginBottom:10,color:'#ddd'}}></i>
              No recipients selected with current filters.
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Session</th><th>Role</th><th>Student ID</th>
                  </tr>
                </thead>
                <tbody>
                  {smsRecipients.map((person, idx) => (
                    <tr key={`${person.role}-${person.id}-sms-modal`}>
                      <td>{idx + 1}</td>
                      <td>{person.name || 'N/A'}</td>
                      <td>{person.phone || 'N/A'}</td>
                      <td>{person.email || 'N/A'}</td>
                      <td>{person.session || 'N/A'}</td>
                      <td style={{textTransform:'capitalize'}}>{person.role || 'N/A'}</td>
                      <td>{person.student_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="modal-actions" style={{marginTop:18}}>
            <button type="button" className="btn-cancel" onClick={() => setShowSmsListModal(false)}>Close</button>
          </div>
        </div>
      </Modal>

      {/* EXCEL DATA MODAL */}
      <Modal show={showExcelDataModal} onHide={() => setShowExcelDataModal(false)} centered size="lg" scrollable contentClassName="bg-transparent border-0 shadow-none p-0">
        <div className="modal-box" style={{maxHeight:'80vh',overflowY:'auto'}}>
          <h3>
            <i className="fa-solid fa-table" style={{color:'#00a3a3',marginRight:8}}></i>
            {excelData.title} ({excelData.rows?.length || 0} records)
          </h3>
          
          {excelDataLoading ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'#00a3a3'}}>
              <i className="fa-solid fa-spinner fa-spin" style={{fontSize:28}}></i>
              <p style={{marginTop:12}}>Loading Excel data...</p>
            </div>
          ) : excelData.rows?.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'#bbb'}}>
              <i className="fa-solid fa-table" style={{fontSize:32,display:'block',marginBottom:10,color:'#ddd'}}></i>
              No data found in this Excel file.
            </div>
          ) : (
            <div style={{overflowX:'auto',marginTop:16}}>
              <table className="admin-table">
                <thead>
                  <tr>
                    {excelData.headers?.map((header, idx) => (
                      <th key={idx}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelData.rows?.map((row, idx) => (
                    <tr key={idx}>
                      {excelData.headers?.map((header, colIdx) => (
                        <td key={colIdx} style={{fontSize:13, wordBreak:'break-word'}}>
                          {row[header] ? String(row[header]).substring(0, 50) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="modal-actions" style={{marginTop:18}}>
            <button type="button" className="btn-cancel" onClick={() => setShowExcelDataModal(false)}>Close</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PendingSection({ pending, upgradeRequests = [], pendingTab, setPendingTab, searchQuery, searchField, onApprove, onReject, onApproveUpgrade, onRejectUpgrade }) {
  const alumniPending  = pending.filter(p => (p.user_type || 'alumni') === 'alumni')
  const studentPending = pending.filter(p => p.user_type === 'student')
  const rows = (pendingTab === 'alumni' ? alumniPending : pendingTab === 'student' ? studentPending : upgradeRequests).filter(p => {
    if (!searchQuery.trim()) return true
    return String(p[searchField] ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
  })
  return (
    <>
      {/* Sub-tabs */}
      <div style={{display:'flex', gap:10, marginBottom:24, flexWrap:'wrap'}}>
        <button
          onClick={() => setPendingTab('alumni')}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 22px', borderRadius:12, fontWeight:700, fontSize:14,
            cursor:'pointer', fontFamily:'Inter,sans-serif', border:'none',
            background: pendingTab === 'alumni' ? 'linear-gradient(135deg,#0f4ea8,#00a3a3)' : '#f0eaff',
            color: pendingTab === 'alumni' ? 'white' : '#0f4ea8',
            boxShadow: pendingTab === 'alumni' ? '0 4px 14px rgba(95,44,130,0.3)' : 'none',
            transition:'0.2s',
          }}
        >
          <i className="fa-solid fa-user"></i> Alumni Approvals
          <span style={{
            background: pendingTab === 'alumni' ? 'rgba(255,255,255,0.25)' : '#d4b8f0',
            color: pendingTab === 'alumni' ? 'white' : '#0f4ea8',
            borderRadius:20, padding:'1px 9px', fontSize:12, fontWeight:700
          }}>{alumniPending.length}</span>
        </button>
        <button
          onClick={() => setPendingTab('student')}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 22px', borderRadius:12, fontWeight:700, fontSize:14,
            cursor:'pointer', fontFamily:'Inter,sans-serif', border:'none',
            background: pendingTab === 'student' ? 'linear-gradient(135deg,#0f4ea8,#00a3a3)' : '#f0eaff',
            color: pendingTab === 'student' ? 'white' : '#0f4ea8',
            boxShadow: pendingTab === 'student' ? '0 4px 14px rgba(95,44,130,0.3)' : 'none',
            transition:'0.2s',
          }}
        >
          <i className="fa-solid fa-user-graduate"></i> Student Approvals
          <span style={{
            background: pendingTab === 'student' ? 'rgba(255,255,255,0.25)' : '#d4b8f0',
            color: pendingTab === 'student' ? 'white' : '#0f4ea8',
            borderRadius:20, padding:'1px 9px', fontSize:12, fontWeight:700
          }}>{studentPending.length}</span>
        </button>
        <button
          onClick={() => setPendingTab('upgrade')}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 22px', borderRadius:12, fontWeight:700, fontSize:14,
            cursor:'pointer', fontFamily:'Inter,sans-serif', border:'none',
            background: pendingTab === 'upgrade' ? 'linear-gradient(135deg,#1a6eb5,#4aa3e0)' : '#e0f0ff',
            color: pendingTab === 'upgrade' ? 'white' : '#1a6eb5',
            boxShadow: pendingTab === 'upgrade' ? '0 4px 14px rgba(26,110,181,0.3)' : 'none',
            transition:'0.2s',
          }}
        >
          <i className="fa-solid fa-arrow-right-to-bracket"></i> Alumni Upgrade Requests
          <span style={{
            background: pendingTab === 'upgrade' ? 'rgba(255,255,255,0.25)' : '#b3d4f5',
            color: pendingTab === 'upgrade' ? 'white' : '#1a6eb5',
            borderRadius:20, padding:'1px 9px', fontSize:12, fontWeight:700
          }}>{upgradeRequests.length}</span>
        </button>
      </div>

      <div className="section-title">
        <i className="fa-solid fa-clock" style={{color:'#00a3a3'}}></i>
        {pendingTab === 'alumni' ? 'Alumni' : pendingTab === 'student' ? 'Student' : 'Alumni Upgrade'} Pending Approvals
        <span className="badge-count">{rows.length}</span>
      </div>
      {pendingTab === 'upgrade'
        ? <UpgradeCards rows={rows} onApprove={onApproveUpgrade} onReject={onRejectUpgrade} />
        : <PendingCards rows={rows} onApprove={onApprove} onReject={onReject} />
      }
    </>
  )
}

function PendingCards({ rows, onApprove, onReject }) {
  const [lightbox, setLightbox] = useState(null)
  if (rows.length === 0) return (
    <div className="admin-table-wrap">
      <div className="empty-state"><i className="fa-solid fa-circle-check"></i><p>All registrations reviewed!</p></div>
    </div>
  )
  return (
    <>
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out'
        }}>
          <img src={lightbox} alt="preview" style={{maxHeight:'90vh', maxWidth:'92vw', borderRadius:14, boxShadow:'0 8px 40px #0009'}} />
        </div>
      )}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(420px,1fr))', gap:24}}>
        {rows.map((p) => (
          <div key={p.id} style={{
            background:'#fff', borderRadius:20, boxShadow:'0 4px 22px rgba(95,44,130,0.10)',
            overflow:'hidden', border:'1.5px solid #ece4f8', display:'flex', flexDirection:'column'
          }}>
            {/* Card header */}
            <div style={{background:'linear-gradient(135deg,#0f4ea8,#00a3a3)', padding:'18px 22px', display:'flex', alignItems:'center', gap:16}}>
              {p.photo_url
                ? <img src={p.photo_url} alt={p.name} onClick={() => setLightbox(p.photo_url)}
                    style={{width:64, height:64, borderRadius:'50%', objectFit:'cover', border:'3px solid #fff', cursor:'zoom-in', flexShrink:0}} />
                : <div style={{width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:26, fontWeight:700, color:'#fff', flexShrink:0}}>
                    {p.name?.[0]?.toUpperCase()}
                  </div>
              }
              <div style={{flex:1, minWidth:0}}>
                <div style={{color:'#fff', fontWeight:700, fontSize:17, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.name}</div>
                <div style={{color:'rgba(255,255,255,0.78)', fontSize:12, marginTop:3}}>{p.email}</div>
                <span style={{display:'inline-block', marginTop:6, background:'rgba(255,214,255,0.25)', color:'#ffe4ff',
                  fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20, border:'1px solid rgba(255,255,255,0.3)'}}>
                  ⏳ Pending Review
                </span>
              </div>
              {p.created_at && (
                <div style={{color:'rgba(255,255,255,0.6)', fontSize:11, whiteSpace:'nowrap', alignSelf:'flex-start'}}>
                  {new Date(p.created_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                </div>
              )}
            </div>

            {/* Info grid */}
            <div style={{padding:'16px 22px 6px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px'}}>
              {[
                ['fa-phone',          'Phone',           p.phone],
                ['fa-building-columns','Department',      p.department],
                ['fa-id-badge',        'Student ID',      p.student_id],
                ['fa-calendar-days',   'Session',         p.session],
                ['fa-graduation-cap',  'Graduation Year', p.graduation_year],
                ['fa-building',        'Company',         p.company],
                ['fa-briefcase',       'Designation',     p.designation],
              ].map(([icon, label, val]) => (
                <div key={label} style={{display:'flex', alignItems:'flex-start', gap:8}}>
                  <i className={`fa-solid ${icon}`} style={{color:'#00a3a3', fontSize:13, marginTop:2, width:14, flexShrink:0}}></i>
                  <div>
                    <div style={{fontSize:10, color:'#aaa', fontWeight:600, textTransform:'uppercase', letterSpacing:.5}}>{label}</div>
                    <div style={{fontSize:13, color:'#333', fontWeight:500}}>{val || '—'}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Photos row */}
            <div style={{padding:'10px 22px 14px', display:'flex', gap:14}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:.5, marginBottom:6}}>
                  <i className="fa-solid fa-user" style={{marginRight:5, color:'#00a3a3'}}></i>Profile Photo
                </div>
                {p.photo_url
                  ? <img src={p.photo_url} alt="Profile" onClick={() => setLightbox(p.photo_url)}
                      style={{width:'100%', height:120, objectFit:'cover', borderRadius:10, cursor:'zoom-in',
                        border:'2px solid #ece4f8', boxShadow:'0 2px 8px rgba(95,44,130,0.08)'}} />
                  : <div style={{width:'100%', height:120, borderRadius:10, background:'#edf6ff',
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
                      border:'2px dashed #d0bfef', color:'#c0a8e4', fontSize:12}}>
                      <i className="fa-solid fa-image" style={{fontSize:24}}></i>Not uploaded
                    </div>
                }
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:.5, marginBottom:6}}>
                  <i className="fa-solid fa-id-card" style={{marginRight:5, color:'#00a3a3'}}></i>ID Card Photo
                </div>
                {p.id_photo_url
                  ? <img src={p.id_photo_url} alt="ID Card" onClick={() => setLightbox(p.id_photo_url)}
                      style={{width:'100%', height:120, objectFit:'cover', borderRadius:10, cursor:'zoom-in',
                        border:'2px solid #ece4f8', boxShadow:'0 2px 8px rgba(95,44,130,0.08)'}} />
                  : <div style={{width:'100%', height:120, borderRadius:10, background:'#edf6ff',
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
                      border:'2px dashed #d0bfef', color:'#c0a8e4', fontSize:12}}>
                      <i className="fa-solid fa-id-card" style={{fontSize:24}}></i>Not uploaded
                    </div>
                }
              </div>
            </div>

            {/* Actions */}
            <div style={{display:'flex', gap:10, padding:'0 22px 18px'}}>
              <button className="btn-approve" style={{flex:1, justifyContent:'center'}} onClick={() => onApprove(p.id)}>
                <i className="fa-solid fa-check"></i> Approve
              </button>
              <button className="btn-reject" style={{flex:1, justifyContent:'center'}} onClick={() => onReject(p.id)}>
                <i className="fa-solid fa-xmark"></i> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function UpgradeCards({ rows, onApprove, onReject }) {
  if (rows.length === 0) return (
    <div className="admin-table-wrap">
      <div className="empty-state"><i className="fa-solid fa-circle-check"></i><p>No upgrade requests pending!</p></div>
    </div>
  )
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(400px,1fr))', gap:24}}>
      {rows.map((p) => (
        <div key={p.id} style={{
          background:'#fff', borderRadius:20, boxShadow:'0 4px 22px rgba(26,110,181,0.12)',
          overflow:'hidden', border:'1.5px solid #d0e8fa', display:'flex', flexDirection:'column'
        }}>
          {/* Card header */}
          <div style={{background:'linear-gradient(135deg,#1a6eb5,#4aa3e0)', padding:'18px 22px', display:'flex', alignItems:'center', gap:16}}>
            {p.photo_url
              ? <img src={p.photo_url} alt={p.name}
                  style={{width:60, height:60, borderRadius:'50%', objectFit:'cover', border:'3px solid #fff', flexShrink:0}} />
              : <div style={{width:60, height:60, borderRadius:'50%', background:'rgba(255,255,255,0.25)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:24, fontWeight:700, color:'#fff', flexShrink:0}}>
                  {p.name?.[0]?.toUpperCase()}
                </div>
            }
            <div style={{flex:1, minWidth:0}}>
              <div style={{color:'#fff', fontWeight:700, fontSize:16, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.name}</div>
              <div style={{color:'rgba(255,255,255,0.78)', fontSize:12, marginTop:3}}>{p.email}</div>
              <span style={{display:'inline-block', marginTop:6, background:'rgba(255,255,255,0.2)', color:'#fff',
                fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20, border:'1px solid rgba(255,255,255,0.35)'}}>
                🎓 Alumni Upgrade Request
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div style={{padding:'16px 22px 8px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px'}}>
            {[
              ['fa-phone',          'Phone',           p.phone],
              ['fa-building-columns','Department',      p.department],
              ['fa-id-badge',        'Student ID',      p.student_id],
              ['fa-calendar-days',   'Session',         p.session],
              ['fa-graduation-cap',  'Graduation Year', p.graduation_year],
              ['fa-building',        'Company',         p.company],
              ['fa-briefcase',       'Designation',     p.designation],
            ].map(([icon, label, val]) => (
              <div key={label} style={{display:'flex', alignItems:'flex-start', gap:8}}>
                <i className={`fa-solid ${icon}`} style={{color:'#1a6eb5', fontSize:13, marginTop:2, width:14, flexShrink:0}}></i>
                <div>
                  <div style={{fontSize:10, color:'#aaa', fontWeight:600, textTransform:'uppercase', letterSpacing:.5}}>{label}</div>
                  <div style={{fontSize:13, color:'#333', fontWeight:500}}>{val || '—'}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{padding:'8px 22px', background:'#f0f7ff', margin:'8px 22px', borderRadius:10, fontSize:12, color:'#1a6eb5', fontWeight:600}}>
            <i className="fa-solid fa-circle-info" style={{marginRight:6}}></i>
            Approving will move this person from <strong>Students</strong> to <strong>Alumni</strong> list.
          </div>

          <div style={{padding:'10px 22px 0'}}>
            <div style={{fontSize:10, color:'#8aa1b8', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6}}>
              Verification Document
            </div>
            {p.upgrade_document_url ? (
              <a
                href={p.upgrade_document_url}
                target="_blank"
                rel="noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#1a6eb5',fontWeight:700,textDecoration:'none',background:'#eef6ff',padding:'8px 12px',borderRadius:10,border:'1px solid #d2e8ff'}}
              >
                <i className="fa-solid fa-file-lines"></i> View Uploaded Document
              </a>
            ) : (
              <div style={{fontSize:13,color:'#8b9eb1'}}>No document uploaded</div>
            )}
          </div>

          {/* Actions */}
          <div style={{display:'flex', gap:10, padding:'12px 22px 18px'}}>
            <button className="btn-approve" style={{flex:1, justifyContent:'center'}} onClick={() => onApprove(p.id)}>
              <i className="fa-solid fa-check"></i> Approve as Alumni
            </button>
            <button className="btn-reject" style={{flex:1, justifyContent:'center'}} onClick={() => onReject(p.id)}>
              <i className="fa-solid fa-xmark"></i> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

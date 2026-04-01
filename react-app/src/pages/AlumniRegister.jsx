import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Form, Button, Alert, Spinner, Modal, Badge } from 'react-bootstrap'
import Navbar from '../components/Navbar'
import '../styles/login.css'
import { register } from '../services/api'

function AlumniRegister() {
  const [submitted, setSubmitted] = useState(false)
  const [confirmStyle, setConfirmStyle] = useState({})
  const [confirmPlaceholder, setConfirmPlaceholder] = useState('********')
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const formRef = useRef(null)

  // controlled field state
  const [fields, setFields] = useState({
    name: '', email: '', phone: '', department: 'ICE',
    student_id: '', session: '', graduation_year: '',
    company: '', designation: '', password: '', confirm_password: ''
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [idcardFile, setIdcardFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [idcardPreview, setIdcardPreview] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFields(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'confirm_password') {
        if (value === updated.password && value !== '') {
          setConfirmStyle({ border: '2px solid #6bffb8' })
        } else {
          setConfirmStyle({ border: '2px solid #ff6b6b' })
        }
      }
      if (name === 'password') {
        if (updated.confirm_password !== '' && value === updated.confirm_password) {
          setConfirmStyle({ border: '2px solid #6bffb8' })
        } else if (updated.confirm_password !== '') {
          setConfirmStyle({ border: '2px solid #ff6b6b' })
        }
      }
      return updated
    })
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    if (!files[0]) return
    const url = URL.createObjectURL(files[0])
    if (name === 'photo')  { setPhotoFile(files[0]);  setPhotoPreview(url) }
    if (name === 'idcard') { setIdcardFile(files[0]); setIdcardPreview(url) }
  }

  const handleRegisterClick = (e) => {
    e.preventDefault()
    if (!formRef.current.checkValidity()) {
      formRef.current.reportValidity()
      return
    }
    if (fields.password !== fields.confirm_password) {
      setConfirmStyle({ border: '2px solid #ff6b6b' })
      setConfirmPlaceholder('Passwords do not match!')
      setFields(prev => ({ ...prev, confirm_password: '' }))
      return
    }
    if (!photoFile)  { alert('Please upload your photo.'); return }
    if (!idcardFile) { alert('Please upload your ID card / academic evidence.'); return }
    setApiError('')
    setShowReview(true)
  }

  const handleConfirmSubmit = async () => {
    const formData = new FormData()
    formData.append('name',            fields.name)
    formData.append('email',           fields.email)
    formData.append('phone',           fields.phone)
    formData.append('department',      fields.department)
    formData.append('student_id',      fields.student_id)
    formData.append('session',         fields.session)
    formData.append('graduation_year', fields.graduation_year)
    formData.append('company',         fields.company)
    formData.append('designation',     fields.designation)
    formData.append('password',        fields.password)
    formData.append('user_type',       'alumni')
    formData.append('photo',   photoFile)
    formData.append('idcard',  idcardFile)

    setLoading(true)
    setApiError('')
    try {
      const { ok, data } = await register(formData)
      if (ok) {
        setShowReview(false)
        setSubmitted(true)
      } else {
        setShowReview(false)
        setApiError(data.message || 'Registration failed. Please try again.')
      }
    } catch (_) {
      setShowReview(false)
      setApiError('Cannot reach server. Please make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.15)', padding: '7px 0', gap: 8 }}>
      <span style={{ minWidth: 155, fontWeight: 600, opacity: 0.7, fontSize: 13 }}>{label}</span>
      <span style={{ wordBreak: 'break-all', fontSize: 14 }}>{value || <span style={{ opacity: 0.45 }}>—</span>}</span>
    </div>
  )

  return (
    <>
      <Navbar />
      <section className="login-section">
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} sm={11} md={8} lg={6}>
              <div className="login-card">
                <h2><i className="fa-solid fa-user-plus me-2"></i>Alumni Register</h2>

                {!submitted ? (
                  <Form onSubmit={handleRegisterClick} ref={formRef} noValidate>
                    <Row>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Full Name (as certificate)</Form.Label>
                          <Form.Control type="text" name="name" placeholder="Your Full Name" required value={fields.name} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Email</Form.Label>
                          <Form.Control type="email" name="email" placeholder="example@domain.com" required value={fields.email} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Phone Number</Form.Label>
                          <Form.Control type="text" name="phone" placeholder="+8801XXXXXXXXX" required value={fields.phone} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Department</Form.Label>
                          <Form.Control type="text" name="department" value={fields.department} readOnly />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Student ID / Roll</Form.Label>
                          <Form.Control type="text" name="student_id" placeholder="e.g., 1804001" required value={fields.student_id} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Session</Form.Label>
                          <Form.Control type="text" name="session" placeholder="e.g., 2016-2020" required value={fields.session} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Graduation Year</Form.Label>
                          <Form.Control type="text" name="graduation_year" placeholder="e.g., 2020" required value={fields.graduation_year} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Company / Organization</Form.Label>
                          <Form.Control type="text" name="company" placeholder="e.g., Google, HSBC, Pathao" required value={fields.company} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Designation</Form.Label>
                          <Form.Control type="text" name="designation" placeholder="e.g., Software Engineer, Manager" required value={fields.designation} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Upload ID card / academic evidence</Form.Label>
                          <Form.Control type="file" name="idcard" accept="image/*" onChange={handleFileChange} />
                          {idcardPreview && (
                            <img src={idcardPreview} alt="ID preview" style={{ marginTop: 6, width: '100%', maxHeight: 80, objectFit: 'cover', borderRadius: 6, border: '2px solid rgba(255,255,255,0.35)' }} />
                          )}
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Upload Your Photo</Form.Label>
                          <Form.Control type="file" name="photo" accept="image/*" onChange={handleFileChange} />
                          {photoPreview && (
                            <img src={photoPreview} alt="Photo preview" style={{ marginTop: 6, width: '100%', maxHeight: 80, objectFit: 'cover', borderRadius: 6, border: '2px solid rgba(255,255,255,0.35)' }} />
                          )}
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Password</Form.Label>
                          <Form.Control type="password" name="password" placeholder="********" required value={fields.password} onChange={handleChange} />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group className="mb-3 text-start">
                          <Form.Label>Re-type Password</Form.Label>
                          <Form.Control
                            type="password"
                            name="confirm_password"
                            placeholder={confirmPlaceholder}
                            style={confirmStyle}
                            value={fields.confirm_password}
                            onChange={handleChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {apiError && <Alert variant="danger" className="py-2">{apiError}</Alert>}

                    <Button type="submit" className="btn-primary w-100 mt-1" disabled={loading}>
                      {loading ? <><Spinner animation="border" size="sm" className="me-2" />Submitting…</> : <><i className="fa-solid fa-magnifying-glass me-2"></i>Review & Register</>}
                    </Button>
                  </Form>
                ) : (
                  <div className="pending-msg">
                    <div className="pending-icon">⏳</div>
                    <h3>Registration Submitted!</h3>
                    <p>Your request is <strong>pending for approval</strong> by the admin. You will be notified once your account is approved.</p>
                  </div>
                )}

                <p className="register-text mt-3">
                  Already have an account? <Link to="/alumni-login">Login here</Link>
                </p>
                <p className="back-home"><Link to="/">← Back to Home</Link></p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ── Review Modal ── */}
      <Modal show={showReview} onHide={() => setShowReview(false)} centered size="lg">
        <Modal.Header style={{ background: 'linear-gradient(135deg,#5f2c82,#a4508b)', color: '#fff', border: 'none' }} closeButton closeVariant="white">
          <Modal.Title style={{ fontWeight: 700 }}>
            <i className="fa-solid fa-circle-check me-2"></i>Review Your Information
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'linear-gradient(135deg,#5f2c82,#a4508b)', color: '#fff', padding: '20px 28px' }}>
          <Alert variant="warning" className="py-2 mb-3" style={{ fontSize: 13, borderRadius: 10 }}>
            <i className="fa-solid fa-triangle-exclamation me-2"></i>
            Please check all details carefully. Click <strong>Edit</strong> to correct any mistakes before submitting.
          </Alert>
          <Row>
            <Col md={8}>
              <InfoRow label="Full Name" value={fields.name} />
              <InfoRow label="Email" value={fields.email} />
              <InfoRow label="Phone" value={fields.phone} />
              <InfoRow label="Department" value={fields.department} />
              <InfoRow label="Student ID / Roll" value={fields.student_id} />
              <InfoRow label="Session" value={fields.session} />
              <InfoRow label="Graduation Year" value={fields.graduation_year} />
              <InfoRow label="Company / Org" value={fields.company} />
              <InfoRow label="Designation" value={fields.designation} />
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.15)', padding: '7px 0', gap: 8 }}>
                <span style={{ minWidth: 155, fontWeight: 600, opacity: 0.7, fontSize: 13 }}>Password</span>
                <span style={{ letterSpacing: 4, fontSize: 18, opacity: 0.8 }}>{'•'.repeat(Math.min(fields.password.length, 12))}</span>
              </div>
            </Col>
            <Col md={4} className="d-flex flex-column gap-3 mt-3 mt-md-0">
              <div className="text-center">
                <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 5 }}>Your Photo</p>
                {photoPreview
                  ? <img src={photoPreview} alt="Photo" style={{ width: '100%', maxHeight: 130, objectFit: 'cover', borderRadius: 10, border: '2px solid rgba(255,255,255,0.45)' }} />
                  : <div style={{ height: 80, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, opacity: 0.6 }}>No photo</div>}
              </div>
              <div className="text-center">
                <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 5 }}>ID Card / Evidence</p>
                {idcardPreview
                  ? <img src={idcardPreview} alt="ID Card" style={{ width: '100%', maxHeight: 130, objectFit: 'cover', borderRadius: 10, border: '2px solid rgba(255,255,255,0.45)' }} />
                  : <div style={{ height: 80, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, opacity: 0.6 }}>No ID card</div>}
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ background: 'linear-gradient(135deg,#5f2c82,#a4508b)', border: 'none', justifyContent: 'space-between' }}>
          <Button
            variant="outline-light"
            onClick={() => setShowReview(false)}
            style={{ borderRadius: 25, minWidth: 130, fontWeight: 600 }}
          >
            <i className="fa-solid fa-pen me-2"></i>Edit
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            disabled={loading}
            style={{ background: '#fff', color: '#5f2c82', border: 'none', borderRadius: 25, fontWeight: 700, minWidth: 190 }}
          >
            {loading
              ? <><Spinner animation="border" size="sm" className="me-2" />Submitting…</>
              : <><i className="fa-solid fa-paper-plane me-2"></i>Confirm & Register</>}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default AlumniRegister

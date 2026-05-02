import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap'
import Navbar from '../components/Navbar'
import '../styles/login.css'
import { studentLogin } from '../services/api'

function StudentLogin() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const goToDashboard = (student) => {
    try {
      sessionStorage.setItem('student-dashboard-active-view', 'dashboard')
      sessionStorage.setItem('student-force-dashboard-once', '1')
    } catch (_) {}
    navigate('/student-dashboard', { replace: true, state: { alumni: student, activeView: 'dashboard', fromLogin: true } })
  }

  useEffect(() => {
    const raw = localStorage.getItem('studentUser')
    if (!raw) return
    try {
      const student = JSON.parse(raw)
      if (student && typeof student === 'object') {
        goToDashboard(student)
      }
    } catch (_) {}
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const email    = e.target.email.value.trim()
    const password = e.target.password.value
    setError('')
    setLoading(true)
    try {
      const { ok, data } = await studentLogin(email, password)
      if (ok) {
        goToDashboard(data.alumni)
      } else {
        setError(data.message || 'Login failed.')
      }
    } catch (err) {
      setError(err?.message || 'Cannot reach server. Please make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const isUpgraded = error.includes('upgraded to Alumni')

  return (
    <>
      <Navbar />
      <section className="login-section">
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} sm={10} md={7} lg={5}>
              <div className="login-card">
                <h2><i className="fa-solid fa-user me-2"></i>Student Login</h2>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3 text-start">
                    <Form.Label>Enter Email</Form.Label>
                    <Form.Control type="email" name="email" placeholder="example@domain.com" required />
                  </Form.Group>

                  <Form.Group className="mb-3 text-start">
                    <Form.Label>Enter Password</Form.Label>
                    <Form.Control type="password" name="password" placeholder="********" required />
                  </Form.Group>

                  <div className="forgot-password-row text-start mb-2">
                    <Link to="/student-forgot-password" className="forgot-password-link">Forgot password?</Link>
                  </div>

                  {error && (
                    isUpgraded ? (
                      <Alert variant="info" className="py-2">
                        <p className="mb-2 fw-semibold">
                          <i className="fa-solid fa-graduation-cap me-2"></i>{error}
                        </p>
                        <Link to="/alumni-login" className="btn btn-sm btn-primary">
                          Go to Alumni Login →
                        </Link>
                      </Alert>
                    ) : (
                      <Alert variant="danger" className="py-2">{error}</Alert>
                    )
                  )}

                  <Button type="submit" className="btn-primary w-100 mt-2" disabled={loading}>
                    {loading ? <><Spinner animation="border" size="sm" className="me-2" />Logging in…</> : 'Login'}
                  </Button>
                </Form>

                <p className="register-text mt-3">
                  Don't have an account? <Link to="/student-register">Register here</Link>
                </p>
                <p className="back-home"><Link to="/">← Back to Home</Link></p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  )
}

export default StudentLogin

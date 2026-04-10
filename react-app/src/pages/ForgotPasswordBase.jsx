import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap'
import Navbar from '../components/Navbar'
import { requestPasswordResetOtp, resetPasswordWithOtp } from '../services/api'
import '../styles/login.css'

function ForgotPasswordBase({ userType, title, loginPath }) {
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const onRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { ok, data } = await requestPasswordResetOtp(email.trim(), userType)
      if (!ok) {
        setError(data.message || 'Could not send OTP. Please try again.')
        return
      }
      setSuccess(data.message || 'OTP sent to your email.')
      setStep('reset')
    } catch (err) {
      setError(err?.message || 'Cannot reach server. Please make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const onResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { ok, data } = await resetPasswordWithOtp(email.trim(), userType, otp.trim(), newPassword)
      if (!ok) {
        setError(data.message || 'Password reset failed.')
        return
      }
      setSuccess(data.message || 'Password reset successful. You can now log in.')
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err?.message || 'Cannot reach server. Please make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <section className="login-section">
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} sm={10} md={7} lg={5}>
              <div className="login-card">
                <h2><i className="fa-solid fa-key me-2"></i>{title}</h2>

                {step === 'request' ? (
                  <Form onSubmit={onRequestOtp}>
                    <Form.Group className="mb-3 text-start">
                      <Form.Label>Enter your registered email</Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@domain.com"
                        required
                      />
                    </Form.Group>

                    {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                    {success && <Alert variant="success" className="py-2">{success}</Alert>}

                    <Button type="submit" className="btn-primary w-100 mt-2" disabled={loading}>
                      {loading ? <><Spinner animation="border" size="sm" className="me-2" />Sending OTP…</> : 'Send OTP'}
                    </Button>
                  </Form>
                ) : (
                  <Form onSubmit={onResetPassword}>
                    <Form.Group className="mb-3 text-start">
                      <Form.Label>Email</Form.Label>
                      <Form.Control type="email" value={email} readOnly />
                    </Form.Group>

                    <Form.Group className="mb-3 text-start">
                      <Form.Label>Enter OTP</Form.Label>
                      <Form.Control
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="6-digit OTP"
                        maxLength={6}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3 text-start">
                      <Form.Label>New Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3 text-start">
                      <Form.Label>Confirm New Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                      />
                    </Form.Group>

                    {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                    {success && <Alert variant="success" className="py-2">{success}</Alert>}

                    <Button type="submit" className="btn-primary w-100 mt-2" disabled={loading}>
                      {loading ? <><Spinner animation="border" size="sm" className="me-2" />Updating…</> : 'Set New Password'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline-light"
                      className="w-100 mt-2"
                      disabled={loading}
                      onClick={() => {
                        setStep('request')
                        setOtp('')
                        setNewPassword('')
                        setConfirmPassword('')
                        setError('')
                        setSuccess('')
                      }}
                    >
                      Request New OTP
                    </Button>
                  </Form>
                )}

                <p className="register-text mt-3">
                  Remembered your password? <Link to={loginPath}>Back to login</Link>
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

export default ForgotPasswordBase

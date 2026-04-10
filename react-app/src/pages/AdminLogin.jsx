import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap'
import Navbar from '../components/Navbar'
import '../styles/login.css'
import { adminLogin } from '../services/api'

function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { ok, data } = await adminLogin(username, password)
      if (ok) {
        navigate('/admin-dashboard')
      } else {
        setError(data.message || 'Invalid username or password.')
      }
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
                <h2><i className="fa-solid fa-user-shield me-2"></i>Admin Login</h2>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3 text-start">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3 text-start">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="********"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </Form.Group>

                  {error && <Alert variant="danger" className="py-2 text-center">{error}</Alert>}

                  <Button type="submit" className="btn-primary w-100 mt-2" disabled={loading}>
                    {loading ? <><Spinner animation="border" size="sm" className="me-2" />Logging in…</> : 'Login'}
                  </Button>
                </Form>

                <p className="back-home mt-3"><Link to="/">← Back to Home</Link></p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  )
}

export default AdminLogin

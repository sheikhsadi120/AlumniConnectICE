import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Row, Col, Dropdown } from 'react-bootstrap'
import Navbar from '../components/Navbar'

function Home() {
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  return (
    <>
      <Navbar />

      {/* HERO SECTION */}
      <section className="hero">
        <Container fluid="xl">
          <Row className="align-items-center">
            <Col lg={6} className="hero-left">
              <span className="badge">Reconnect with your Alumni Network in one place.</span>
              <h1>ICE Alumni <br /><span>Networking Platform</span></h1>
              <p>Stay in touch with your alma mater, discover professional opportunities, and keep your alumni community active, engaged, and informed.</p>
              <div className="feature-tags">
                <span>Alumni Directory</span>
                <span>Events &amp; Reunions</span>
                <span>Career &amp; Mentoring</span>
              </div>
              <div className="buttons">
                <Dropdown show={showDropdown} onToggle={v => setShowDropdown(v)}>
                  <Dropdown.Toggle as="button" className="btn-primary" style={{ border: 'none' }}>
                    Get Started ▾
                  </Dropdown.Toggle>
                  <Dropdown.Menu style={{ borderRadius: 12, boxShadow: '0 8px 24px rgba(95,44,130,0.18)', minWidth: 180, overflow: 'hidden', border: 'none' }}>
                    <Dropdown.Item
                      onClick={() => { setShowDropdown(false); navigate('/student-login') }}
                      style={{ fontWeight: 600, color: '#1565c0', fontSize: 14 }}
                    >
                      🎓 Student Login
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => { setShowDropdown(false); navigate('/alumni-login') }}
                      style={{ fontWeight: 600, color: '#5f2c82', fontSize: 14 }}
                    >
                      👤 Alumni Login
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <button className="btn-outline" onClick={() => navigate('/admin-login')}>Admin Access</button>
              </div>
              <div className="secure">● Secure, centralized and easy to manage for institutions &amp; alumni.</div>
            </Col>

            <Col lg={6} className="hero-right">
              <div className="glass-card">
                <div className="alumni-illustration">
                  {/* Central University Node */}
                  <div className="uni-node">
                    <div className="uni-icon">🎓</div>
                    <span>AlumniConnect</span>
                  </div>

                  {/* Alumni Profile Nodes */}
                  <div className="alumni-node node-1">
                    <div className="avatar">A</div>
                    <span>Anika</span>
                    <small>ICE'16</small>
                    <small className="designation">SWE @ Google</small>
                  </div>
                  <div className="alumni-node node-2">
                    <div className="avatar">S</div>
                    <span>Shawon</span>
                    <small>ICE'19</small>
                    <small className="designation">Manager @ HSBC</small>
                  </div>
                  <div className="alumni-node node-3">
                    <div className="avatar">E</div>
                    <span>Ety</span>
                    <small>ICE'11</small>
                    <small className="designation">Engineer @ BPDB</small>
                  </div>
                  <div className="alumni-node node-4">
                    <div className="avatar">T</div>
                    <span>Tanvir</span>
                    <small>ICE'23</small>
                    <small className="designation">CEO @ StartupBD</small>
                  </div>
                  <div className="alumni-node node-5">
                    <div className="avatar">N</div>
                    <span>Nadia</span>
                    <small>ICE25</small>
                    <small className="designation">Dev @ Pathao</small>
                  </div>

                  {/* Connection lines via SVG */}
                  <svg className="connections" viewBox="0 0 380 280" xmlns="http://www.w3.org/2000/svg">
                    <line x1="190" y1="140" x2="80" y2="55" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="5,4"/>
                    <line x1="190" y1="140" x2="310" y2="55" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="5,4"/>
                    <line x1="190" y1="140" x2="55" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="5,4"/>
                    <line x1="190" y1="140" x2="325" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="5,4"/>
                    <line x1="190" y1="140" x2="190" y2="255" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="5,4"/>
                  </svg>

                  {/* Floating badges */}
                  <div className="badge-float badge-f1">🤝 Networking</div>
                  <div className="badge-float badge-f2">💼 Jobs</div>
                  <div className="badge-float badge-f3">📅 Events</div>
                </div>
                <div className="card-label">Connected Alumni Community</div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">
        <Container>
          <div className="section-header">
            <span>KEY FEATURES</span>
            <h2>What You Can Do Inside the Portal</h2>
            <p>Reunite with classmates, share opportunities, and keep your alumni ecosystem vibrant, all from a centralized platform.</p>
          </div>
          <Row className="g-4">
            <Col md={4}>
              <div className="feature-card h-100">
                <h3>Connect with Alumni</h3>
                <p>Search and reconnect with batchmates, explore their professional journeys, and grow your network beyond graduation.</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="feature-card h-100">
                <h3>Join Alumni Events</h3>
                <p>Stay informed about reunions, webinars, and campus happenings, and confirm your presence with just a few clicks.</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="feature-card h-100">
                <h3>Share Opportunities</h3>
                <p>Post jobs, internships, and collaborations, or discover opportunities shared by trusted alumni and recruiters.</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  )
}

export default Home

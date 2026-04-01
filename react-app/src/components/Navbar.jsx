import { Link, useLocation } from 'react-router-dom'
import { Navbar as BSNavbar, Container, Nav, NavDropdown } from 'react-bootstrap'

function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <BSNavbar expand="lg" className="navbar shadow-sm" style={{ background: 'linear-gradient(90deg,#5f2c82,#a4508b)', padding: '10px 0' }}>
      <Container fluid="xl">
        {/* Brand / Logo */}
        <BSNavbar.Brand as={Link} to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
          <div className="logo-circle" style={{ background: 'white', color: '#5f2c82', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>A</div>
          ALUMNICONNECT
        </BSNavbar.Brand>

        {/* Hamburger toggler for mobile */}
        <BSNavbar.Toggle aria-controls="main-navbar-nav" style={{ borderColor: 'rgba(255,255,255,0.4)', filter: 'invert(1)' }} />

        <BSNavbar.Collapse id="main-navbar-nav">
          <Nav className="ms-auto align-items-lg-center gap-1">
            <Nav.Link as={Link} to="/" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              <i className="fa-solid fa-house me-1"></i> Home
            </Nav.Link>

            {isHome ? (
              <NavDropdown
                title={<span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}><i className="fa-solid fa-right-to-bracket me-1"></i> Login</span>}
                id="login-dropdown"
                align="end"
                menuVariant="dark"
              >
                <NavDropdown.Item as={Link} to="/admin-login">
                  <i className="fa-solid fa-user-shield me-2"></i> Admin Login
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/alumni-login">
                  <i className="fa-solid fa-user me-2"></i> Alumni Login
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/student-login">
                  <i className="fa-solid fa-user-graduate me-2"></i> Student Login
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/alumni-login" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                  <i className="fa-solid fa-user me-1"></i> Alumni Login
                </Nav.Link>
                <Nav.Link as={Link} to="/student-login" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                  <i className="fa-solid fa-user-graduate me-1"></i> Student Login
                </Nav.Link>
                <Nav.Link as={Link} to="/admin-login" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                  <i className="fa-solid fa-user-shield me-1"></i> Admin Login
                </Nav.Link>
              </>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  )
}

export default Navbar

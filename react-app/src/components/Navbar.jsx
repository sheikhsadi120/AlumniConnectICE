import { Link, useLocation } from 'react-router-dom'
import { Navbar as BSNavbar, Container, Nav, NavDropdown } from 'react-bootstrap'

function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <BSNavbar expand="lg" className="ac-navbar shadow-sm">
      <Container fluid="xl">
        <BSNavbar.Brand as={Link} to="/" className="ac-navbar-brand">
          <img
            src="/assets/site-logo.jpg"
            alt="University Logo"
            className="ac-navbar-main-logo"
          />
          <span className="ac-navbar-title">ALUMNICONNECT</span>
          <img
            src="/assets/ice-logo-watermark.png"
            alt="Department Seal"
            className="ac-navbar-seal"
          />
        </BSNavbar.Brand>

        <BSNavbar.Toggle aria-controls="main-navbar-nav" className="ac-navbar-toggle" />

        <BSNavbar.Collapse id="main-navbar-nav">
          <Nav className="ms-auto align-items-lg-center gap-1 ac-navbar-links">
            <Nav.Link as={Link} to="/" className="ac-navbar-link">
              <i className="fa-solid fa-house me-1"></i> Home
            </Nav.Link>

            {isHome ? (
              <NavDropdown
                title={<span className="ac-navbar-dropdown-title"><i className="fa-solid fa-right-to-bracket me-1"></i> Login</span>}
                id="login-dropdown"
                align="end"
                menuVariant="dark"
                className="ac-navbar-dropdown"
              >
                <NavDropdown.Item as={Link} to="/admin-login">
                  <i className="fa-solid fa-user-shield me-2"></i> Admin Login
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/alumni-login">
                  <i className="fa-solid fa-user-graduate me-2"></i> Alumni Login
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/student-login">
                  <i className="fa-solid fa-user me-2"></i> Student Login
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/alumni-login" className="ac-navbar-link">
                  <i className="fa-solid fa-user-graduate me-1"></i> Alumni Login
                </Nav.Link>
                <Nav.Link as={Link} to="/student-login" className="ac-navbar-link">
                  <i className="fa-solid fa-user me-1"></i> Student Login
                </Nav.Link>
                <Nav.Link as={Link} to="/admin-login" className="ac-navbar-link">
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

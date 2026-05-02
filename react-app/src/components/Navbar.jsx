import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar as BSNavbar, Container, Nav, NavDropdown, Offcanvas } from 'react-bootstrap'

function Navbar() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showLoginMenu, setShowLoginMenu] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setShowMobileMenu(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const desktopLinks = [
    { id: 'home', label: 'Home', to: '/', icon: 'fa-house', anchor: false },
    { id: 'about', label: 'About', to: '/#about', icon: 'fa-circle-info', anchor: true },
    { id: 'contact', label: 'Contact', to: '/#contact', icon: 'fa-envelope', anchor: true }
  ]

  const loginItems = [
    { id: 'student', label: 'Student Login', to: '/student-login', icon: 'fa-user' },
    { id: 'alumni', label: 'Alumni Login', to: '/alumni-login', icon: 'fa-user-graduate' },
    { id: 'admin', label: 'Admin Login', to: '/admin-login', icon: 'fa-user-shield' }
  ]

  const mobileMenuItems = [
    desktopLinks[0],
    loginItems[1],
    loginItems[0],
    loginItems[2],
    desktopLinks[2],
    desktopLinks[1]
  ]

  const closeMobileMenu = () => setShowMobileMenu(false)

  return (
    <BSNavbar expand="lg" sticky="top" className="ac-navbar shadow-sm">
      <Container fluid="xl">
        <div className="ac-navbar-left">
          <img
            src="/assets/site-logo.jpg"
            alt="University Logo"
            className="ac-navbar-main-logo"
          />
          <div className="ac-marquee-container">
            <span className="ac-marquee-text">INFORMATION AND COMMUNICATION ENGINEERING ALUMNICONNECT-RU</span>
          </div>
          <img
            src="/assets/ice-logo-watermark.png"
            alt="Department Seal"
            className="ac-navbar-seal-relocated"
          />
        </div>

        <BSNavbar.Toggle
          aria-controls="ac-mobile-nav"
          className="ac-navbar-toggle d-lg-none"
          onClick={() => setShowMobileMenu((value) => !value)}
        />

        <div className="ac-navbar-desktop-nav d-none d-lg-flex ms-auto">
          <Nav className="align-items-center gap-2 ac-navbar-links ac-navbar-links-desktop">
            {desktopLinks.map((item) => (
              <Nav.Link
                key={item.id}
                as={item.anchor ? 'a' : Link}
                href={item.anchor ? item.to : undefined}
                to={item.anchor ? undefined : item.to}
                className="ac-navbar-link"
              >
                <i className={`fa-solid ${item.icon} me-1`}></i>
                {item.label}
              </Nav.Link>
            ))}

            <NavDropdown
              title={
                <span className="ac-navbar-dropdown-title">
                  <i className="fa-solid fa-right-to-bracket me-1"></i> Login
                  <i className="fa-solid fa-chevron-down ms-2 dropdown-icon"></i>
                </span>
              }
              id="login-dropdown"
              align="end"
              menuVariant="dark"
              className="ac-navbar-dropdown"
              show={showLoginMenu}
              onToggle={(show) => setShowLoginMenu(show)}
            >
              {loginItems.map((item) => (
                <div key={item.id}>
                  <NavDropdown.Item
                    as={Link}
                    to={item.to}
                    className="ac-dropdown-item"
                    onClick={() => setShowLoginMenu(false)}
                  >
                    <i className={`fa-solid ${item.icon} me-2`}></i>
                    {item.label}
                  </NavDropdown.Item>
                  <NavDropdown.Divider className="ac-divider" />
                </div>
              ))}
            </NavDropdown>
          </Nav>
        </div>

        <Offcanvas
          id="ac-mobile-nav"
          placement="end"
          show={showMobileMenu}
          onHide={closeMobileMenu}
          className="ac-navbar-offcanvas d-lg-none"
        >
          <Offcanvas.Header closeButton closeVariant="white" className="ac-navbar-offcanvas-header">
            <Offcanvas.Title className="ac-navbar-offcanvas-title">
              Alumni Navigation
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="ac-navbar-offcanvas-body">
            <div className="ac-navbar-drawer-card">
              <div className="ac-navbar-drawer-badge">ICE AlumniConnect</div>

              <div className="ac-navbar-drawer-grid">
                {mobileMenuItems.map((item) => (
                  <Nav.Link
                    key={item.id}
                    as={item.anchor ? 'a' : Link}
                    href={item.anchor ? item.to : undefined}
                    to={item.anchor ? undefined : item.to}
                    className={`ac-navbar-drawer-link${item.id === 'student' || item.id === 'alumni' || item.id === 'admin' ? ' ac-navbar-drawer-link-login' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    <span className="ac-navbar-drawer-icon">
                      <i className={`fa-solid ${item.icon}`}></i>
                    </span>
                    <span className="ac-navbar-drawer-label">{item.label}</span>
                  </Nav.Link>
                ))}
              </div>

              <div className="ac-navbar-drawer-divider"></div>

            </div>
          </Offcanvas.Body>
        </Offcanvas>
      </Container>
    </BSNavbar>
  )
}

export default Navbar

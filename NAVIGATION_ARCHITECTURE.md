# Navigation Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Alumni Management System                     │
│                     Navigation Architecture                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ React Router v6                                                 │
│  └─ <BrowserRouter>                                             │
│     └─ <Routes>                                                 │
│        ├─ /student-dashboard  → StudentDashboard               │
│        ├─ /alumni-dashboard   → AlumniDashboard                │
│        ├─ /my-profile         → ProfileViewPage                │
│        ├─ /profile/:id        → ProfileViewPage                │
│        └─ /edit-profile       → EditProfilePage                │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    useNavigate() & useLocation()
                              │
┌─────────────────────────────────────────────────────────────────┐
│ Navigation Hooks (react-app/src/utils/navigation-hooks.js)     │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ useRestoreScrollPosition()                                │ │
│ │ - Watches data-scroll-container attributes                │ │
│ │ - Restores scroll position from sessionStorage            │ │
│ │ - Auto-executes on component mount                        │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ useSearchPreservation(key, initial)                       │ │
│ │ - Replaces useState for search/filter state              │ │
│ │ - Auto-saves to sessionStorage on change                 │ │
│ │ - Auto-restores from sessionStorage on mount             │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ useNavigateWithScroll(scrollKey)                          │ │
│ │ - Enhanced navigate that saves scroll before changing     │ │
│ │ - Handles multiple scroll containers                      │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ useAddReferrer(state, referrer)                           │ │
│ │ - Tracks where user navigated from                        │ │
│ │ - Useful for breadcrumbs or contextual messages           │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard Components                                            │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ StudentDashboard / AlumniDashboard                        │  │
│ │                                                           │  │
│ │ const [alumniSearch, setAlumniSearch] =                  │  │
│ │   useSearchPreservation('key', '')  ← Preserved          │  │
│ │                                                           │  │
│ │ useRestoreScrollPosition()  ← Restores scroll            │  │
│ │                                                           │  │
│ │ <div data-scroll-container="unique-id">                 │  │
│ │   {/* Content that scrolls and is restored */}           │  │
│ │   {filteredAlumni.map(a =>                              │  │
│ │     <button onClick={() =>                              │  │
│ │       navigate(`/profile/${a.id}`, {                    │  │
│ │         state: { profile: a }  ← State passed            │  │
│ │       })                                                  │  │
│ │     }>View Profile</button>                             │  │
│ │   )}                                                      │  │
│ │ </div>                                                    │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│ Profile Components                                              │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ProfileViewPage / EditProfilePage                        │  │
│ │                                                           │  │
│ │ const location = useLocation()                           │  │
│ │ const profile = location.state?.profile  ← Use state     │  │
│ │                                                           │  │
│ │ <button onClick={() => navigate(-1)}>                   │  │
│ │   ← Back  ← Uses navigate(-1) to return                  │  │
│ │ </button>                                                 │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│ Browser & sessionStorage                                        │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ sessionStorage                                            │  │
│ │                                                           │  │
│ │ "student-dashboard-alumni-search": "Ahmed"              │  │
│ │ "alumni-dashboard-alumni-search": "Ali"                 │  │
│ │ "scroll_states": {                                       │  │
│ │   "student-dashboard-content": 1234,                    │  │
│ │   "alumni-dashboard-content": 5678                      │  │
│ │ }                                                         │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Browser History Stack                                    │  │
│ │                                                           │  │
│ │ [1] /alumni-dashboard       Current                      │  │
│ │ [2] /profile/123      ← navigate(-1) goes here           │  │
│ │ [3] /student-dashboard                                   │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Navigation Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ USER FLOW: Alumni Directory → Profile → Back to Directory           │
└──────────────────────────────────────────────────────────────────────┘

START
  │
  ├─→ StudentDashboard (Alumni List Tab)
  │   ├─→ User types in search: "Ahmed"
  │   │   └─→ useSearchPreservation() saves to sessionStorage
  │   │       sessionStorage['student-dashboard-alumni-search'] = "Ahmed"
  │   │
  │   ├─→ Results filtered & displayed: [Ahmed Profile 1], [Ahmed Profile 2]...
  │   │
  │   ├─→ User scrolls down (scroll position: 1200px)
  │   │   └─→ Position marked via data-scroll-container
  │   │
  │   ├─→ User clicks "View Profile"
  │   │   └─→ navigate(`/profile/${id}`, { state: { profile: data } })
  │   │   └─→ Browser history: [..., /alumni-dashboard, /profile/123]
  │   │
  │   └─→ NAVIGATE TO: ProfileViewPage
  │
  ├─→ ProfileViewPage (Viewing Ahmed's Profile)
  │   ├─→ Profile loads from location.state.profile (no API call!)
  │   ├─→ User reads profile information
  │   └─→ User clicks "Back" button
  │       └─→ navigate(-1)
  │       └─→ Browser history goes back one step
  │
  └─→ RETURN TO: StudentDashboard (Alumni List Tab)
      ├─→ Component remounts
      ├─→ useRestoreScrollPosition() runs
      │   └─→ Reads sessionStorage['scroll_states']
      │   └─→ Finds "student-dashboard-content": 1200
      │   └─→ Sets scroll position to 1200px
      │
      ├─→ useSearchPreservation() initializes
      │   └─→ Reads sessionStorage['student-dashboard-alumni-search']
      │   └─→ Finds value: "Ahmed"
      │   └─→ Sets search state to "Ahmed"
      │
      └─→ Renders list with:
          ✅ Search filter still showing "Ahmed"
          ✅ Results still filtered to [Ahmed Profile 1], [Ahmed Profile 2]
          ✅ Scroll position restored to 1200px
          ✅ User sees exactly what they left!
```

## State Preservation Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIME  │ ACTION                   │ STATE IN sessionStorage           │
├─────────────────────────────────────────────────────────────────────┤
│ 0:00  │ Open Dashboard           │ (empty)                           │
│ 0:05  │ Navigate to Alumni List  │ (empty)                           │
│ 0:10  │ Type search: "Ahmed"     │ search: "Ahmed"                   │
│       │                          │ (auto-saved by hook)              │
│ 0:15  │ Scroll down (pos: 1200)  │ scroll: {content: 1200}           │
│       │                          │ search: "Ahmed"                   │
│ 0:20  │ Click "View Profile"     │ search: "Ahmed" (preserved!)      │
│       │ Navigate to /profile/123 │ scroll: {content: 1200} (saved!)  │
│       │                          │                                   │
│ 0:25  │ Profile page loads       │ (state still intact)              │
│       │ User reads profile...    │                                   │
│       │                          │                                   │
│ 0:30  │ Click "Back" button      │ (state still intact)              │
│       │ navigate(-1)             │                                   │
│       │                          │                                   │
│ 0:35  │ Return to Alumni List    │ ✅ search: "Ahmed"               │
│       │ Component remounts       │ ✅ scroll: {content: 1200}        │
│       │ Hooks execute:           │                                   │
│       │ - Restore search         │ Results: [Ahmed 1], [Ahmed 2]     │
│       │ - Restore scroll         │ Scroll: At position 1200px        │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Dependencies

```
┌─────────────────────────────────────┐
│ React Router Hooks                  │
├─────────────────────────────────────┤
│ useNavigate()                       │
│ useLocation()                       │
│ useParams()                         │
└─────────────────────────────────────┘
           ▲                    ▲
           │                    │
           └──────┬─────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌────────▼────────┐
│   Dashboard    │  │  Profile Pages  │
│   Components   │  │  Components     │
├────────────────┤  ├─────────────────┤
│ Student        │  │ ProfileViewPage │
│ Alumni         │  │ EditProfilePage │
└────────────────┘  └─────────────────┘
        ▲                    ▲
        │                    │
        └──────┬──────────┬──┘
               │          │
        ┌──────▼──┐  ┌────▼──────┐
        │Navigation Hooks Module  │
        ├────────────────────────┤
        │ useRestoreScrollPos()   │
        │ useSearchPreservation() │
        │ useNavigateWithScroll() │
        │ useAddReferrer()        │
        └────────────────────────┘
               ▲
               │
        ┌──────▼──────────────┐
        │ sessionStorage API  │
        ├──────────────────────┤
        │ getItem()            │
        │ setItem()            │
        │ clear()              │
        └──────────────────────┘
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ FORWARD NAVIGATION: Dashboard → Profile                            │
└──────────────────────────────────────────────────────────────────────┘

User Input
    ↓ (Click View Profile)
    ↓
Route Handler
    ├─→ navigate(`/profile/${id}`, { state: { profile: data } })
    ├─→ Profile data added to location.state
    ├─→ URL changes to /profile/123
    ├─→ Browser history updated
    │
    └─→ Profile Page Renders
        ├─→ useLocation() → location.state.profile
        ├─→ No API call needed (data from state!)
        └─→ User sees profile


┌──────────────────────────────────────────────────────────────────────┐
│ BACKWARD NAVIGATION: Profile → Dashboard                           │
└──────────────────────────────────────────────────────────────────────┘

User Input
    ↓ (Click Back Button)
    ↓
Route Handler
    ├─→ navigate(-1)
    ├─→ Browser history goes back
    ├─→ URL changes to /student-dashboard
    │
    └─→ Dashboard Component Remounts
        ├─→ useRestoreScrollPosition()
        │   └─→ sessionStorage.getItem('scroll_states')
        │   └─→ Finds: {"student-dashboard-content": 1200}
        │   └─→ Set scroll position: 1200px
        │
        ├─→ useSearchPreservation() init
        │   └─→ sessionStorage.getItem('student-dashboard-alumni-search')
        │   └─→ Finds: "Ahmed"
        │   └─→ Set search state: "Ahmed"
        │
        └─→ Component Renders
            ├─→ Search filter: "Ahmed" (visible in input)
            ├─→ Results: [Ahmed Profile 1], [Ahmed Profile 2]
            ├─→ Scroll position: 1200px (user at same spot)
            └─→ User sees exactly what they left!
```

## sessionStorage Management

```
┌──────────────────────────────────────────────────────────────────────┐
│ How sessionStorage is Used                                          │
└──────────────────────────────────────────────────────────────────────┘

SAVE (When navigating away):
    Component A → navigate() → Before unload
        ↓
    useSearchPreservation() setter
        ↓
    sessionStorage.setItem(key, value)
        ↓
    sessionStorage: { key: value }


CLEAR (On specific actions):
    Tab closes → Browser closes sessionStorage
    OR
    User calls: sessionStorage.clear()
        ↓
    sessionStorage: {} (empty)


RESTORE (When returning to page):
    Browser back or navigate to same route
        ↓
    Component remounts
        ↓
    useRestoreScrollPosition() executes
    useSearchPreservation() initializes
        ↓
    sessionStorage.getItem(key)
        ↓
    Set component state to saved value
        ↓
    Component renders with restored state


KEY POINTS:
    ✓ sessionStorage is per-tab (not shared between tabs)
    ✓ sessionStorage clears when tab closes (no persistent bloat)
    ✓ sessionStorage is per-domain (secure by default)
    ✓ Each key can store up to 5-10MB (more than enough)
```

---

*For detailed information, see NAVIGATION_GUIDE.md, NAVIGATION_IMPLEMENTATION.md, or NAVIGATION_QUICK_REFERENCE.md*

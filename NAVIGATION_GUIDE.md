# Navigation & State Preservation Guide

## Overview

This document outlines best practices for navigation in the Alumni Management System, ensuring users always return to the correct previous page with state preserved.

## Key Concepts

### 1. Browser Back Navigation
Use `navigate(-1)` to return to the previous page in browser history.

```jsx
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()
navigate(-1)  // Returns to previous page
```

**Benefits:**
- Uses browser's native history
- Preserves scroll position automatically
- Works consistently across routes

### 2. Scroll Position Restoration

When navigating away from a page with a long list (e.g., Alumni Dashboard), scroll position is lost when returning. Use `data-scroll-container` attributes to track and restore scroll position.

**Pattern:**
```jsx
import { useRestoreScrollPosition } from '../utils/navigation-hooks'

export function AlumniDashboard() {
  useRestoreScrollPosition()

  return (
    <div data-scroll-container="dashboard-alumni-list" style={{overflowY: 'auto', height: '100vh'}}>
      {/* Content that can scroll */}
    </div>
  )
}
```

### 3. Filter/Search State Preservation

When users search or filter content and then navigate away, the filter state should persist when they return.

**Pattern:**
```jsx
import { useSearchPreservation } from '../utils/navigation-hooks'

export function AlumniDashboard() {
  const [alumniSearch, setAlumniSearch] = useSearchPreservation('alumni-dashboard-search', '')

  return (
    <input
      value={alumniSearch}
      onChange={(e) => setAlumniSearch(e.target.value)}
      placeholder="Search alumni..."
    />
  )
}
```

### 4. Navigation with State

When navigating to a profile or detail page, pass the source page information via location state.

**Pattern:**
```jsx
navigate(`/profile/${alumni.id}`, {
  state: {
    profile: alumni,          // Pass minimal data to avoid redundant API calls
    referrer: 'alumni-list',   // Track where we came from
  }
})
```

### 5. Referrer Tracking

Track where users navigate from using the `referrer` in location state:

```jsx
import { useLocation } from 'react-router-dom'

export function ProfileViewPage() {
  const location = useLocation()
  const { referrer, profile } = location.state || {}

  // referrer might be: 'alumni-dashboard', 'alumni-list', etc.
  return (
    <div>
      <button onClick={() => navigate(-1)}>
        ← Back to {referrer || 'Previous Page'}
      </button>
    </div>
  )
}
```

## Navigation Flows

### Flow 1: Dashboard → My Profile → Back to Dashboard
```
StudentDashboard
  ↓ (click "My Profile")
EditProfilePage
  ↓ (click "Back" or browser back)
StudentDashboard (scroll position restored, filters intact)
```

**Implementation:**
```jsx
// StudentDashboard
const [alumniSearch, setAlumniSearch] = useSearchPreservation('alumni-dashboard-search', '')

<button onClick={() => navigate('/my-profile')}>
  My Profile
</button>

// EditProfilePage (already has back button)
<button onClick={() => navigate(-1)}>Back</button>
```

### Flow 2: Alumni Directory → View Profile → Back to Alumni Directory
```
StudentDashboard (Alumni List tab)
  ↓ (click "View Profile" in table row)
ProfileViewPage
  ↓ (click "Back" or browser back)
StudentDashboard (Alumni List tab, scroll & filters restored)
```

**Implementation:**
```jsx
// StudentDashboard - Alumni List Row
<div onClick={() => navigate(`/profile/${alumni.id}`, { 
  state: { profile: alumni, referrer: 'alumni-directory' } 
})}>
  {/* Row content */}
</div>

// ProfileViewPage (already has back button with navigate(-1))
<button onClick={() => navigate(-1)}>Back</button>
```

### Flow 3: Alumni Dashboard → Edit Profile → Save & Return
```
AlumniDashboard
  ↓ (click "Edit Profile")
EditProfilePage
  ↓ (fill form, click "Save Changes")
MyProfilePage (after successful save)
  ↓ (user clicks back or navigates)
AlumniDashboard
```

**Implementation:**
```jsx
// EditProfilePage - After successful save
const handleSaveSuccess = (nextProfile) => {
  persistLocalUser(nextProfile)
  // Use replace to prevent back button returning to edit page
  navigate('/my-profile', { 
    replace: true, 
    state: { profile: nextProfile } 
  })
}
```

## Implementation Checklist

### Dashboard Pages (StudentDashboard, AlumniDashboard)
- [ ] Wrap scrollable content in `<div data-scroll-container="unique-key">`
- [ ] Call `useRestoreScrollPosition()` in useEffect
- [ ] Use `useSearchPreservation()` for search/filter state
- [ ] Pass state when navigating to profile pages
- [ ] Save scroll position before navigating away

### Profile View Pages (ProfileViewPage)
- [ ] Back button already implemented with `navigate(-1)`
- [ ] Pass profile data via location state to avoid unnecessary API calls
- [ ] Display referrer in toast/feedback if desired

### Profile Edit Pages (EditProfilePage)
- [ ] Back button already implemented with `navigate(-1)`
- [ ] After successful save, use `replace: true` to prevent back button issues
- [ ] Pass updated profile state back to source

## Browser Back Button Behavior

The browser's native back button (`navigate(-1)`) is the most reliable method because:

1. **Automatic scroll restoration:** Most browsers restore scroll position by default
2. **History stack awareness:** Back button knows the entire history stack
3. **Consistent across routes:** Works the same regardless of navigation method
4. **User expectation:** Users expect back button to work like their browser

**Never use:** Hardcoded redirects to `/` or `/dashboard`. Always use `navigate(-1)` in profile/detail pages.

## sessionStorage Keys

These keys are reserved for scroll and filter preservation:

- `scroll_${key}` - Scroll position for containers with `data-scroll-container`
- `scroll_states` - Temporary storage for multiple scroll positions
- `${key}-search` - Search/filter state for dashboard pages
- `alumni-dashboard-search` - Alumni list search filter

**Note:** sessionStorage is cleared when the browser tab closes, which is the desired behavior.

## Testing Navigation

### Manual Testing Steps:
1. From dashboard, search for an alumni (e.g., "Ahmed")
2. Scroll down in the alumni list
3. Click "View Profile" on any row
4. Click "Back" button or use browser back button
5. Verify: You're back on dashboard, search filter still shows "Ahmed", scroll position restored

### Test Cases:
- [ ] Dashboard → View Profile → Back
- [ ] Dashboard → My Profile → Back
- [ ] My Profile → Edit Profile → Save → Back
- [ ] Edit Profile → Back (cancel)
- [ ] Multiple navigations back and forth

## Common Pitfalls to Avoid

### ❌ Don't navigate to "/" (homepage)
```jsx
// BAD
navigate('/')  // User loses context
```

### ✅ Do use navigate(-1)
```jsx
// GOOD
navigate(-1)  // User returns to where they came from
```

### ❌ Don't lose state during navigation
```jsx
// BAD
navigate(`/profile/${id}`)  // No state passed
```

### ✅ Do pass state with profile data
```jsx
// GOOD
navigate(`/profile/${id}`, { 
  state: { profile: data }  // Avoids API call
})
```

### ❌ Don't refresh entire page when returning
```jsx
// BAD - causes page reload and state loss
window.location.href = '/dashboard'
```

### ✅ Do use React Router navigation
```jsx
// GOOD - preserves component state and history
navigate('/dashboard')
```

## Performance Considerations

1. **sessionStorage vs localStorage:**
   - Use `sessionStorage` for temporary navigation state (cleared on tab close)
   - Use `localStorage` for persistent user preferences

2. **Scroll restoration:**
   - Don't use `useEffect` to scroll on every render
   - Use `requestAnimationFrame` for scroll restoration
   - Save scroll only when navigating away

3. **State in URL:**
   - Keep the URL clean (use query params only for deep-linking)
   - Use location.state for temporary navigation data

## Future Enhancements

1. **Breadcrumb navigation:** Show navigation path at top of page
2. **Undo/Redo navigation:** For power users
3. **Smart scroll restoration:** Remember scroll position per route
4. **Prefetching:** Load profile data before user clicks view
5. **Animation transitions:** Add page transition animations with proper scroll handling

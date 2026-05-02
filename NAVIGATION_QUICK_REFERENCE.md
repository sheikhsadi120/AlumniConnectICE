# Navigation Quick Reference

## Common Patterns

### Pattern 1: Directory/List Page with Search Preservation

```jsx
import { useRestoreScrollPosition, useSearchPreservation } from '../utils/navigation-hooks'
import { useNavigate } from 'react-router-dom'

export function AlumniDirectoryPage() {
  const navigate = useNavigate()
  
  // Preserve search filter across navigations
  const [search, setSearch] = useSearchPreservation('alumni-directory-search', '')
  
  // Restore scroll position when returning from detail pages
  useRestoreScrollPosition()
  
  const filteredAlumni = alumni.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="directory-page">
      {/* Search input */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search alumni..."
      />

      {/* Scrollable content - mark for scroll restoration */}
      <div 
        data-scroll-container="alumni-directory-content"
        style={{ overflowY: 'auto', height: '100vh' }}
      >
        {filteredAlumni.map(alumni => (
          <div
            key={alumni.id}
            onClick={() => navigate(`/profile/${alumni.id}`, {
              state: { profile: alumni }  // Pass data to avoid API call
            })}
          >
            {alumni.name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Pattern 2: Detail/View Page with Back Navigation

```jsx
import { useNavigate, useLocation } from 'react-router-dom'

export function ProfileDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get profile from state or load via API
  const profile = location.state?.profile || (await loadProfile())

  return (
    <div className="profile-page">
      {/* Back button - uses browser history */}
      <button onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* Profile content */}
      <h1>{profile.name}</h1>
      {/* ... rest of profile ... */}
    </div>
  )
}
```

### Pattern 3: Edit Page with Save & Return

```jsx
import { useNavigate, useLocation } from 'react-router-dom'

export function EditProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(location.state?.profile || {})

  const handleSave = async () => {
    const result = await editProfile(form)
    if (result.ok) {
      // Use 'replace' to prevent back button returning to edit page
      navigate('/profile', { 
        replace: true,
        state: { profile: result.data }
      })
    }
  }

  return (
    <form>
      {/* Form inputs */}
      <button onClick={() => navigate(-1)}>Cancel</button>
      <button onClick={handleSave}>Save Changes</button>
    </form>
  )
}
```

## API Service Functions

### Basic Profile Fetch with Caching

```jsx
// In services/api.js
export async function getProfile(id) {
  return await request(`/profile/${id}`)
}

export async function getMyProfile(userId, userType) {
  return await request(`/my-profile?id=${userId}&user_type=${userType}`)
}
```

### Usage in Components

```jsx
// Option 1: Use profile from state (preferred - no API call)
const profile = location.state?.profile
if (!profile) {
  // Fallback to API if no state
  const result = await getProfile(id)
  setProfile(result.data.profile)
}

// Option 2: Always fetch fresh data (use for updated info)
const result = await getProfile(id)
setProfile(result.data.profile)
```

## Common Mistakes to Avoid

### ❌ Don't Do This

```jsx
// WRONG: Loses context
navigate('/')

// WRONG: Clears search when returning
const [search, setSearch] = useState(initialSearch)

// WRONG: Doesn't pass state
navigate(`/profile/${id}`)

// WRONG: Hard-coded redirect
window.location.href = '/dashboard'

// WRONG: Reloads entire page
window.location.reload()
```

### ✅ Do This Instead

```jsx
// GOOD: Returns to previous page with full context
navigate(-1)

// GOOD: Preserves search across navigations
const [search, setSearch] = useSearchPreservation('key', initialSearch)

// GOOD: Passes profile to avoid API call
navigate(`/profile/${id}`, { state: { profile: data } })

// GOOD: Uses React Router for navigation
navigate('/dashboard')

// GOOD: Doesn't reload page, just navigates
navigate('/dashboard', { replace: true })
```

## Hook Usage Examples

### useSearchPreservation

```jsx
// Save and restore search term
const [search, setSearch] = useSearchPreservation('my-search', '')

// Automatically saved to sessionStorage
<input value={search} onChange={e => setSearch(e.target.value)} />

// When user navigates away and comes back, search is restored
```

### useRestoreScrollPosition

```jsx
// Restore scroll position when returning to page
useRestoreScrollPosition()

// Mark scrollable container
<div data-scroll-container="unique-id" style={{overflowY: 'auto'}}>
  {/* Content */}
</div>

// When user navigates back, scroll position is restored
```

### useRestoreScrollPosition with Custom Key

```jsx
// For pages with multiple scroll containers
<div data-scroll-container="profile-list">
  {/* Scrollable profile list */}
</div>

<div data-scroll-container="alumni-list">
  {/* Scrollable alumni list */}
</div>

// Both scroll positions are saved and restored independently
```

## Navigation State Structure

### Recommended State Format

```jsx
// When navigating to a detail page
navigate(`/profile/${id}`, {
  state: {
    profile: {
      // Include minimal data needed for rendering
      id,
      name,
      email,
      // ... other fields
    },
    referrer: 'alumni-directory',  // Optional: track where from
    timestamp: Date.now()          // Optional: track when navigated
  }
})
```

### Accessing State in Detail Page

```jsx
const location = useLocation()
const { profile, referrer } = location.state || {}

// Use profile if available, otherwise fetch
if (!profile?.id) {
  // Fetch from API
}
```

## Debugging Tips

### Check If Search Is Preserved

```javascript
// In browser console
sessionStorage.getItem('alumni-directory-search')
// Should return: "Ahmed"
```

### Check If Scroll Is Saved

```javascript
// In browser console
sessionStorage.getItem('scroll_states')
// Should return something like: {"alumni-directory-content": 1234}
```

### Force Clear All Navigation State

```javascript
// Clear all scroll and search state
sessionStorage.clear()

// Or clear specific key
sessionStorage.removeItem('alumni-directory-search')
sessionStorage.removeItem('scroll_states')
```

### Test Navigation Flow

```javascript
// 1. Before navigating away, check storage
console.log('Before:', sessionStorage)

// 2. Navigate away (will see page change)

// 3. Navigate back

// 4. Check if restored
console.log('After:', sessionStorage)
// Should have same scroll_states and search values
```

## Real-World Example: Complete Flow

### StudentDashboard (Starting Page)

```jsx
import { useRestoreScrollPosition, useSearchPreservation } from '../utils/navigation-hooks'
import { useNavigate } from 'react-router-dom'

export function StudentDashboard() {
  const navigate = useNavigate()
  const [alumniSearch, setAlumniSearch] = useSearchPreservation(
    'student-dashboard-alumni-search', 
    ''
  )
  
  useRestoreScrollPosition()
  
  const filtered = alumni.filter(a => 
    a.name.includes(alumniSearch)
  )

  return (
    <div data-scroll-container="student-dashboard-content">
      <input
        value={alumniSearch}
        onChange={e => setAlumniSearch(e.target.value)}
        placeholder="Search..."
      />
      
      {filtered.map(a => (
        <div
          key={a.id}
          onClick={() => navigate(`/profile/${a.id}`, {
            state: { profile: a }
          })}
        >
          {a.name}
        </div>
      ))}
    </div>
  )
}
```

### ProfileViewPage (Detail Page)

```jsx
import { useNavigate, useLocation } from 'react-router-dom'

export function ProfileViewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = location.state?.profile

  return (
    <div>
      <button onClick={() => navigate(-1)}>
        ← Back to Alumni Directory
      </button>
      
      <h1>{profile.name}</h1>
      {/* Profile content */}
    </div>
  )
}
```

### User Experience

1. User searches for "Ahmed" in StudentDashboard
2. User scrolls down to find a profile
3. **User clicks "View Profile"**
   - StudentDashboard: search="Ahmed", scroll=1200px → sessionStorage
   - Navigate to `/profile/123` with profile data
   - ProfileViewPage displays profile
4. **User clicks "Back" button**
   - Navigate(-1) returns to StudentDashboard
   - useRestoreScrollPosition() restores scroll=1200px
   - useSearchPreservation restores search="Ahmed"
   - User sees same filtered results at same scroll position

## Performance Tips

1. **Use location.state instead of refetching:** Saves API calls
2. **sessionStorage only:** Better than localStorage for temp data
3. **Minimal state passing:** Only pass data needed for rendering
4. **Memoize expensive filters:** Use `useMemo` for large lists

```jsx
const filtered = useMemo(() =>
  alumni.filter(a => a.name.includes(search)),
  [alumni, search]
)
```

## Resources

- [NAVIGATION_GUIDE.md](../NAVIGATION_GUIDE.md) - Detailed patterns
- [NAVIGATION_IMPLEMENTATION.md](../NAVIGATION_IMPLEMENTATION.md) - Implementation details
- [react-app/src/utils/navigation-hooks.js](../react-app/src/utils/navigation-hooks.js) - Hook source code
- React Router docs: https://reactrouter.com/

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Hook for preserving and restoring scroll position across page navigations
 * 
 * Usage in a dashboard/list page:
 *   const { scrollRef } = useScrollRestoration('dashboard-alumni-list')
 *   return <div ref={scrollRef} className="dashboard-content">...</div>
 * 
 * @param {string} key - Unique key to store scroll position (e.g., 'dashboard-alumni-list')
 * @returns {object} { scrollRef, saveScrollPosition }
 */
export function useScrollRestoration(key) {
  const scrollRef = useRef(null)
  const location = useLocation()

  // Save current scroll position to sessionStorage when navigating away
  const saveScrollPosition = useCallback(() => {
    if (scrollRef.current) {
      sessionStorage.setItem(`scroll_${key}`, scrollRef.current.scrollTop)
    }
  }, [key])

  // Restore scroll position when returning to this page
  useEffect(() => {
    const savedScrollTop = sessionStorage.getItem(`scroll_${key}`)
    
    // Delay restoration to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (scrollRef.current && savedScrollTop) {
        scrollRef.current.scrollTop = parseInt(savedScrollTop, 10)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [key, location.pathname])

  return {
    scrollRef,
    saveScrollPosition,
  }
}

/**
 * Hook for handling navigation with automatic scroll saving
 * 
 * Usage:
 *   const navigateWithScroll = useNavigateWithScroll('dashboard-alumni-list')
 *   <button onClick={() => navigateWithScroll('/profile/123', state)}>View Profile</button>
 * 
 * @param {string} scrollKey - Key for scroll restoration (e.g., 'dashboard-alumni-list')
 * @returns {function} Navigate function that saves scroll before navigating
 */
export function useNavigateWithScroll(scrollKey) {
  const navigate = useNavigate()
  const scrollRef = useRef(null)

  return useCallback((path, options = {}) => {
    // Save scroll position before navigating
    const scrollContainers = document.querySelectorAll('[data-scroll-container]')
    const scrollStates = {}

    scrollContainers.forEach((container) => {
      const key = container.getAttribute('data-scroll-container')
      if (key) {
        scrollStates[key] = container.scrollTop
      }
    })

    if (Object.keys(scrollStates).length > 0) {
      sessionStorage.setItem('scroll_states', JSON.stringify(scrollStates))
    }

    // Navigate with state
    navigate(path, options)
  }, [navigate])
}

/**
 * Hook for restoring scroll position from sessionStorage
 * Call this on pages that have data-scroll-container attributes
 * 
 * Usage:
 *   useRestoreScrollPosition()
 */
export function useRestoreScrollPosition() {
  useEffect(() => {
    const restoreScroll = () => {
      const scrollStates = sessionStorage.getItem('scroll_states')
      if (!scrollStates) return

      try {
        const states = JSON.parse(scrollStates)
        Object.entries(states).forEach(([key, scrollTop]) => {
          const container = document.querySelector(`[data-scroll-container="${key}"]`)
          if (container) {
            container.scrollTop = scrollTop
          }
        })
        // Clear after restoring
        sessionStorage.removeItem('scroll_states')
      } catch (err) {
        console.warn('Failed to restore scroll position:', err)
      }
    }

    // Restore after paint
    requestAnimationFrame(restoreScroll)
  }, [])
}

/**
 * Hook for preserving filter/search state when navigating
 * 
 * Usage in a list page:
 *   const [search, setSearch] = useSearchPreservation('alumni-search', '')
 *   // Automatically saves to sessionStorage and restores on remount
 * 
 * @param {string} key - Storage key (e.g., 'alumni-search')
 * @param {any} initialValue - Initial value if not in storage
 * @returns {array} [value, setValue]
 */
export function useSearchPreservation(key, initialValue = '') {
  // Initialize from storage
  const [state, setStateInternal] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  // Wrapped setter that also saves to storage
  const setValueWithStorage = useCallback((val) => {
    const newVal = typeof val === 'function' ? val(state) : val
    setStateInternal(newVal)
    sessionStorage.setItem(key, JSON.stringify(newVal))
  }, [state])

  // Clear storage when component unmounts to prevent stale data
  useEffect(() => {
    return () => {
      // Optional: Only clear if we're navigating to a different page type
      // Otherwise preserve for quick returns
    }
  }, [])

  return [state, setValueWithStorage]
}

/**
 * Hook to add referrer information to location state
 * Tracks where user came from for better back navigation
 * 
 * Usage:
 *   const stateWithReferrer = useAddReferrer(currentView, 'alumni-dashboard')
 *   navigate('/profile/123', { state: stateWithReferrer })
 * 
 * @param {object} state - Existing state object
 * @param {string} referrer - Name of the current page/view
 * @returns {object} State with referrer info added
 */
export function useAddReferrer(state = {}, referrer = '') {
  const location = useLocation()
  
  return {
    ...state,
    referrer: referrer || location.pathname,
    timestamp: Date.now(),
  }
}

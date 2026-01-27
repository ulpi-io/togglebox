/**
 * User Context for ToggleBox
 *
 * This file shows how to get user IDs for ToggleBox targeting in real apps.
 * The userId is used to:
 *   - Evaluate feature flags with targeting rules
 *   - Assign consistent A/B test variants
 *   - Track events and conversions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMPORTANT: User IDs must be STABLE (same user = same ID every time)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Good user IDs:
 *   ✓ Database user ID (e.g., from Clerk, Auth0, Firebase, NextAuth)
 *   ✓ Email address (if user is logged in)
 *   ✓ Persistent device ID (for anonymous users)
 *
 * Bad user IDs:
 *   ✗ Random UUIDs generated on each page load
 *   ✗ Session IDs that change
 *   ✗ Timestamps
 */

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION 1: NextAuth.js / Auth.js
// ═══════════════════════════════════════════════════════════════════════════════
//
// import { useSession } from 'next-auth/react'
//
// export function useUserId(): string | null {
//   const { data: session } = useSession()
//   return session?.user?.id ?? session?.user?.email ?? null
// }

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION 2: Clerk
// ═══════════════════════════════════════════════════════════════════════════════
//
// import { useUser } from '@clerk/nextjs'
//
// export function useUserId(): string | null {
//   const { user } = useUser()
//   return user?.id ?? null
// }

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION 3: Firebase Auth
// ═══════════════════════════════════════════════════════════════════════════════
//
// import { useAuthState } from 'react-firebase-hooks/auth'
// import { auth } from '@/lib/firebase'
//
// export function useUserId(): string | null {
//   const [user] = useAuthState(auth)
//   return user?.uid ?? null
// }

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION 4: Supabase Auth
// ═══════════════════════════════════════════════════════════════════════════════
//
// import { useUser } from '@supabase/auth-helpers-react'
//
// export function useUserId(): string | null {
//   const user = useUser()
//   return user?.id ?? null
// }

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION 5: Anonymous users (localStorage device ID)
// ═══════════════════════════════════════════════════════════════════════════════
//
// export function useUserId(): string {
//   if (typeof window === 'undefined') return 'anonymous'
//
//   let deviceId = localStorage.getItem('togglebox_device_id')
//   if (!deviceId) {
//     deviceId = crypto.randomUUID()
//     localStorage.setItem('togglebox_device_id', deviceId)
//   }
//   return deviceId
// }

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO IMPLEMENTATION (for this example app)
// ═══════════════════════════════════════════════════════════════════════════════
// This example uses a simple simulated user for demonstration purposes.
// In your real app, replace this with one of the patterns above.

import { useState } from 'react'

/**
 * Demo user context - simulates an authenticated user.
 *
 * In your app, replace this with your actual auth provider:
 *   - NextAuth: useSession()
 *   - Clerk: useUser()
 *   - Firebase: useAuthState()
 *   - Supabase: useUser()
 */
export function useUser() {
  // Simulated user for demo purposes
  // In production, this would come from your auth provider
  return {
    id: 'demo-user-abc123',
    email: 'demo@example.com',
    plan: 'pro',
    country: 'US',
  }
}

/**
 * Get just the user ID for ToggleBox context.
 *
 * Usage:
 *   const userId = useUserId()
 *   const enabled = await isFlagEnabled('feature', { userId })
 */
export function useUserId(): string {
  const user = useUser()
  return user.id
}

/**
 * Get full user context for ToggleBox targeting.
 *
 * Include any attributes you want to use in targeting rules:
 *   - userId (required for consistent targeting)
 *   - email, plan, country, etc. (optional, for segmentation)
 *
 * Usage:
 *   const context = useUserContext()
 *   const enabled = await isFlagEnabled('feature', context)
 */
export function useUserContext() {
  const user = useUser()
  return {
    userId: user.id,
    email: user.email,
    plan: user.plan,
    country: user.country,
  }
}

/**
 * For anonymous users: generates a persistent device ID.
 *
 * Useful for:
 *   - A/B testing before login
 *   - Feature flags for anonymous visitors
 *   - Marketing experiments
 */
export function useAnonymousId(): string {
  // Initialize with a function to avoid SSR issues
  // This runs once on mount and gets the stored ID or creates one
  const [deviceId] = useState<string>(() => {
    // Server-side: return placeholder
    if (typeof window === 'undefined') return 'anonymous'

    // Client-side: get or create device ID
    let id = localStorage.getItem('togglebox_device_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('togglebox_device_id', id)
    }
    return id
  })

  return deviceId
}

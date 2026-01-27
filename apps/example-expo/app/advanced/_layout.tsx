import { Stack } from 'expo-router'

export default function AdvancedLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0ea5e9',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="conversion-tracking"
        options={{ title: 'Conversion Tracking' }}
      />
      <Stack.Screen
        name="offline-storage"
        options={{ title: 'Offline Storage' }}
      />
      <Stack.Screen
        name="polling-refresh"
        options={{ title: 'Polling & Refresh' }}
      />
      <Stack.Screen
        name="health-check"
        options={{ title: 'Health Check' }}
      />
      <Stack.Screen
        name="error-handling"
        options={{ title: 'Error Handling' }}
      />
      <Stack.Screen
        name="full-integration"
        options={{ title: 'Full Integration' }}
      />
    </Stack>
  )
}

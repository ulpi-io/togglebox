import { Stack } from 'expo-router'

export default function FullExamplesLayout() {
  return (
    // @ts-expect-error - expo-router Stack type compatibility with React 19
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0ea5e9' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="feature-toggle" options={{ title: 'Feature Toggle' }} />
      <Stack.Screen name="ab-test-cta" options={{ title: 'A/B Test CTA' }} />
      <Stack.Screen name="config-theme" options={{ title: 'Config Theme' }} />
      <Stack.Screen name="polling-updates" options={{ title: 'Polling Updates' }} />
      <Stack.Screen name="error-handling" options={{ title: 'Error Handling' }} />
      <Stack.Screen name="offline-storage" options={{ title: 'Offline Storage' }} />
    </Stack>
  )
}

import { Stack } from 'expo-router'

export default function QuickLayout() {
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
        name="provider-setup"
        options={{ title: 'Provider Setup' }}
      />
      <Stack.Screen
        name="remote-config"
        options={{ title: 'Remote Config' }}
      />
      <Stack.Screen
        name="feature-flags"
        options={{ title: 'Feature Flags' }}
      />
      <Stack.Screen
        name="experiments"
        options={{ title: 'Experiments' }}
      />
    </Stack>
  )
}

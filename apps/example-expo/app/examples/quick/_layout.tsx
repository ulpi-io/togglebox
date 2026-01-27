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
        name="use-config"
        options={{ title: 'Use Config' }}
      />
      <Stack.Screen
        name="use-flag"
        options={{ title: 'Use Flag' }}
      />
      <Stack.Screen
        name="use-experiment"
        options={{ title: 'Use Experiment' }}
      />
      <Stack.Screen
        name="track-event"
        options={{ title: 'Track Event' }}
      />
    </Stack>
  )
}

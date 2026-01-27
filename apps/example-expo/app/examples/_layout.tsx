import { Stack } from 'expo-router'

export default function ExamplesLayout() {
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
      {/* Quick Start Examples */}
      <Stack.Screen
        name="quick"
        options={{
          headerShown: false,
        }}
      />

      {/* Full Examples */}
      <Stack.Screen
        name="full"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}

import { Stack } from 'expo-router'
import { ToggleBoxProvider } from '@togglebox/sdk-expo'
import { API_URL, PLATFORM, ENVIRONMENT } from '@/lib/constants'

export default function RootLayout() {
  return (
    <ToggleBoxProvider
      platform={PLATFORM}
      environment={ENVIRONMENT}
      apiUrl={API_URL}
      pollingInterval={30000}
      configVersion="stable"
      persistToStorage={true}
      storageTTL={86400000}
    >
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
        {/* Home - Example Index */}
        <Stack.Screen
          name="index"
          options={{
            title: 'ToggleBox Examples',
          }}
        />

        {/* Quick Examples */}
        <Stack.Screen
          name="quick"
          options={{
            headerShown: false,
          }}
        />

        {/* Advanced Examples */}
        <Stack.Screen
          name="advanced"
          options={{
            headerShown: false,
          }}
        />

        {/* Playground (Tabs) */}
        <Stack.Screen
          name="playground"
          options={{
            headerShown: false,
          }}
        />

        {/* Detail Screens */}
        <Stack.Screen
          name="flags/[flagKey]"
          options={{
            title: 'Flag Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="experiments/[experimentKey]"
          options={{
            title: 'Experiment Details',
            presentation: 'card',
          }}
        />
      </Stack>
    </ToggleBoxProvider>
  )
}

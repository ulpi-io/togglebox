import { Stack } from "expo-router";
import { ToggleBoxProvider } from "@togglebox/sdk-expo";

// SECURITY WARNING: EXPO_PUBLIC_* variables are embedded in the client bundle.
// Only use public/anonymous API keys here. For privileged keys, use a backend proxy.
const API_URL =
  process.env.EXPO_PUBLIC_TOGGLEBOX_API_URL || "http://localhost:3000/api/v1";
const API_KEY = process.env.EXPO_PUBLIC_TOGGLEBOX_API_KEY; // Public key only - see security warning above
const PLATFORM = process.env.EXPO_PUBLIC_TOGGLEBOX_PLATFORM || "mobile";
const ENVIRONMENT = process.env.EXPO_PUBLIC_TOGGLEBOX_ENVIRONMENT || "staging";

export default function RootLayout() {
  return (
    <ToggleBoxProvider
      platform={PLATFORM}
      environment={ENVIRONMENT}
      apiUrl={API_URL}
      apiKey={API_KEY}
      pollingInterval={30000}
      persistToStorage={true}
      storageTTL={86400000}
    >
      {/* @ts-expect-error - expo-router Stack type compatibility with React 19 */}
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#0ea5e9",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "ToggleBox Examples",
          }}
        />
        <Stack.Screen
          name="examples"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ToggleBoxProvider>
  );
}

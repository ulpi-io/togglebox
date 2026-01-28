import { Stack } from "expo-router";

export default function QuickExamplesLayout() {
  return (
    // @ts-expect-error - expo-router Stack type compatibility with React 19
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0ea5e9" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="use-config" options={{ title: "Use Config" }} />
      <Stack.Screen name="use-flag" options={{ title: "Use Flag" }} />
      <Stack.Screen
        name="use-experiment"
        options={{ title: "Use Experiment" }}
      />
      <Stack.Screen name="track-event" options={{ title: "Track Event" }} />
    </Stack>
  );
}

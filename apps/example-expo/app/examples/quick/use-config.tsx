import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useConfig } from "@togglebox/sdk-expo";

export default function UseConfigScreen() {
  const { config, isLoading, error, refresh } = useConfig();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <TouchableOpacity style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const theme = (config?.theme as string) ?? "light";
  const apiTimeout = (config?.apiTimeout as number) ?? 5000;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Remote Config</Text>

      <View style={styles.card}>
        <Text style={styles.label}>theme</Text>
        <Text style={styles.value}>{theme}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>apiTimeout</Text>
        <Text style={styles.value}>{apiTimeout}ms</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={refresh}>
        <Text style={styles.buttonText}>Refresh Config</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  card: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  value: { fontSize: 18, fontWeight: "600", color: "#111827" },
  button: {
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  errorText: { color: "#dc2626", fontSize: 16, marginBottom: 16 },
});

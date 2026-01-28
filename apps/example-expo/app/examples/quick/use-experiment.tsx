import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useExperiments } from "@togglebox/sdk-expo";

export default function UseExperimentScreen() {
  const { experiments, getVariant, isLoading } = useExperiments();
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    getVariant("cta-test", { userId: "user-123" }).then(setVariant);
  }, [getVariant]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const buttonStyles: Record<string, { text: string; bg: string }> = {
    control: { text: "Get Started", bg: "#6b7280" },
    "variant-a": { text: "Start Free Trial", bg: "#3b82f6" },
    "variant-b": { text: "Try It Now!", bg: "#10b981" },
  };
  const btn = buttonStyles[variant ?? "control"] ?? buttonStyles.control;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>A/B Experiment</Text>

      <View style={styles.card}>
        <Text style={styles.label}>cta-test variant</Text>
        <Text style={styles.value}>{variant ?? "Not assigned"}</Text>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: btn.bg }]}>
        <Text style={styles.buttonText}>{btn.text}</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>
        All Experiments ({experiments.length})
      </Text>

      {experiments.map((exp) => (
        <View key={exp.experimentKey} style={styles.expRow}>
          <Text style={styles.expKey}>{exp.experimentKey}</Text>
          <Text style={styles.expStatus}>{exp.status}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  card: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  label: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  value: { fontSize: 20, fontWeight: "600", color: "#1d4ed8" },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 18 },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  expRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 8,
  },
  expKey: { fontSize: 14, fontFamily: "monospace", color: "#111827" },
  expStatus: { fontSize: 12, color: "#6b7280", textTransform: "uppercase" },
});

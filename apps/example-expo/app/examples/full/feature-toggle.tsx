import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useFlags } from "@togglebox/sdk-expo";

export default function FeatureToggleScreen() {
  const { isFlagEnabled, isLoading } = useFlags();
  const [showFeature, setShowFeature] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    isFlagEnabled("new-dashboard", { userId: "user-123" }).then((enabled) => {
      setShowFeature(enabled);
      setChecked(true);
    });
  }, [isLoading, isFlagEnabled]);

  if (isLoading || !checked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Checking feature flag...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feature Toggle</Text>

      {showFeature ? (
        <View style={styles.newFeatureCard}>
          <Text style={styles.featureEmoji}>✨</Text>
          <Text style={styles.newFeatureTitle}>New Dashboard</Text>
          <Text style={styles.newFeatureText}>
            This is the new feature-flagged dashboard with enhanced
            capabilities.
          </Text>
        </View>
      ) : (
        <View style={styles.oldFeatureCard}>
          <Text style={styles.featureEmoji}>📊</Text>
          <Text style={styles.oldFeatureTitle}>Classic Dashboard</Text>
          <Text style={styles.oldFeatureText}>
            This is the standard dashboard shown when the feature flag is
            disabled.
          </Text>
        </View>
      )}

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Flag Status</Text>
        <View
          style={[
            styles.badge,
            showFeature ? styles.badgeEnabled : styles.badgeDisabled,
          ]}
        >
          <Text
            style={[styles.badgeText, showFeature && styles.badgeTextEnabled]}
          >
            {showFeature ? "ENABLED" : "DISABLED"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  loadingText: { fontSize: 14, color: "#6b7280" },
  newFeatureCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  oldFeatureCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  featureEmoji: { fontSize: 32, marginBottom: 8 },
  newFeatureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#166534",
    marginBottom: 8,
  },
  oldFeatureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  newFeatureText: { fontSize: 14, color: "#15803d", lineHeight: 20 },
  oldFeatureText: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  statusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statusLabel: { fontSize: 14, fontWeight: "500", color: "#374151" },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  badgeEnabled: { backgroundColor: "#dcfce7" },
  badgeDisabled: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  badgeTextEnabled: { color: "#166534" },
});

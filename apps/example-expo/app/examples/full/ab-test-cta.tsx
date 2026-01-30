import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useExperiments, useAnalytics } from "@togglebox/sdk-expo";

export default function ABTestCTAScreen() {
  const { getVariant, isLoading } = useExperiments();
  const { trackConversion, flushStats } = useAnalytics();
  const [variant, setVariant] = useState<string | null>(null);
  const [clicks, setClicks] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const impressionSentRef = useRef(false);

  useEffect(() => {
    if (isLoading || impressionSentRef.current) return;
    getVariant("pricing-cta", { userId: "user-123" }).then((v) => {
      setVariant(v);
      if (!impressionSentRef.current) {
        impressionSentRef.current = true;
      }
    });
  }, [isLoading, getVariant]);

  const handleCTAClick = async () => {
    if (!variant) return;
    setClicks((c) => c + 1);
    await trackConversion(
      "pricing-cta",
      { userId: "user-123" },
      {
        metricId: "cta_click",
        value: 1,
      },
    );
    await flushStats();
    setLastAction(`Conversion tracked: cta_click (click #${clicks + 1})`);
  };

  if (isLoading || variant === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Assigning variant...</Text>
      </View>
    );
  }

  const buttons: Record<string, { text: string; bg: string }> = {
    control: { text: "Start Your Free Trial", bg: "#3b82f6" },
    urgent: { text: "🔥 Limited Time Offer!", bg: "#ef4444" },
    "social-proof": { text: "Join 10,000+ Happy Users", bg: "#10b981" },
  };
  const btn = buttons[variant] || buttons.control;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>A/B Test CTA</Text>

      <View style={styles.variantCard}>
        <Text style={styles.variantLabel}>Your assigned variant</Text>
        <Text style={styles.variantValue}>{variant}</Text>
      </View>

      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: btn.bg }]}
        onPress={handleCTAClick}
      >
        <Text style={styles.ctaButtonText}>{btn.text}</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <Text style={styles.statsLabel}>Clicks tracked</Text>
        <Text style={styles.statsValue}>{clicks}</Text>
      </View>

      {lastAction && (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>{lastAction}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  loadingText: { fontSize: 14, color: "#6b7280" },
  variantCard: {
    backgroundColor: "#eff6ff",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 16,
  },
  variantLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  variantValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1d4ed8",
    fontFamily: "monospace",
  },
  ctaButton: {
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  ctaButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  statsLabel: { fontSize: 14, color: "#6b7280" },
  statsValue: { fontSize: 18, fontWeight: "600", color: "#111827" },
  resultCard: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  resultText: { fontSize: 13, color: "#166534" },
});

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAnalytics } from "@togglebox/sdk-expo";

export default function TrackEventScreen() {
  const { trackEvent, trackConversion, flushStats } = useAnalytics();
  const [clicks, setClicks] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    trackEvent(
      "button_click",
      { userId: "user-123" },
      {
        properties: { buttonId: "demo-cta", clickNumber: clicks + 1 },
      },
    );
    setClicks((c) => c + 1);
    setLastAction("Event: button_click");
  };

  const handlePurchase = async () => {
    setLoading(true);
    await trackConversion(
      "checkout-test",
      { userId: "user-123" },
      {
        metricId: "purchase",
        value: 99.99,
      },
    );
    await flushStats();
    setLastAction("Conversion: purchase ($99.99)");
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Tracking</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track Custom Event</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleClick}>
          <Text style={styles.buttonText}>Click Me ({clicks})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track Conversion</Text>
        <TouchableOpacity
          style={styles.successButton}
          onPress={handlePurchase}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Purchase</Text>
          )}
        </TouchableOpacity>
      </View>

      {lastAction && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Last Action</Text>
          <Text style={styles.resultText}>{lastAction}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  card: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111827",
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  successButton: {
    backgroundColor: "#10b981",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  resultCard: {
    backgroundColor: "#f0fdf4",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  resultLabel: { fontSize: 11, color: "#6b7280", marginBottom: 2 },
  resultText: { fontSize: 14, fontWeight: "500", color: "#166534" },
});

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAnalytics } from "@togglebox/sdk-expo";

export default function TrackConversionScreen() {
  const { trackConversion, flushStats } = useAnalytics();
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <Text style={styles.title}>Conversion Tracking</Text>

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

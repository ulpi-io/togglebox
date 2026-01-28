import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useConfig } from "@togglebox/sdk-expo";

const defaultTheme = {
  primaryColor: "#3b82f6",
  secondaryColor: "#6b7280",
  accentColor: "#10b981",
  borderRadius: 8,
};

export default function ConfigThemeScreen() {
  const { config, refresh } = useConfig();

  const themeConfig = config?.theme as
    | Record<string, string | number>
    | undefined;
  const theme = useMemo(
    () => ({ ...defaultTheme, ...themeConfig }),
    [themeConfig],
  );

  const borderRadius =
    typeof theme.borderRadius === "number" ? theme.borderRadius : 8;

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: theme.primaryColor as string }]}>
        Themed Heading
      </Text>

      <Text style={[styles.text, { color: theme.secondaryColor as string }]}>
        This text uses the secondary color from remote config.
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.primaryColor as string, borderRadius },
          ]}
        >
          <Text style={styles.buttonText}>Primary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.accentColor as string, borderRadius },
          ]}
        >
          <Text style={styles.buttonText}>Accent</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Theme Values</Text>
        <ThemeRow
          label="primaryColor"
          value={theme.primaryColor as string}
          isColor
        />
        <ThemeRow
          label="secondaryColor"
          value={theme.secondaryColor as string}
          isColor
        />
        <ThemeRow
          label="accentColor"
          value={theme.accentColor as string}
          isColor
        />
        <ThemeRow label="borderRadius" value={`${borderRadius}px`} />
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
        <Text style={styles.refreshButtonText}>Refresh Config</Text>
      </TouchableOpacity>
    </View>
  );
}

function ThemeRow({
  label,
  value,
  isColor,
}: {
  label: string;
  value: string;
  isColor?: boolean;
}) {
  return (
    <View style={styles.themeRow}>
      <Text style={styles.themeLabel}>{label}</Text>
      <View style={styles.themeValueRow}>
        {isColor && (
          <View style={[styles.colorSwatch, { backgroundColor: value }]} />
        )}
        <Text style={styles.themeValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  button: { flex: 1, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  card: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    color: "#374151",
  },
  themeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  themeLabel: { fontSize: 13, fontFamily: "monospace", color: "#6b7280" },
  themeValueRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  themeValue: { fontSize: 13, fontFamily: "monospace", color: "#111827" },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  refreshButton: {
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  refreshButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});

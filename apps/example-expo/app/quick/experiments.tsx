/**
 * Experiments Example
 *
 * Shows how to list experiments and assign user to variants.
 * Copy this file and adapt to your app.
 */
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useExperiments, useToggleBox } from '@togglebox/sdk-expo'

export default function ExperimentsScreen() {
  const experiments = useExperiments()
  const { getVariant, isLoading } = useToggleBox()

  const userId = 'user-123' // Get from your auth system
  const [assignedVariant, setAssignedVariant] = useState<string | null>(null)

  // Assign user to experiment on mount
  useEffect(() => {
    getVariant('checkout-test', { userId }).then(setAssignedVariant)
  }, [userId, getVariant])

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Experiments</Text>

      {/* Show assigned variant */}
      <View style={styles.variantCard}>
        <Text style={styles.variantLabel}>Your Checkout Variant:</Text>
        <Text style={styles.variantValue}>{assignedVariant ?? 'Not assigned'}</Text>
      </View>

      {/* Render different UI based on variant */}
      {assignedVariant === 'new-checkout' ? (
        <TouchableOpacity style={styles.newButton}>
          <Text style={styles.buttonText}>One-Click Purchase</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.oldButton}>
          <Text style={styles.buttonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      )}

      {/* List all experiments */}
      <Text style={styles.subtitle}>All Experiments ({experiments.length})</Text>
      <FlatList
        data={experiments}
        keyExtractor={(item) => item.experimentKey}
        renderItem={({ item }) => (
          <View style={styles.experimentRow}>
            <View>
              <Text style={styles.experimentKey}>{item.experimentKey}</Text>
              <Text style={styles.experimentStatus}>{item.status}</Text>
            </View>
            <Text style={styles.variationCount}>{item.variations.length} variants</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No experiments</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  variantCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  variantLabel: {
    fontSize: 12,
    color: '#666',
  },
  variantValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  newButton: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  oldButton: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  experimentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  experimentKey: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  experimentStatus: {
    fontSize: 12,
    color: '#666',
  },
  variationCount: {
    fontSize: 12,
    color: '#999',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 24,
  },
})

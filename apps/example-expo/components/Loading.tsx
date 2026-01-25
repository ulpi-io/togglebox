import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Colors } from '@/lib/constants'

interface LoadingProps {
  size?: 'small' | 'large'
}

export function Loading({ size = 'large' }: LoadingProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Colors.primary[600]} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
})

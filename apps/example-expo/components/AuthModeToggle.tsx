import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '@/lib/constants'

export type AuthMode = 'public' | 'auth'

interface AuthModeToggleProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

export function AuthModeToggle({ mode, onModeChange }: AuthModeToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, mode === 'public' && styles.buttonActive]}
        onPress={() => onModeChange('public')}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>&#x1F513;</Text>
        <Text style={[styles.text, mode === 'public' && styles.textActive]}>Public</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, mode === 'auth' && styles.buttonActive]}
        onPress={() => onModeChange('auth')}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>&#x1F510;</Text>
        <Text style={[styles.text, mode === 'auth' && styles.textActive]}>Auth</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  buttonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emoji: {
    fontSize: 14,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[500],
  },
  textActive: {
    color: Colors.gray[900],
  },
})

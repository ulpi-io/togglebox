import { useState, useCallback } from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Colors } from '@/lib/constants'

interface CopyButtonProps {
  text: string
  size?: 'small' | 'medium'
}

export function CopyButton({ text, size = 'medium' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <TouchableOpacity
      style={[styles.button, size === 'small' && styles.buttonSmall]}
      onPress={handleCopy}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, size === 'small' && styles.textSmall]}>
        {copied ? 'Copied!' : 'Copy'}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.gray[700],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    color: Colors.gray[100],
    fontSize: 12,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
})

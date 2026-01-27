import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Colors } from '@/lib/constants'
import { CopyButton } from './CopyButton'

interface CodeBlockProps {
  code: string
  language?: string
  showCopy?: boolean
}

export function CodeBlock({ code, language = 'tsx', showCopy = true }: CodeBlockProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.language}>{language}</Text>
        {showCopy && <CopyButton text={code} size="small" />}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView style={styles.codeScroll} nestedScrollEnabled>
          <Text style={styles.code}>{code.trim()}</Text>
        </ScrollView>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.gray[900],
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[700],
  },
  language: {
    color: Colors.gray[400],
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  codeScroll: {
    padding: 12,
    maxHeight: 300,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray[100],
  },
})

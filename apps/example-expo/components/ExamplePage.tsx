import { useState, ReactNode } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Colors } from '@/lib/constants'
import { AuthModeToggle, AuthMode } from './AuthModeToggle'
import { CodeBlock } from './CodeBlock'

interface ExamplePageProps {
  title: string
  description: string
  publicCode: string
  authCode: string
  keyPoints: string[]
  children: ReactNode | ((mode: AuthMode) => ReactNode)
  language?: string
}

export function ExamplePage({
  title,
  description,
  publicCode,
  authCode,
  keyPoints,
  children,
  language = 'tsx',
}: ExamplePageProps) {
  const [mode, setMode] = useState<AuthMode>('public')

  const currentCode = mode === 'public' ? publicCode : authCode
  const demo = typeof children === 'function' ? children(mode) : children

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Auth Mode Toggle */}
      <View style={styles.toggleContainer}>
        <AuthModeToggle mode={mode} onModeChange={setMode} />
      </View>

      {/* Live Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Demo</Text>
        <View style={styles.demoCard}>{demo}</View>
      </View>

      {/* Code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Code</Text>
        <CodeBlock code={currentCode} language={language} />
      </View>

      {/* Key Points */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Points</Text>
        <View style={styles.keyPointsCard}>
          {keyPoints.map((point, index) => (
            <View key={index} style={styles.keyPoint}>
              <Text style={styles.bullet}>&#x2022;</Text>
              <Text style={styles.keyPointText}>{point}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.gray[600],
    lineHeight: 22,
  },
  toggleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 12,
  },
  demoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  keyPointsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    gap: 12,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    color: Colors.primary[600],
    lineHeight: 22,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray[700],
    lineHeight: 22,
  },
})

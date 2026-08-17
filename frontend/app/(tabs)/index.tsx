import { useState } from 'react';
import { API_URL } from '../../config';
import { colors, spacing, radius } from '../../app-colors';
import { AppButton } from '../../components/AppButton';
import { StyleSheet, TextInput, ScrollView, ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [topic, setTopic] = useState('');
  const [folder, setFolder] = useState('');
  const [language, setLanguage] = useState('english');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLearn() {
    if (!topic.trim() || !folder.trim()) {
      setExplanation('Please enter both a topic and a folder name.');
      return;
    }
    setLoading(true);
    setExplanation('');
    try {
      const response = await fetch(`${API_URL}/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, folder, language }),
      });
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (error) {
      console.log('Error:', error);
      setExplanation('Something went wrong. Check backend is running.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTopic('');
    setExplanation('');
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.eyebrow}>SECOND BRAIN</Text>
          <Text style={styles.title}>Learn something new</Text>

          <TextInput
            style={styles.input}
            placeholder="Topic — e.g. decorators"
            placeholderTextColor={colors.textMuted}
            value={topic}
            onChangeText={setTopic}
          />

          <TextInput
            style={styles.input}
            placeholder="Folder — e.g. Python, DSA"
            placeholderTextColor={colors.textMuted}
            value={folder}
            onChangeText={setFolder}
          />

          <View style={styles.langRow}>
            <AppButton
              title="English"
              variant={language === 'english' ? 'primary' : 'outline'}
              onPress={() => setLanguage('english')}
              style={styles.langButton}
            />
            <AppButton
              title="മലയാളം"
              variant={language === 'ml' ? 'primary' : 'outline'}
              onPress={() => setLanguage('ml')}
              style={styles.langButton}
            />
          </View>

          <AppButton title="Learn" onPress={handleLearn} disabled={loading} />

          {loading && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />}

          {explanation !== '' && !loading && (
            <View style={styles.resultCard}>
              <Text style={styles.folderTag}>{folder || 'Note'}</Text>
              <Text style={styles.explanationText}>{explanation}</Text>
              <AppButton title="Learn another topic" onPress={handleReset} variant="outline" style={styles.resetButton} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  langButton: { flex: 1 },
  loader: { marginTop: spacing.md },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  folderTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tag,
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    textTransform: 'uppercase',
  },
  explanationText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  resetButton: { marginTop: spacing.sm },
});
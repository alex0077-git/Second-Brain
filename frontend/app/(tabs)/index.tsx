import { useState } from 'react';
import { API_URL } from '../config';
import { StyleSheet, TextInput, Button, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Learn</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Topic (e.g. decorators)"
          value={topic}
          onChangeText={setTopic}
        />

        <TextInput
          style={styles.input}
          placeholder="Folder (e.g. Python, DSA)"
          value={folder}
          onChangeText={setFolder}
        />

        <ThemedView style={styles.langRow}>
          <Button
            title="English"
            color={language === 'english' ? 'blue' : 'gray'}
            onPress={() => setLanguage('english')}
          />
          <Button
            title="മലയാളം"
            color={language === 'ml' ? 'blue' : 'gray'}
            onPress={() => setLanguage('ml')}
          />
        </ThemedView>

        <Button title="Learn" onPress={handleLearn} disabled={loading} />

        {loading && <ActivityIndicator size="large" />}

        {explanation !== '' && !loading && (
          <ThemedView style={styles.resultBox}>
            <ScrollView style={styles.scroll}>
              <ThemedText>{explanation}</ThemedText>
            </ScrollView>
            <Button title="Learn another topic" onPress={handleReset} />
            <ThemedText type="small">
              Saved to "{folder}". Go to the Revise tab anytime to review it.
            </ThemedText>
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 20, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  langRow: { flexDirection: 'row', gap: 8 },
  resultBox: { flex: 1, gap: 8 },
  scroll: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12 },
});
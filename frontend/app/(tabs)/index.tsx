import { useState } from 'react';
import { StyleSheet, TextInput, Button, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('english');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLearn() {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language }),
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Second Brain</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Enter a topic (e.g. decorators)"
          value={topic}
          onChangeText={setTopic}
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

        <ScrollView>
          <ThemedText>{explanation}</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 20, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  langRow: { flexDirection: 'row', gap: 8 },
});
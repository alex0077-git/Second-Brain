import { useState } from 'react';
import { API_URL } from '../../config';
import { StyleSheet, Button, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type TopicItem = { topic: string; folder: string; summary: string };
type QuizItem = { topic: string; question: string; answer: string };
type Stage = 'menu' | 'folderPick' | 'list' | 'quiz';

export default function ReviseScreen() {
  const [stage, setStage] = useState<Stage>('menu');
  const [items, setItems] = useState<TopicItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  async function loadToday() {
    setLoading(true);
    const res = await fetch(`${API_URL}/review/today`);
    const data = await res.json();
    setItems(data.topics);
    setStage('list');
    setLoading(false);
  }

  async function loadFolders() {
    setLoading(true);
    const res = await fetch(`${API_URL}/folders`);
    const data = await res.json();
    setFolders(data.folders);
    setStage('folderPick');
    setLoading(false);
  }

  async function loadFolderTopics(folder: string) {
    setLoading(true);
    const res = await fetch(`${API_URL}/review/folder/${encodeURIComponent(folder)}`);
    const data = await res.json();
    setItems(data.topics);
    setStage('list');
    setLoading(false);
  }

  async function startSelfTest() {
    if (items.length === 0) return;
    setLoading(true);
    const topics = items.map((i) => i.topic);
    const res = await fetch(`${API_URL}/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics, language: 'english' }),
    });
    const data = await res.json();
    setQuiz(data.quiz);
    setQuizIndex(0);
    setUserAnswer('');
    setShowAnswer(false);
    setStage('quiz');
    setLoading(false);
  }

  async function submitReview(topic: string, result: 'easy' | 'hard') {
    await fetch(`${API_URL}/review/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, result }),
    });
    goToNextQuizItem();
  }

  function goToNextQuizItem() {
    if (quizIndex + 1 < quiz.length) {
      setQuizIndex(quizIndex + 1);
      setUserAnswer('');
      setShowAnswer(false);
    } else {
      backToMenu();
    }
  }

  function backToMenu() {
    setStage('menu');
    setItems([]);
    setQuiz([]);
    setQuizIndex(0);
  }

  if (stage === 'menu') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText type="title">Revise</ThemedText>
            <ThemedView style={styles.menuButton}>
              <Button title="What I learned today" onPress={loadToday} disabled={loading} />
            </ThemedView>
            <ThemedView style={styles.menuButton}>
              <Button title="Revise by folder" onPress={loadFolders} disabled={loading} />
            </ThemedView>
            {loading && <ActivityIndicator size="large" />}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (stage === 'folderPick') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Button title="← Back" onPress={backToMenu} />
            <ThemedText type="title">Select a folder</ThemedText>
            {folders.length === 0 && <ThemedText>No folders yet. Learn something first!</ThemedText>}
            {folders.map((f) => (
              <ThemedView key={f} style={styles.card}>
                <Button title={f} onPress={() => loadFolderTopics(f)} />
              </ThemedView>
            ))}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (stage === 'list') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Button title="← Back" onPress={backToMenu} />
            <ThemedText type="title">Topics</ThemedText>

            {items.length === 0 && <ThemedText>Nothing here yet.</ThemedText>}

            {items.map((item) => (
              <ThemedView key={item.topic} style={styles.card}>
                <ThemedText type="defaultSemiBold">{item.topic}</ThemedText>
                <ThemedText type="small">{item.folder}</ThemedText>
                <ThemedText>{item.summary}</ThemedText>
              </ThemedView>
            ))}

            {items.length > 0 && (
              <Button title="Start Self-Test" onPress={startSelfTest} disabled={loading} />
            )}
            {loading && <ActivityIndicator size="large" />}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (stage === 'quiz' && quiz.length > 0) {
    const current = quiz[quizIndex];
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Button title="← Exit Test" onPress={backToMenu} />
            <ThemedText type="small">
              Question {quizIndex + 1} of {quiz.length} — {current.topic}
            </ThemedText>
            <ThemedText type="defaultSemiBold">{current.question}</ThemedText>

            <TextInput
              style={styles.answerInput}
              placeholder="Type your answer here..."
              placeholderTextColor="#888"
              value={userAnswer}
              onChangeText={setUserAnswer}
              multiline
            />

            {!showAnswer && (
              <Button title="Show Model Answer" onPress={() => setShowAnswer(true)} />
            )}

            {showAnswer && (
              <ThemedView style={styles.card}>
                <ThemedText type="defaultSemiBold">Model Answer:</ThemedText>
                <ThemedText>{current.answer}</ThemedText>
                <ThemedView style={styles.buttonRow}>
                  <Button title="Hard" color="red" onPress={() => submitReview(current.topic, 'hard')} />
                  <Button title="Easy" color="green" onPress={() => submitReview(current.topic, 'easy')} />
                </ThemedView>
              </ThemedView>
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, gap: 12, paddingBottom: 60 },
  menuButton: { marginBottom: 8 },
  card: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, gap: 8, marginBottom: 8 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    color: '#000',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
});
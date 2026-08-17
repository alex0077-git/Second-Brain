import { useState } from 'react';
import { API_URL } from '../../config';
import { colors, spacing, radius } from '../../app-colors';
import { AppButton } from '../../components/AppButton';
import { StyleSheet, ScrollView, ActivityIndicator, View, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.eyebrow}>REVISE</Text>
            <Text style={styles.title}>What do you want to revise?</Text>

            <AppButton title="What I learned today" onPress={loadToday} disabled={loading} style={styles.menuButton} />
            <AppButton title="Revise by folder" onPress={loadFolders} disabled={loading} variant="outline" style={styles.menuButton} />

            {loading && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (stage === 'folderPick') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <AppButton title="← Back" onPress={backToMenu} variant="outline" style={styles.backButton} />
            <Text style={styles.title}>Select a folder</Text>

            {folders.length === 0 && <Text style={styles.emptyText}>No folders yet. Learn something first!</Text>}

            {folders.map((f) => (
              <View key={f} style={styles.folderCard}>
                <Text style={styles.folderCardText}>{f}</Text>
                <AppButton title="Open" onPress={() => loadFolderTopics(f)} style={styles.folderOpenButton} />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (stage === 'list') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <AppButton title="← Back" onPress={backToMenu} variant="outline" style={styles.backButton} />
            <Text style={styles.title}>Topics</Text>

            {items.length === 0 && <Text style={styles.emptyText}>Nothing here yet.</Text>}

            {items.map((item) => (
              <View key={item.topic} style={styles.card}>
                <Text style={styles.folderTag}>{item.folder}</Text>
                <Text style={styles.cardTitle}>{item.topic}</Text>
                <Text style={styles.cardSummary}>{item.summary}</Text>
              </View>
            ))}

            {items.length > 0 && (
              <AppButton title="Start Self-Test" onPress={startSelfTest} disabled={loading} style={styles.testButton} />
            )}
            {loading && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (stage === 'quiz' && quiz.length > 0) {
    const current = quiz[quizIndex];
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <AppButton title="← Exit Test" onPress={backToMenu} variant="outline" style={styles.backButton} />
            <Text style={styles.progressText}>
              Question {quizIndex + 1} of {quiz.length} — {current.topic}
            </Text>
            <Text style={styles.questionText}>{current.question}</Text>

            <TextInput
              style={styles.answerInput}
              placeholder="Type your answer here..."
              placeholderTextColor={colors.textMuted}
              value={userAnswer}
              onChangeText={setUserAnswer}
              multiline
            />

            {!showAnswer && (
              <AppButton title="Show Model Answer" onPress={() => setShowAnswer(true)} />
            )}

            {showAnswer && (
              <View style={styles.card}>
                <Text style={styles.folderTag}>Model Answer</Text>
                <Text style={styles.cardSummary}>{current.answer}</Text>
                <View style={styles.buttonRow}>
                  <AppButton title="Hard" variant="hard" onPress={() => submitReview(current.topic, 'hard')} style={styles.halfButton} />
                  <AppButton title="Easy" variant="easy" onPress={() => submitReview(current.topic, 'easy')} style={styles.halfButton} />
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: spacing.sm },
  menuButton: { marginBottom: spacing.sm },
  backButton: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  loader: { marginTop: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  folderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  folderCardText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  folderOpenButton: { paddingHorizontal: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  folderTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tag,
    color: colors.accentText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    textTransform: 'uppercase',
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardSummary: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  testButton: { marginTop: spacing.sm },
  progressText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  questionText: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 25, marginBottom: spacing.sm },
  answerInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 100,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  halfButton: { flex: 1 },
});
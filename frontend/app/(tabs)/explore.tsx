import { useState } from 'react';
import { API_URL } from '../config';
import { StyleSheet, Button, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type TopicItem = { topic: string; folder: string; next_review_date?: string };
type Stage = 'menu' | 'folderPick' | 'list' | 'detail';

export default function ReviseScreen() {
  const [stage, setStage] = useState<Stage>('menu');
  const [items, setItems] = useState<TopicItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [detail, setDetail] = useState<{ topic: string; explanation: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadToday() {
    setLoading(true);
    const res = await fetch(`${API_URL}/review/today`);
    const data = await res.json();
    setItems(data.topics);
    setStage('list');
    setLoading(false);
  }

  async function loadAll() {
    setLoading(true);
    const res = await fetch(`${API_URL}/review/all`);
    const data = await res.json();
    setItems(data.topics);
    setStage('list');
    setLoading(false);
  }

  async function loadDue() {
    setLoading(true);
    const res = await fetch(`${API_URL}/review/due`);
    const data = await res.json();
    setItems(data.due_topics);
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

  async function openTopic(topic: string) {
    setLoading(true);
    const res = await fetch(`${API_URL}/topics/${encodeURIComponent(topic)}`);
    const data = await res.json();
    setDetail({ topic: data.topic, explanation: data.explanation });
    setStage('detail');
    setLoading(false);
  }

  async function submitReview(topic: string, result: 'easy' | 'hard') {
    await fetch(`${API_URL}/review/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, result }),
    });
    setStage('menu');
  }

  function backToMenu() {
    setStage('menu');
    setItems([]);
    setDetail(null);
  }

  if (stage === 'menu') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title">Revise</ThemedText>
          <Button title="Due for review" onPress={loadDue} disabled={loading} />
          <Button title="What I learned today" onPress={loadToday} disabled={loading} />
          <Button title="All topics" onPress={loadAll} disabled={loading} />
          <Button title="Browse by folder" onPress={loadFolders} disabled={loading} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (stage === 'folderPick') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Button title="← Back" onPress={backToMenu} />
          <ThemedText type="title">Select a folder</ThemedText>
          <ScrollView>
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
          <Button title="← Back" onPress={backToMenu} />
          <ThemedText type="title">Topics</ThemedText>
          <ScrollView>
            {items.length === 0 && <ThemedText>Nothing here yet.</ThemedText>}
            {items.map((item) => (
              <ThemedView key={item.topic} style={styles.card}>
                <ThemedText type="defaultSemiBold">{item.topic}</ThemedText>
                <ThemedText type="small">{item.folder}</ThemedText>
                <Button title="Open" onPress={() => openTopic(item.topic)} />
              </ThemedView>
            ))}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (stage === 'detail' && detail) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Button title="← Back to list" onPress={() => setStage('list')} />
          <ThemedText type="title">{detail.topic}</ThemedText>
          <ScrollView style={styles.scroll}>
            <ThemedText>{detail.explanation}</ThemedText>
          </ScrollView>
          <ThemedView style={styles.buttonRow}>
            <Button title="Hard" color="red" onPress={() => submitReview(detail.topic, 'hard')} />
            <Button title="Easy" color="green" onPress={() => submitReview(detail.topic, 'easy')} />
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 20, gap: 12 },
  card: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, gap: 8, marginBottom: 8 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  scroll: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12 },
});
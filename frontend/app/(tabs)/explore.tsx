import { useState, useEffect } from 'react';
import { StyleSheet, Button, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type DueTopic = {
  topic: string;
  next_review_date: string;
  interval_days: number;
};

export default function ReviewScreen() {
  const [dueTopics, setDueTopics] = useState<DueTopic[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchDueTopics() {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/review/due');
      const data = await response.json();
      setDueTopics(data.due_topics);
    } catch (error) {
      console.log('Error fetching due topics:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDueTopics();
  }, []);

  async function submitReview(topic: string, result: 'easy' | 'hard') {
    try {
      await fetch('http://localhost:8000/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, result }),
      });
      fetchDueTopics();
    } catch (error) {
      console.log('Error submitting review:', error);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Review</ThemedText>

        <Button title="Refresh" onPress={fetchDueTopics} disabled={loading} />

        <ScrollView>
          {dueTopics.length === 0 && (
            <ThemedText>No topics due for review right now.</ThemedText>
          )}

          {dueTopics.map((item) => (
            <ThemedView key={item.topic} style={styles.card}>
              <ThemedText type="defaultSemiBold">{item.topic}</ThemedText>
              <ThemedText type="small">Due: {item.next_review_date}</ThemedText>

              <ThemedView style={styles.buttonRow}>
                <Button title="Hard" color="red" onPress={() => submitReview(item.topic, 'hard')} />
                <Button title="Easy" color="green" onPress={() => submitReview(item.topic, 'easy')} />
              </ThemedView>
            </ThemedView>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 20, gap: 12 },
  card: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, gap: 8, marginBottom: 8 },
  buttonRow: { flexDirection: 'row', gap: 8 },
});
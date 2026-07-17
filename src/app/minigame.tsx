import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GameScreen() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const intervalRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (gameState === 'playing') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setGameState('ended');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [gameState]);

  function handleStart() {
    setScore(0);
    setTimeLeft(10);
    setGameState('playing');
  }

  function handleFlush() {
    if (gameState !== 'playing') return;
    setScore((prev) => prev + 1);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }

  function handleEnd() {
    setHighScore((prev) => (score > prev ? score : prev));
  }

  useEffect(() => {
    if (gameState === 'ended') {
      handleEnd();
    }
  }, [gameState]);

  function handleRestart() {
    setGameState('idle');
  }

  const timerColor = timeLeft <= 3 ? '#dc2626' : '#1a56db';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>🚽 Flush Frenzy</Text>
      <Text style={styles.subtitle}>Tap the toilet as many times as you can in 10 seconds!</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{score}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: timerColor }]}>{timeLeft}s</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{highScore}</Text>
          <Text style={styles.statLabel}>Best</Text>
        </View>
      </View>

      {gameState === 'idle' && (
        <View style={styles.centerContent}>
          <Text style={styles.idleEmoji}>🚽</Text>
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>Start Flushing!</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState === 'playing' && (
        <View style={styles.centerContent}>
          <TouchableOpacity onPress={handleFlush} activeOpacity={0.8}>
            <Animated.Text style={[styles.flushEmoji, { transform: [{ scale: scaleAnim }] }]}>
              🚽
            </Animated.Text>
          </TouchableOpacity>
          <Text style={styles.tapHint}>Tap the toilet!</Text>
        </View>
      )}

      {gameState === 'ended' && (
        <View style={styles.centerContent}>
          <Text style={styles.endEmoji}>🎉</Text>
          <Text style={styles.endTitle}>Time's up!</Text>
          <Text style={styles.endScore}>You flushed {score} times!</Text>
          {score >= highScore && score > 0 && (
            <Text style={styles.newHighScore}>🏆 New High Score!</Text>
          )}
          <TouchableOpacity style={styles.startButton} onPress={handleRestart}>
            <Text style={styles.startButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#1a56db' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  idleEmoji: { fontSize: 100 },
  flushEmoji: { fontSize: 120 },
  tapHint: { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  startButton: { backgroundColor: '#1a56db', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, shadowColor: '#1a56db', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  startButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
  endEmoji: { fontSize: 80 },
  endTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  endScore: { fontSize: 18, color: '#6b7280', fontWeight: '600' },
  newHighScore: { fontSize: 18, color: '#f59e0b', fontWeight: '800' },
});
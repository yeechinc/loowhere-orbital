import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../supabaseConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FallingItem {
  id: number;
  x: number;
  type: 'toilet' | 'poo';
  anim: Animated.Value;
}

interface LeaderboardEntry {
  display_name: string;
  score: number;
}

async function awardPoints(userId: string, points: number) {
  const { data: existing } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (existing) {
    await supabase.from('user_points').update({ points: existing.points + points, updated_at: new Date().toISOString() }).eq('user_id', userId);
  } else {
    await supabase.from('user_points').insert({ user_id: userId, points });
  }
}

export default function GameScreen() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [endReason, setEndReason] = useState<'time' | 'poo'>('time');
  const [items, setItems] = useState<FallingItem[]>([]);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pointsEarned, setPointsEarned] = useState(0);
  const intervalRef = useRef<any>(null);
  const pooSpawnRef = useRef<any>(null);
  const itemIdRef = useRef(0);
  const animationsRef = useRef<{ [key: number]: Animated.CompositeAnimation }>({});
  const gameStateRef = useRef<'idle' | 'playing' | 'ended'>('idle');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    loadHighScore();
  }, []);

  useEffect(() => {
    if (gameState === 'ended') {
      saveHighScore(score);
      submitScoreToLeaderboard(score);
      handleAwardGamePoints(score);
    }
  }, [gameState]);

  async function loadHighScore() {
    const stored = await AsyncStorage.getItem('flushFrenzyHighScore');
    const lastReset = await AsyncStorage.getItem('flushFrenzyLastReset');
    const today = new Date().toDateString();
    if (lastReset !== today) {
      await AsyncStorage.setItem('flushFrenzyHighScore', '0');
      await AsyncStorage.setItem('flushFrenzyLastReset', today);
      setHighScore(0);
    } else if (stored) {
      setHighScore(parseInt(stored));
    }
  }

  async function saveHighScore(newScore: number) {
    const current = await AsyncStorage.getItem('flushFrenzyHighScore');
    const currentScore = current ? parseInt(current) : 0;
    if (newScore > currentScore) {
      await AsyncStorage.setItem('flushFrenzyHighScore', newScore.toString());
      setHighScore(newScore);
    }
  }

  async function handleAwardGamePoints(newScore: number) {
    if (newScore === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const pts = Math.floor(newScore / 10);
    if (pts > 0) {
      await awardPoints(user.id, pts);
      setPointsEarned(pts);
    }
  }

  async function submitScoreToLeaderboard(newScore: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toDateString();
    const displayName = user.user_metadata?.display_name ?? user.user_metadata?.username ?? 'Anonymous';

    const { data: existing } = await supabase
      .from('game_scores')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (existing) {
      if (newScore > existing.score) {
        await supabase.from('game_scores').update({ score: newScore }).eq('id', existing.id);
      }
    } else {
      await supabase.from('game_scores').insert({
        user_id: user.id,
        display_name: displayName,
        score: newScore,
        date: today,
      });
    }
  }

  async function fetchLeaderboard() {
    const today = new Date().toDateString();
    const { data } = await supabase
      .from('game_scores')
      .select('display_name, score')
      .eq('date', today)
      .order('score', { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  }

  function spawnItem(isPoo: boolean) {
    if (gameStateRef.current !== 'playing') return;

    const id = itemIdRef.current++;
    const x = Math.random() * (SCREEN_WIDTH - 60);
    const anim = new Animated.Value(-80);
    const duration = isPoo ? 1600 : 2600;

    const newItem: FallingItem = { id, x, type: isPoo ? 'poo' : 'toilet', anim };
    setItems((prev) => [...prev, newItem]);

    const animation = Animated.timing(anim, {
      toValue: SCREEN_HEIGHT,
      duration,
      useNativeDriver: true,
    });

    animationsRef.current[id] = animation;

    animation.start(({ finished }) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      delete animationsRef.current[id];
      if (finished && gameStateRef.current === 'playing' && !isPoo) {
        spawnItem(false);
      }
    });
  }

  function endGame(reason: 'time' | 'poo') {
    clearInterval(intervalRef.current);
    clearInterval(pooSpawnRef.current);
    Object.values(animationsRef.current).forEach((anim) => anim.stop());
    animationsRef.current = {};
    setEndReason(reason);
    setGameState('ended');
    setItems([]);
  }

  function handleTap(item: FallingItem) {
    if (gameStateRef.current !== 'playing') return;

    if (item.type === 'poo') {
      endGame('poo');
      return;
    }

    animationsRef.current[item.id]?.stop();
    delete animationsRef.current[item.id];
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setScore((prev) => prev + 1);
    spawnItem(false);
  }

  function handleStart() {
    setScore(0);
    setTimeLeft(20);
    setItems([]);
    setPointsEarned(0);
    itemIdRef.current = 0;
    animationsRef.current = {};
    gameStateRef.current = 'playing';
    setGameState('playing');

    for (let i = 0; i < 10; i++) {
      setTimeout(() => spawnItem(false), i * 200);
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame('time');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pooSpawnRef.current = setInterval(() => {
      if (gameStateRef.current === 'playing') {
        spawnItem(true);
      }
    }, 1500);
  }

  function handleRestart() {
    setGameState('idle');
  }

  const timerColor = timeLeft <= 5 ? '#dc2626' : '#1a56db';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🚽 Flush Frenzy</Text>
        <TouchableOpacity
          style={styles.leaderboardBtn}
          onPress={() => { fetchLeaderboard(); setLeaderboardVisible(true); }}
        >
          <Text style={styles.leaderboardBtnText}>🏆</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Tap toilets, avoid the poo!</Text>

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
          <Text style={styles.idleHint}>Tap 🚽 to score{'\n'}Avoid 💩 or it's game over!{'\n'}Every 10 flushes = 1 pt 🎯</Text>
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>Start Flushing!</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState === 'playing' && (
        <View style={styles.gameArea}>
          {items.map((item) => (
            <Animated.View
              key={item.id}
              style={[
                styles.fallingItem,
                { left: item.x, transform: [{ translateY: item.anim }] },
              ]}
            >
              <TouchableOpacity onPress={() => handleTap(item)} activeOpacity={0.7}>
                <Text style={item.type === 'poo' ? styles.pooEmoji : styles.itemEmoji}>
                  {item.type === 'toilet' ? '🚽' : '💩'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}

      {gameState === 'ended' && (
        <View style={styles.centerContent}>
          <Text style={styles.endEmoji}>{endReason === 'poo' ? '💩' : '🎉'}</Text>
          <Text style={styles.endTitle}>
            {endReason === 'poo' ? 'Awww mannn you just got pooed!!!' : "Time's up!"}
          </Text>
          <Text style={styles.endScore}>You flushed {score} times!</Text>
          {pointsEarned > 0 && (
            <Text style={styles.pointsEarned}>+{pointsEarned} pts earned! 🎯</Text>
          )}
          {score >= highScore && score > 0 && (
            <Text style={styles.newHighScore}>🏆 New High Score!</Text>
          )}
          <TouchableOpacity style={styles.startButton} onPress={handleRestart}>
            <Text style={styles.startButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={leaderboardVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLeaderboardVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏆 Today's Leaderboard</Text>
            <TouchableOpacity onPress={() => setLeaderboardVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Resets daily at midnight</Text>
          <ScrollView>
            {leaderboard.length === 0 ? (
              <View style={styles.emptyLeaderboard}>
                <Text style={styles.emptyIcon}>🚽</Text>
                <Text style={styles.emptyText}>No scores yet today!</Text>
                <Text style={styles.emptySubtext}>Be the first to play!</Text>
              </View>
            ) : (
              leaderboard.map((entry, index) => (
                <View key={index} style={styles.leaderboardRow}>
                  <Text style={styles.rank}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </Text>
                  <Text style={styles.playerName}>{entry.display_name}</Text>
                  <Text style={styles.playerScore}>{entry.score} flushes</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e0f2fe', paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  leaderboardBtn: { backgroundColor: 'white', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
  leaderboardBtnText: { fontSize: 24 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#1a56db' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  idleEmoji: { fontSize: 100 },
  idleHint: { fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 24, fontWeight: '600' },
  startButton: { backgroundColor: '#1a56db', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, shadowColor: '#1a56db', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  startButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
  gameArea: { flex: 1, position: 'relative' },
  fallingItem: { position: 'absolute', top: 0 },
  itemEmoji: { fontSize: 50 },
  pooEmoji: { fontSize: 70 },
  endEmoji: { fontSize: 80 },
  endTitle: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center' },
  endScore: { fontSize: 18, color: '#6b7280', fontWeight: '600' },
  pointsEarned: { fontSize: 18, color: '#1a56db', fontWeight: '800' },
  newHighScore: { fontSize: 18, color: '#f59e0b', fontWeight: '800' },
  modalContainer: { flex: 1, backgroundColor: '#f0f4f8', paddingHorizontal: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  modalClose: { fontSize: 18, color: '#6b7280' },
  modalSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  emptyLeaderboard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySubtext: { fontSize: 13, color: '#9ca3af' },
  leaderboardRow: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  rank: { fontSize: 20, marginRight: 12, width: 36 },
  playerName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  playerScore: { fontSize: 14, color: '#1a56db', fontWeight: '700' },
});
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../supabaseConfig";

type GameState = "idle" | "playing" | "ended";

export default function GamesScreen() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUser();
    fetchLeaderboard();
  }, []);

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  // gets the top 10 high scores to display on the leaderboard
  async function fetchLeaderboard() {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .order("high_score", { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  }

  // saves the player's score if it beats their previous high score, or creates a new entry
  async function saveScore(finalScore: number) {
    if (!currentUser) return;
    const displayName = currentUser.user_metadata?.display_name ?? "LooSeeker";

    const { data: existing } = await supabase
      .from("leaderboard")
      .select("*")
      .eq("user_id", currentUser.id)
      .single();

    if (existing) {
      // only overwrite if this run beat their previous best
      if (finalScore > existing.high_score) {
        await supabase
          .from("leaderboard")
          .update({ high_score: finalScore, display_name: displayName })
          .eq("user_id", currentUser.id);
      }
    } else {
      await supabase.from("leaderboard").insert({
        user_id: currentUser.id,
        display_name: displayName,
        high_score: finalScore,
      });
    }
    fetchLeaderboard();
  }

  // resets score/timer and kicks off a 10-second countdown
  function startGame() {
    setScore(0);
    setTimeLeft(10);
    setGameState("playing");
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        // countdown hit zero, so end the game
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameState("ended");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // registers a tap during gameplay and plays a animation
  function handleFlush() {
    if (gameState !== "playing") return;
    setScore((prev) => {
      const newScore = prev + 1;
      if (newScore > highScore) setHighScore(newScore);
      return newScore;
    });
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  }

  // whenever the game ends, posts final score to the leaderboard
  useEffect(() => {
    if (gameState === "ended") {
      saveScore(score);
    }
  }, [gameState]);

  // maps a score to a fun rank title and color
  const getRank = (score: number) => {
    if (score >= 50) return { label: "🏆 Flush Master", color: "#f59e0b" };
    if (score >= 35) return { label: "💪 Power Flusher", color: "#3b82f6" };
    if (score >= 20) return { label: "🚿 Bidet Buddy", color: "#10b981" };
    return { label: "🐢 Slow Flusher", color: "#9ca3af" };
  };

  const rank = getRank(score);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>🎮 Games</Text>
        <TouchableOpacity
          style={styles.leaderboardBtn}
          onPress={() => setShowLeaderboard(!showLeaderboard)}
        >
          <Text style={styles.leaderboardBtnText}>
            {showLeaderboard ? "🎮 Play" : "🏆 Board"}
          </Text>
        </TouchableOpacity>
      </View>

      {showLeaderboard ? (
        /* Leaderboard */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>🏆 Leaderboard</Text>
          <Text style={styles.sectionSubtitle}>Top 10 Flush Masters</Text>
          {leaderboard.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🚽</Text>
              <Text style={styles.emptyText}>No scores yet!</Text>
              <Text style={styles.emptySubtext}>Be the first to play and set a score.</Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => (
              <View
                key={entry.user_id}
                style={[
                  styles.leaderboardCard,
                  entry.user_id === currentUser?.id && styles.leaderboardCardMe,
                ]}
              >
                <Text style={styles.rank}>
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                </Text>
                <Text style={styles.leaderName}>{entry.display_name}</Text>
                <Text style={styles.leaderScore}>{entry.high_score} 💧</Text>
              </View>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      ) : (
        /* Game */
        <View style={styles.gameContainer}>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Best</Text>
              <Text style={styles.statValue}>💧 {highScore}</Text>
            </View>
            <View style={[styles.statBox, styles.timerBox, timeLeft <= 3 && styles.timerBoxRed]}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={[styles.statValue, timeLeft <= 3 && styles.timerRed]}>
                {timeLeft}s
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>💧 {score}</Text>
            </View>
          </View>

          {/* Game area */}
          {gameState === "idle" && (
            <View style={styles.centerArea}>
              <Text style={styles.gameTitle}>Flush Clicker</Text>
              <Text style={styles.gameSubtitle}>
                Tap the toilet as fast as you can!{"\n"}You have 10 seconds. Go!!
              </Text>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity style={styles.flushButton} onPress={startGame}>
                  <Text style={styles.flushEmoji}>🚽</Text>
                  <Text style={styles.flushButtonText}>Tap to Start!</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {gameState === "playing" && (
            <View style={styles.centerArea}>
              <Text style={styles.playingLabel}>FLUSH IT! 💧</Text>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={styles.flushButton}
                  onPress={handleFlush}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flushEmoji}>🚽</Text>
                  <Text style={styles.scoreDisplay}>{score}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {gameState === "ended" && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.centerArea}>
                <Text style={styles.gameOverTitle}>Time's Up! 🎉</Text>
                <View style={styles.resultCard}>
                  <Text style={styles.resultScore}>{score}</Text>
                  <Text style={styles.resultLabel}>flushes</Text>
                  <Text style={[styles.rankLabel, { color: rank.color }]}>{rank.label}</Text>
                  {score >= highScore && score > 0 && (
                    <Text style={styles.newHighScore}>🎊 New High Score!</Text>
                  )}
                </View>

                <View style={styles.endStatsRow}>
                  <View style={styles.endStatBox}>
                    <Text style={styles.endStatValue}>{score}</Text>
                    <Text style={styles.endStatLabel}>This round</Text>
                  </View>
                  <View style={styles.endStatBox}>
                    <Text style={styles.endStatValue}>{highScore}</Text>
                    <Text style={styles.endStatLabel}>Best ever</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.playAgainBtn} onPress={startGame}>
                  <Text style={styles.playAgainText}>🔄 Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.leaderboardLinkBtn}
                  onPress={() => setShowLeaderboard(true)}
                >
                  <Text style={styles.leaderboardLinkText}>🏆 View Leaderboard</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8", paddingHorizontal: 16 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  leaderboardBtn: {
    backgroundColor: "#1a56db",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  leaderboardBtnText: { color: "white", fontWeight: "700", fontSize: 13 },

  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 16 },

  emptyCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptySubtext: { fontSize: 13, color: "#9ca3af", textAlign: "center" },

  leaderboardCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  leaderboardCardMe: {
    borderWidth: 2,
    borderColor: "#1a56db",
    backgroundColor: "#eff6ff",
  },
  rank: { fontSize: 20, width: 36, textAlign: "center" },
  leaderName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  leaderScore: { fontSize: 15, fontWeight: "700", color: "#1a56db" },

  gameContainer: { flex: 1 },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  timerBox: { backgroundColor: "#eff6ff" },
  timerBoxRed: { backgroundColor: "#fee2e2" },
  statLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "500", marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  timerRed: { color: "#dc2626" },

  centerArea: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },

  gameTitle: { fontSize: 28, fontWeight: "800", color: "#111827", textAlign: "center" },
  gameSubtitle: { fontSize: 15, color: "#6b7280", textAlign: "center", lineHeight: 22 },

  playingLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a56db",
    textAlign: "center",
    letterSpacing: 1,
  },

  flushButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#1a56db",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1a56db",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    gap: 8,
  },
  flushEmoji: { fontSize: 64 },
  flushButtonText: { fontSize: 16, fontWeight: "700", color: "white" },
  scoreDisplay: { fontSize: 36, fontWeight: "900", color: "white" },

  gameOverTitle: { fontSize: 28, fontWeight: "800", color: "#111827" },

  resultCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    gap: 8,
  },
  resultScore: { fontSize: 72, fontWeight: "900", color: "#1a56db" },
  resultLabel: { fontSize: 18, color: "#6b7280", fontWeight: "600" },
  rankLabel: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  newHighScore: { fontSize: 16, color: "#f59e0b", fontWeight: "700", marginTop: 4 },

  endStatsRow: { flexDirection: "row", gap: 12, width: "100%" },
  endStatBox: {
    flex: 1,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  endStatValue: { fontSize: 24, fontWeight: "800", color: "#1a56db" },
  endStatLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  playAgainBtn: {
    backgroundColor: "#1a56db",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  playAgainText: { color: "white", fontWeight: "700", fontSize: 16 },

  leaderboardLinkBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  leaderboardLinkText: { color: "#1a56db", fontWeight: "600", fontSize: 14 },
});


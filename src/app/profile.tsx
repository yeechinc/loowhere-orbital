import AdminScreen from '@/components/AdminScreen';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../supabaseConfig";

// converts a points total into a rank title shown on the profile
function getRankTitle(points: number): string {
  if (points >= 200) return '👑 Loo King';
  if (points >= 101) return '🏆 Loo Legend';
  if (points >= 51) return '⭐ Loo Master';
  if (points >= 21) return '🔍 Loo Amateur';
  return '🚽 Loo Seeker';
}

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [submitCount, setSubmitCount] = useState(0);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [adminVisible, setAdminVisible] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUser();
  }, []);

  // loads the current user's profile info, stats, and recent reviews from Supabase
  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUser(user);
    setDisplayName(user?.user_metadata?.username ?? user?.user_metadata?.display_name ?? "");

    const { count } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    setReviewCount(count ?? 0);

    const { count: subCount } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", user.id);
    setSubmitCount(subCount ?? 0);

    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentReviews(reviews ?? []);

    // fetch the user's accumulated points for the rank status
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", user.id)
      .single();
    setTotalPoints(pointsData?.points ?? 0);

    setLoading(false);
  }

  // updates the display name in Supabase auth metadata and refreshes local state
  async function handleSaveDisplayName() {
    if (!newDisplayName.trim()) { Alert.alert("Error", "Display name cannot be empty"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: newDisplayName.trim() } });
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setDisplayName(newDisplayName.trim());
      setNewDisplayName("");
      await fetchUser();
      Alert.alert("Success", "Display name updated!");
    }
  }

  // confirms with the user before signing out and returning to login page
  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => { await supabase.auth.signOut(); setUser(null); } },
    ]);
  }

  // renders a 5-star rating row, filling stars up to the given rating
  const renderStars = (rating: number) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={{ fontSize: 12, color: star <= rating ? "#f59e0b" : "#d1d5db" }}>★</Text>
      ))}
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a56db" /></View>;
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => { setNewDisplayName(displayName); setSettingsVisible(true); }}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(displayName || user?.email)?.[0].toUpperCase() ?? "?"}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{displayName || user?.user_metadata?.username || "LooWhere User"}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.verifiedRow}>
              <Text style={styles.verifiedText}>✓ Verified Member</Text>
            </View>
          </View>
        </View>

        <View style={styles.pointsCard}>
          <View style={styles.pointsLeft}>
            <Text style={styles.pointsNumber}>{totalPoints}</Text>
            <Text style={styles.pointsLabel}>Total Points</Text>
          </View>
          <View style={styles.pointsDivider} />
          <View style={styles.pointsRight}>
            <Text style={styles.rankTitle}>{getRankTitle(totalPoints)}</Text>
            <Text style={styles.rankLabel}>Current Rank</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{reviewCount}</Text>
            <Text style={styles.statLabel}>Loos{"\n"}Reviewed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{submitCount}</Text>
            <Text style={styles.statLabel}>Loos{"\n"}Submitted</Text>
          </View>
        </View>

        <View style={styles.pointsBreakdown}>
          <Text style={styles.sectionTitle}>How to earn points</Text>
          <View style={styles.breakdownRow}><Text style={styles.breakdownEmoji}>🚽</Text><Text style={styles.breakdownText}>Submit a new toilet</Text><Text style={styles.breakdownPts}>+10 pts</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownEmoji}>✅</Text><Text style={styles.breakdownText}>Submission approved</Text><Text style={styles.breakdownPts}>+15 pts</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownEmoji}>📷</Text><Text style={styles.breakdownText}>Upload a photo</Text><Text style={styles.breakdownPts}>+5 pts</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownEmoji}>⭐</Text><Text style={styles.breakdownText}>Leave a review</Text><Text style={styles.breakdownPts}>+3 pts</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownEmoji}>🧻</Text><Text style={styles.breakdownText}>Confirm paper refill</Text><Text style={styles.breakdownPts}>+2 pts</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownEmoji}>🎮</Text><Text style={styles.breakdownText}>Play Flush Frenzy</Text><Text style={styles.breakdownPts}>+1 pt/10 flushes</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentReviews.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyIcon}>🚽</Text>
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>Start reviewing toilets to see your activity here!</Text>
            </View>
          ) : (
            recentReviews.map((review) => (
              <View key={review.id} style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <Text style={styles.activityToilet} numberOfLines={1}>{review.toilet_name}</Text>
                  {renderStars(review.rating)}
                </View>
                {review.comment ? <Text style={styles.activityComment} numberOfLines={2}>{review.comment}</Text> : null}
                <Text style={styles.activityDate}>
                  {new Date(review.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={settingsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsVisible(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Email</Text>
            <View style={styles.emailBox}>
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Display Name</Text>
            <TextInput style={styles.input} value={newDisplayName} onChangeText={setNewDisplayName} placeholder="Enter display name" autoCapitalize="words" />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveDisplayName} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Display Name"}</Text>
            </TouchableOpacity>
          </View>

{/* emails of admin moderators */}
          {(user?.email === 'marcuschenyc@gmail.com' || user?.email === 'tayjyunwey@gmail.com' || user?.email === 'e1385486@u.nus.edu') && (
            <TouchableOpacity style={styles.adminButton} onPress={() => { setSettingsVisible(false); setTimeout(() => setAdminVisible(true), 300); }}>
              <Text style={styles.adminButtonText}>🔧 Admin Dashboard</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={() => { setSettingsVisible(false); setTimeout(() => handleLogout(), 300); }}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={adminVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAdminVisible(false)}>
        <AdminScreen onClose={() => setAdminVisible(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8", paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#111827" },
  settingsButton: { padding: 4 },
  settingsIcon: { fontSize: 24 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#1a56db", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 28, fontWeight: "700", color: "white" },
  userInfo: { flex: 1 },
  username: { fontSize: 20, fontWeight: "700", color: "#111827" },
  email: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  verifiedRow: { marginTop: 6 },
  verifiedText: { fontSize: 12, color: "#1a56db", fontWeight: "600" },
  pointsCard: { backgroundColor: "#1a56db", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", marginBottom: 16, shadowColor: "#1a56db", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  pointsLeft: { flex: 1, alignItems: "center" },
  pointsNumber: { fontSize: 36, fontWeight: "800", color: "white" },
  pointsLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  pointsDivider: { width: 1, height: 50, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 16 },
  pointsRight: { flex: 1, alignItems: "center" },
  rankTitle: { fontSize: 16, fontWeight: "800", color: "white", textAlign: "center" },
  rankLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: "#eff6ff", borderRadius: 16, padding: 16, alignItems: "center" },
  statNumber: { fontSize: 28, fontWeight: "800", color: "#1a56db" },
  statLabel: { fontSize: 12, color: "#6b7280", textAlign: "center", marginTop: 4 },
  pointsBreakdown: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  breakdownRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  breakdownEmoji: { fontSize: 18, marginRight: 10, width: 28 },
  breakdownText: { flex: 1, fontSize: 14, color: "#374151" },
  breakdownPts: { fontSize: 13, color: "#1a56db", fontWeight: "700" },
  section: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  emptyActivity: { alignItems: "center", paddingVertical: 24 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 16, color: "#6b7280", fontWeight: "600" },
  emptySubtext: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 6 },
  activityCard: { backgroundColor: "#f9fafb", borderRadius: 12, padding: 12, marginBottom: 10 },
  activityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  activityToilet: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  activityComment: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  activityDate: { fontSize: 11, color: "#9ca3af" },
  modalContainer: { flex: 1, backgroundColor: "#f0f4f8", paddingHorizontal: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  modalClose: { fontSize: 18, color: "#6b7280" },
  settingsSection: { marginBottom: 24 },
  settingsLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  emailBox: { backgroundColor: "#e5e7eb", borderRadius: 12, padding: 14 },
  emailText: { fontSize: 15, color: "#374151" },
  input: { backgroundColor: "white", borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  saveButton: { backgroundColor: "#1a56db", borderRadius: 12, padding: 14, alignItems: "center" },
  saveButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
  adminButton: { backgroundColor: "#1a56db", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 12 },
  adminButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
  logoutButton: { backgroundColor: "#fee2e2", borderRadius: 12, padding: 14, alignItems: "center", marginTop: "auto", marginBottom: 32 },
  logoutText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
});
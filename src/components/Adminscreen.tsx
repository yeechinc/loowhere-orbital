import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../supabaseConfig";

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

export default function AdminScreen({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: subs } = await supabase.from("submissions").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setSubmissions(subs ?? []);
    const { count } = await supabase.from("reviews").select("user_id", { count: "exact", head: true });
    setUserCount(count ?? 0);
    setLoading(false);
  }

  async function handleApprove(submission: any) {
    const { error } = await supabase.from("toilets").insert({
      name: submission.name,
      address: submission.address,
      latitude: submission.latitude,
      longitude: submission.longitude,
      has_bidet: submission.has_bidet,
      has_paper: submission.has_paper,
      handicapped_access: submission.handicapped_access,
      has_shower: submission.has_shower,
      verified: true,
    });

    if (error) { Alert.alert("Error", error.message); return; }

    if (submission.photo_url) {
      await supabase.from("toilet_photos").insert({
        toilet_name: submission.name,
        photo_url: submission.photo_url,
        uploaded_by: submission.submitted_by,
      });
    }

    await supabase.from("submissions").update({ status: "approved" }).eq("id", submission.id);
    await awardPoints(submission.submitted_by, 15);

    setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    setTimeout(() => {
      Alert.alert("✅ Approved!", `${submission.name} is now live on the map!`);
    }, 300);
  }

  async function handleReject(submission: any) {
    Alert.alert("Reject", `Reject "${submission.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          await supabase.from("submissions").update({ status: "rejected" }).eq("id", submission.id);
          setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
          setTimeout(() => { Alert.alert("❌ Rejected", `"${submission.name}" has been rejected.`); }, 300);
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Admin Dashboard</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1a56db" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{submissions.length}</Text>
              <Text style={styles.statLabel}>Pending{"\n"}Submissions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userCount}</Text>
              <Text style={styles.statLabel}>Total{"\n"}Reviews</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Pending Submissions</Text>

          {submissions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyText}>No pending submissions!</Text>
            </View>
          ) : (
            submissions.map((sub) => (
              <View key={sub.id} style={styles.submissionCard}>
                <Text style={styles.subName}>{sub.name}</Text>
                <Text style={styles.subAddress}>{sub.address}</Text>
                <Text style={styles.subDate}>{new Date(sub.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</Text>
                {sub.photo_url && <View style={styles.photoIndicator}><Text style={styles.photoIndicatorText}>📷 Photo attached</Text></View>}
                <View style={styles.tagRow}>
                  {sub.has_bidet && <View style={styles.tag}><Text style={styles.tagText}>🚿 Bidet</Text></View>}
                  {sub.has_paper && <View style={styles.tag}><Text style={styles.tagText}>🧻 Paper</Text></View>}
                  {sub.handicapped_access && <View style={styles.tag}><Text style={styles.tagText}>♿ Accessible</Text></View>}
                  {sub.has_shower && <View style={styles.tag}><Text style={styles.tagText}>🚿 Shower</Text></View>}
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(sub)}>
                    <Text style={styles.approveBtnText}>✅ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(sub)}>
                    <Text style={styles.rejectBtnText}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8", paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  closeBtn: { fontSize: 18, color: "#6b7280" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "#eff6ff", borderRadius: 16, padding: 16, alignItems: "center" },
  statNumber: { fontSize: 32, fontWeight: "800", color: "#1a56db" },
  statLabel: { fontSize: 12, color: "#6b7280", textAlign: "center", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  emptyCard: { backgroundColor: "white", borderRadius: 16, padding: 32, alignItems: "center", gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 16, color: "#6b7280", fontWeight: "600" },
  submissionCard: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  subName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subAddress: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  subDate: { fontSize: 12, color: "#9ca3af", marginBottom: 10 },
  photoIndicator: { backgroundColor: "#eff6ff", borderRadius: 8, padding: 8, marginBottom: 10 },
  photoIndicatorText: { fontSize: 13, color: "#1a56db", fontWeight: "600" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: { backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "#bfdbfe" },
  tagText: { fontSize: 12, color: "#1a56db", fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, backgroundColor: "#dcfce7", borderRadius: 10, padding: 12, alignItems: "center" },
  approveBtnText: { color: "#166534", fontWeight: "700", fontSize: 14 },
  rejectBtn: { flex: 1, backgroundColor: "#fee2e2", borderRadius: 10, padding: 12, alignItems: "center" },
  rejectBtnText: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
});
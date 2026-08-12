import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../supabaseConfig";

export default function SavedScreen({ onSelectToilet }: { onSelectToilet: (toilet: any) => void }) {
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchSaved();
  }, []);

  // loads the user's saved toilet names, then fetches full toilet details for each
  async function fetchSaved() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("saved_toilets")
      .select("toilet_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // saved_toilets only stores names, so cross-reference against the toilets table for full details
      const names = data.map((s) => s.toilet_name);
      const { data: toilets } = await supabase
        .from("toilets")
        .select("*")
        .in("name", names);
      setSaved(toilets ?? []);
    }
    setLoading(false);
  }

  // removes a toilet from the user's saved list
  async function handleUnsave(toiletName: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("saved_toilets")
      .delete()
      .eq("user_id", user.id)
      .eq("toilet_name", toiletName);
    setSaved((prev) => prev.filter((t) => t.name !== toiletName));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
    >
      <Text style={styles.title}>Saved Loos</Text>

      {saved.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🚽</Text>
          <Text style={styles.emptyText}>No saved toilets yet!</Text>
          <Text style={styles.emptySubtext}>Tap the ❤️ on any toilet to save it here.</Text>
        </View>
      ) : (
        saved.map((toilet) => (
          <TouchableOpacity
            key={toilet.name}
            style={styles.card}
            onPress={() => onSelectToilet(toilet)}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.toiletName}>{toilet.name}</Text>
              <Text style={styles.toiletAddress}>{toilet.address}</Text>
              <View style={styles.tagRow}>
                {toilet.has_bidet && <View style={styles.tag}><Text style={styles.tagText}>🚿 Bidet</Text></View>}
                {toilet.has_paper && <View style={styles.tag}><Text style={styles.tagText}>🧻 Paper</Text></View>}
                {toilet.handicapped_access && <View style={styles.tag}><Text style={styles.tagText}>♿ Accessible</Text></View>}
              </View>
            </View>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleUnsave(toilet.name); }}>
              <Text style={styles.unsaveIcon}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8", paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 20 },
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
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardLeft: { flex: 1 },
  toiletName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  toiletAddress: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  tagText: { fontSize: 11, color: "#1a56db", fontWeight: "600" },
  unsaveIcon: { fontSize: 20, color: "#9ca3af", marginLeft: 12 },
});
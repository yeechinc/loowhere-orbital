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

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    setDisplayName(user?.user_metadata?.username ?? user?.user_metadata?.display_name ?? "");
    setLoading(false);
  }

  async function handleSaveDisplayName() {
    if (!newDisplayName.trim()) {
      Alert.alert("Error", "Display name cannot be empty");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: newDisplayName.trim() },
    });
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

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          setUser(null);
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              setNewDisplayName(displayName);
              setSettingsVisible(true);
            }}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(displayName || user?.email)?.[0].toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>
              {displayName || user?.user_metadata?.username || "LooWhere User"}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.verifiedRow}>
              <Text style={styles.verifiedText}>✓ Verified Member</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Loos{"\n"}Reviewed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Loos{"\n"}Submitted</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyIcon}>🚽</Text>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              Start reviewing toilets to see your activity here!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Email</Text>
            <View style={styles.emailBox}>
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>
          </View>

          {/* Display Name */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder="Enter display name"
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveDisplayName}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Display Name"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              setSettingsVisible(false);
              setTimeout(() => handleLogout(), 300);
            }}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8", paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#111827" },
  settingsButton: { padding: 4 },
  settingsIcon: { fontSize: 24 },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1a56db",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "white" },
  userInfo: { flex: 1 },
  username: { fontSize: 20, fontWeight: "700", color: "#111827" },
  email: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  verifiedRow: { marginTop: 6 },
  verifiedText: { fontSize: 12, color: "#1a56db", fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statNumber: { fontSize: 28, fontWeight: "800", color: "#1a56db" },
  statLabel: { fontSize: 12, color: "#6b7280", textAlign: "center", marginTop: 4 },

  section: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  emptyActivity: { alignItems: "center", paddingVertical: 24 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 16, color: "#6b7280", fontWeight: "600" },
  emptySubtext: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 6 },

  modalContainer: {
    flex: 1,
    backgroundColor: "#f0f4f8",
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  modalClose: { fontSize: 18, color: "#6b7280" },

  settingsSection: { marginBottom: 24 },
  settingsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emailBox: {
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
  },
  emailText: { fontSize: 15, color: "#374151" },

  input: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#1a56db",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  saveButtonText: { color: "white", fontWeight: "700", fontSize: 15 },

  logoutButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 32,
  },
  logoutText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
});
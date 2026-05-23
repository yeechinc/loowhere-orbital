import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../supabaseConfig";

export default function HomeScreen() {
  const [toilets, setToilets] = useState([]);
  const [selectedToilet, setSelectedToilet] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    bidet: false,
    handicap: false,
    paper: false,
  });
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
      }
    }
    checkUser();

    async function fetchToilets() {
      const { data, error } = await supabase.from("toilets").select("*");
      if (data) setToilets(data);
      if (error) console.log("Error:", error);
    }
    fetchToilets();
  }, []);

  const toggleFilter = (filter) => {
    setActiveFilters((prev) => ({ ...prev, [filter]: !prev[filter] }));
  };

  const closePopup = () => {
    setSelectedToilet(null);
  };

  const filteredToilets = toilets.filter((t) => {
    if (activeFilters.bidet && !t.has_bidet) return false;
    if (activeFilters.handicap && !t.is_accessible) return false;
    if (activeFilters.paper && !t.has_paper) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logoImage}
          />
          <Text style={styles.headerTitle}>LooWhere?</Text>
        </View>
        <TouchableOpacity style={styles.filterIcon}>
          <Text style={styles.filterIconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.chip, activeFilters.bidet && styles.chipActive]}
          onPress={() => toggleFilter("bidet")}
        >
          <Text style={[styles.chipText, activeFilters.bidet && styles.chipTextActive]}>
            🚿 Bidet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, activeFilters.handicap && styles.chipActive]}
          onPress={() => toggleFilter("handicap")}
        >
          <Text style={[styles.chipText, activeFilters.handicap && styles.chipTextActive]}>
            ♿ Handicap
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, activeFilters.paper && styles.chipActive]}
          onPress={() => toggleFilter("paper")}
        >
          <Text style={[styles.chipText, activeFilters.paper && styles.chipTextActive]}>
            🧻 Paper
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        ref={mapRef}
        initialRegion={{
          latitude: 1.3521,
          longitude: 103.8198,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {filteredToilets.map((toilet) => (
          <Marker
            key={`${toilet.id}-${selectedToilet?.id}`}
            coordinate={{
              latitude: toilet.latitude,
              longitude: toilet.longitude,
            }}
            pinColor={toilet.has_bidet ? "#1a56db" : "red"}
            onPress={() => setSelectedToilet(toilet)}
          />
        ))}
      </MapView>

      {/* Bottom Sheet Popup */}
      {selectedToilet && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 8 }]}>
          {/* Picture placeholder */}
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷 Picture here</Text>
          </View>

          {/* Toilet Info */}
          <View style={styles.sheetContent}>
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>{selectedToilet.name}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            </View>

            <Text style={styles.sheetAddress}>{selectedToilet.address}</Text>

            {/* Facility Tags */}
            <View style={styles.tagRow}>
              {selectedToilet.has_bidet && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>🚿 Bidet</Text>
                </View>
              )}
              {selectedToilet.is_accessible && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>♿ Accessible</Text>
                </View>
              )}
              {selectedToilet.has_paper && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>🧻 Paper</Text>
                </View>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.goButton}>
                <Text style={styles.goButtonText}>📍 Let's Go!</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedToilet(null)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },

  // Header
  header: {
    backgroundColor: "white",
    paddingBottom: 4,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    overflow: "visible",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoImage: { width: 60, height: 60, resizeMode: "contain" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1a56db" },
  filterIcon: { padding: 4 },
  filterIconText: { fontSize: 22 },

  // Filter chips
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "white",
    zIndex: 9,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
  },
  chipActive: {
    backgroundColor: "#1a56db",
    borderColor: "#1a56db",
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "white" },

  // Map
  map: { flex: 1 },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "55%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  imagePlaceholder: {
    height: 160,
    backgroundColor: "#e5e7eb",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: { fontSize: 16, color: "#9ca3af" },
  sheetContent: { padding: 16 },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#111827", flex: 1 },
  verifiedBadge: {
    backgroundColor: "#1a56db",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  verifiedText: { color: "white", fontSize: 11, fontWeight: "700" },
  sheetAddress: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  tagRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tag: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  tagText: { fontSize: 13, color: "#1a56db", fontWeight: "600" },
  buttonRow: { flexDirection: "row", gap: 10 },
  goButton: {
    flex: 1,
    backgroundColor: "#1a56db",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  goButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  closeButton: {
    width: 50,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { fontSize: 18, color: "#374151" },
});
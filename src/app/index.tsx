import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.replace("/login");
    }
    checkUser();

    async function fetchToilets() {
      const { data, error } = await supabase.from("toilets").select("*");
      if (data) setToilets(data);
      if (error) console.log("Error:", error);
    }
    fetchToilets();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timeout = setTimeout(() => {
      const filtered = toilets.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, toilets]);

  async function fetchReviews(toiletName) {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("toilet_name", toiletName)
      .order("created_at", { ascending: false });
    if (data) {
      setReviews(data);
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setAverageRating(0);
      }
    }
  }

  function handleSelectResult(toilet) {
    setSelectedToilet(toilet);
    fetchReviews(toilet.name);
    setSearchQuery("");
    setShowResults(false);
    mapRef.current?.animateToRegion({
      latitude: toilet.latitude,
      longitude: toilet.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 600);
  }

  async function handleSubmitReview() {
    if (userRating === 0) {
      Alert.alert("Error", "Please select a star rating!");
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reviews").insert({
      toilet_name: selectedToilet.name,
      user_id: user.id,
      rating: userRating,
      comment: userComment.trim(),
      display_name: user.user_metadata?.display_name ?? "LooWhere User",
    });
    setSubmitting(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setUserRating(0);
      setUserComment("");
      await fetchReviews(selectedToilet.name);
      Alert.alert("Thanks!", "Your review has been submitted!");
    }
  }

  const toggleFilter = (filter) => {
    setActiveFilters((prev) => ({ ...prev, [filter]: !prev[filter] }));
  };

  const filteredToilets = toilets.filter((t) => {
    if (activeFilters.bidet && !t.has_bidet) return false;
    if (activeFilters.handicap && !t.handicapped_access) return false;
    if (activeFilters.paper && !t.has_paper) return false;
    return true;
  });

  const renderStars = (rating, size = 16, interactive = false) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => interactive && setUserRating(star)}
          disabled={!interactive}
        >
          <Text style={{ fontSize: size, color: star <= rating ? "#f59e0b" : "#d1d5db" }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Image source={require("../../assets/images/logo.png")} style={styles.logoImage} />
          <Text style={styles.headerTitle}>LooWhere?</Text>
        </View>
        <TouchableOpacity style={styles.filterIcon}>
          <Text style={styles.filterIconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a toilet..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setShowResults(false); }}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {showResults && (
          <View style={styles.dropdown}>
            {searchResults.length === 0 ? (
              <Text style={styles.noResults}>No toilets found</Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id?.toString() ?? item.name}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 240 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => handleSelectResult(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownName}>{item.name}</Text>
                      <Text style={styles.dropdownAddress}>{item.address}</Text>
                    </View>
                    <Text style={styles.dropdownArrow}>→</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.chip, activeFilters.bidet && styles.chipActive]} onPress={() => toggleFilter("bidet")}>
          <Text style={[styles.chipText, activeFilters.bidet && styles.chipTextActive]}>🚿 Bidet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, activeFilters.handicap && styles.chipActive]} onPress={() => toggleFilter("handicap")}>
          <Text style={[styles.chipText, activeFilters.handicap && styles.chipTextActive]}>♿ Handicap</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, activeFilters.paper && styles.chipActive]} onPress={() => toggleFilter("paper")}>
          <Text style={[styles.chipText, activeFilters.paper && styles.chipTextActive]}>🧻 Paper</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        ref={mapRef}
         zoomEnabled={true}
         scrollEnabled={true}
         zoomControlEnabled={true}
         initialRegion={{ latitude: 1.3521, longitude: 103.8198, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {filteredToilets.map((toilet) => (
          <Marker
            key={`${toilet.name}-${selectedToilet?.name}`}
            coordinate={{ latitude: toilet.latitude, longitude: toilet.longitude }}
            pinColor={toilet.has_bidet ? "#1a56db" : "red"}
            onPress={() => { setSelectedToilet(toilet); fetchReviews(toilet.name); }}
          />
        ))}
      </MapView>

      {/* Bottom Sheet Popup */}
      {selectedToilet && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷 Picture here</Text>
          </View>
          <View style={styles.sheetContent}>
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>{selectedToilet.name}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.ratingRow} onPress={() => setReviewsVisible(true)}>
              {renderStars(averageRating)}
              <Text style={styles.ratingText}>
                {averageRating > 0 ? `${averageRating} (${reviews.length} reviews)` : "No reviews yet"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.sheetAddress}>{selectedToilet.address}</Text>
            <View style={styles.tagRow}>
              {selectedToilet.has_bidet && <View style={styles.tag}><Text style={styles.tagText}>🚿 Bidet</Text></View>}
              {selectedToilet.handicapped_access && <View style={styles.tag}><Text style={styles.tagText}>♿ Accessible</Text></View>}
              {selectedToilet.has_paper && <View style={styles.tag}><Text style={styles.tagText}>🧻 Paper</Text></View>}
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.goButton}>
                <Text style={styles.goButtonText}>📍 Let's Go!</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedToilet(null)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Reviews Modal */}
      <Modal visible={reviewsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewsVisible(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedToilet?.name}</Text>
            <TouchableOpacity onPress={() => setReviewsVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.writeReview}>
              <Text style={styles.writeReviewTitle}>Write a Review</Text>
              <View style={styles.starPicker}>{renderStars(userRating, 32, true)}</View>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience..."
                value={userComment}
                onChangeText={setUserComment}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview} disabled={submitting}>
                <Text style={styles.submitButtonText}>{submitting ? "Submitting..." : "Submit Review"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <Text style={styles.reviewsTitle}>
              {reviews.length > 0 ? `${reviews.length} Review${reviews.length > 1 ? "s" : ""}` : "No reviews yet — be the first!"}
            </Text>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{review.display_name?.[0].toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{review.display_name}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                  {renderStars(review.rating, 14)}
                </View>
                {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
              </View>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },

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

  searchWrapper: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingBottom: 6,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  clearText: { fontSize: 15, color: "#9ca3af" },
  dropdown: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  dropdownAddress: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  dropdownArrow: { fontSize: 18, color: "#1a56db", marginLeft: 8 },
  separator: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 16 },
  noResults: { padding: 16, textAlign: "center", color: "#9ca3af", fontSize: 14 },

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
  chipActive: { backgroundColor: "#1a56db", borderColor: "#1a56db" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "white" },

  map: { flex: 1 },

  bottomSheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  imagePlaceholder: {
    height: 140,
    backgroundColor: "#e5e7eb",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: { fontSize: 16, color: "#9ca3af" },
  sheetContent: { padding: 16 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#111827", flex: 1 },
  verifiedBadge: { backgroundColor: "#1a56db", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  verifiedText: { color: "white", fontSize: 11, fontWeight: "700" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  ratingText: { fontSize: 13, color: "#1a56db", textDecorationLine: "underline", fontWeight: "600" },
  sheetAddress: { fontSize: 13, color: "#6b7280", marginBottom: 10 },
  tagRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tag: { backgroundColor: "#eff6ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#bfdbfe" },
  tagText: { fontSize: 13, color: "#1a56db", fontWeight: "600" },
  buttonRow: { flexDirection: "row", gap: 10 },
  goButton: { flex: 1, backgroundColor: "#1a56db", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  goButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  closeButton: { width: 50, backgroundColor: "#f3f4f6", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  closeButtonText: { fontSize: 18, color: "#374151" },

  modalContainer: { flex: 1, backgroundColor: "#f0f4f8", paddingHorizontal: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827", flex: 1 },
  modalClose: { fontSize: 18, color: "#6b7280" },
  writeReview: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  writeReviewTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  starPicker: { marginBottom: 12 },
  commentInput: { backgroundColor: "#f9fafb", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top", marginBottom: 12 },
  submitButton: { backgroundColor: "#1a56db", borderRadius: 12, padding: 14, alignItems: "center" },
  submitButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginBottom: 16 },
  reviewsTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  reviewCard: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1a56db", justifyContent: "center", alignItems: "center" },
  reviewAvatarText: { color: "white", fontWeight: "700", fontSize: 14 },
  reviewName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  reviewDate: { fontSize: 12, color: "#9ca3af" },
  reviewComment: { fontSize: 14, color: "#374151", lineHeight: 20 },
});
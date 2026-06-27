import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
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

export default function HomeScreen({
  preSelectedToilet,
  onPreSelectedConsumed,
}: {
  preSelectedToilet?: any;
  onPreSelectedConsumed?: () => void;
}) {
  const [toilets, setToilets] = useState<any[]>([]);
  const [loadingToilets, setLoadingToilets] = useState(true);
  const [selectedToilet, setSelectedToilet] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    bidet: false,
    handicap: false,
    paper: false,
  });
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [savedToilets, setSavedToilets] = useState<string[]>([]);
  const [toiletPhotos, setToiletPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [promptedToilets, setPromptedToilets] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  async function getAddressFromCoords(latitude: number, longitude: number): Promise<string> {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const g = geocode[0];
        return [g.streetNumber, g.street, g.city, g.postalCode]
          .filter(Boolean)
          .join(', ');
      }
    } catch {}
    return '';
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setCurrentUserId(user.id);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }

      const { data, error } = await supabase.from("toilets").select("*");
      if (error) { console.log("Error:", error); setLoadingToilets(false); return; }

      const { data: reviewsData } = await supabase.from("reviews").select("toilet_name, rating");

      const toiletsWithRatings = (data ?? []).map((toilet) => {
        const toiletReviews = (reviewsData ?? []).filter((r) => r.toilet_name === toilet.name);
        const avg = toiletReviews.length > 0
          ? toiletReviews.reduce((sum, r) => sum + r.rating, 0) / toiletReviews.length
          : null;
        return { ...toilet, avg_rating: avg, review_count: toiletReviews.length };
      });

      const fixed = await Promise.all(
        toiletsWithRatings.map(async (toilet) => {
          if (!toilet.address || toilet.address.includes('NIL') || toilet.address.includes('null')) {
            const addr = await getAddressFromCoords(toilet.latitude, toilet.longitude);
            return { ...toilet, address: addr || toilet.address };
          }
          return toilet;
        })
      );

      setToilets(fixed);
      setLoadingToilets(false);
      fetchSavedToilets();
    }
    init();
  }, []);

  useEffect(() => {
    if (preSelectedToilet) {
      setSelectedToilet(preSelectedToilet);
      fetchReviews(preSelectedToilet.name);
      fetchToiletPhotos(preSelectedToilet.name);
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: preSelectedToilet.latitude,
          longitude: preSelectedToilet.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 600);
      }, 300);
      onPreSelectedConsumed?.();
    }
  }, [preSelectedToilet]);

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

  async function fetchSavedToilets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("saved_toilets")
      .select("toilet_name")
      .eq("user_id", user.id);
    if (data) setSavedToilets(data.map((s) => s.toilet_name));
  }

  async function fetchToiletPhotos(toiletName: string) {
    const { data } = await supabase
      .from("toilet_photos")
      .select("photo_url")
      .eq("toilet_name", toiletName)
      .order("created_at", { ascending: false });
    if (data) setToiletPhotos(data.map((p) => p.photo_url));
  }

  async function handleAddPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingPhoto(false); return; }

    const uri = result.assets[0].uri;
    const fileName = `${user.id}-${Date.now()}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from("toilet-photos")
      .upload(fileName, blob, { contentType: "image/jpeg" });

    if (uploadError) {
      Alert.alert("Upload failed", uploadError.message);
      setUploadingPhoto(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("toilet-photos").getPublicUrl(fileName);
    const { error: dbError } = await supabase.from("toilet_photos").insert({
      toilet_name: selectedToilet.name,
      photo_url: publicUrl,
      uploaded_by: user.id,
    });

    setUploadingPhoto(false);
    if (dbError) {
      Alert.alert("Error", dbError.message);
    } else {
      await fetchToiletPhotos(selectedToilet.name);
      Alert.alert("Thanks!", "Photo uploaded successfully!");
    }
  }

  async function toggleSave(toiletName: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isSaved = savedToilets.includes(toiletName);
    if (isSaved) {
      await supabase.from("saved_toilets").delete().eq("user_id", user.id).eq("toilet_name", toiletName);
      setSavedToilets((prev) => prev.filter((t) => t !== toiletName));
    } else {
      await supabase.from("saved_toilets").insert({ user_id: user.id, toilet_name: toiletName });
      setSavedToilets((prev) => [...prev, toiletName]);
    }
  }

  async function fetchReviews(toiletName: string) {
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

  function handleSelectResult(toilet: any) {
    setSelectedToilet(toilet);
    fetchReviews(toilet.name);
    fetchToiletPhotos(toilet.name);
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
    if (userRating === 0) { Alert.alert("Error", "Please select a star rating!"); return; }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
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

  async function handleDeleteReview(reviewId: string) {
    Alert.alert("Delete Review", "Are you sure you want to delete this review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
          if (error) {
            Alert.alert("Error", error.message);
          } else {
            await fetchReviews(selectedToilet.name);
          }
        },
      },
    ]);
  }

  async function handlePaperRefill(confirmed: boolean) {
    setPromptedToilets((prev) => [...prev, selectedToilet.name]);
    if (!confirmed) return;
    const { error } = await supabase
      .from("toilets")
      .update({ has_paper: true })
      .eq("name", selectedToilet.name);
    if (!error) {
      setToilets((prev) =>
        prev.map((t) => t.name === selectedToilet.name ? { ...t, has_paper: true } : t)
      );
      setSelectedToilet((prev: any) => ({ ...prev, has_paper: true }));
      Alert.alert("Thanks! 🧻", "We've updated this toilet's status. You're helping the community!");
    }
  }

  function getMarkerColor(toilet: any) {
    return toilet.has_paper ? "#1a56db" : "red";
  }

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
  }

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => ({ ...prev, [filter]: !prev[filter] }));
  };

  const filteredToilets = toilets.filter((t) => {
    if (activeFilters.bidet && !t.has_bidet) return false;
    if (activeFilters.handicap && !t.handicapped_access) return false;
    if (activeFilters.paper && !t.has_paper) return false;
    return true;
  });

  const renderStars = (rating: number, size = 16, interactive = false) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => interactive && setUserRating(star)} disabled={!interactive}>
          <Text style={{ fontSize: size, color: star <= rating ? "#f59e0b" : "#d1d5db" }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const showPaperPrompt = selectedToilet &&
    !selectedToilet.has_paper &&
    !promptedToilets.includes(selectedToilet.name);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Image source={require("../../assets/images/logo.png")} style={styles.logoImage} />
          <Text style={styles.headerTitle}>LooWhere?</Text>
        </View>
        <TouchableOpacity style={styles.filterIcon}>
          <Text style={styles.filterIconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

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
                keyExtractor={(item) => item.name}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 240 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => handleSelectResult(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownName}>{item.name}</Text>
                      <Text style={styles.dropdownAddress}>
                        {item.address?.replace(/NIL/g, '').replace(/\s+/g, ' ').trim() || 'No address available'}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Text style={{ fontSize: 11, color: "#f59e0b" }}>★</Text>
                          <Text style={{ fontSize: 11, color: "#6b7280" }}>
                            {item.avg_rating ? `${item.avg_rating.toFixed(1)} (${item.review_count} reviews)` : "No reviews yet"}
                          </Text>
                        </View>
                        {userLocation && (
                          <Text style={{ fontSize: 11, color: "#6b7280" }}>
                            · 📍 {getDistance(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude)}
                          </Text>
                        )}
                      </View>
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

      <MapView
        style={styles.map}
        ref={mapRef}
        zoomEnabled={true}
        scrollEnabled={true}
        zoomControlEnabled={true}
        showsUserLocation={true}
        showsMyLocationButton={false}
        initialRegion={{ latitude: 1.3521, longitude: 103.8198, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {filteredToilets.map((toilet) => (
          <Marker
            key={`${toilet.name}-${toilet.has_paper}`}
            coordinate={{ latitude: toilet.latitude, longitude: toilet.longitude }}
            pinColor={getMarkerColor(toilet)}
            onPress={() => { setSelectedToilet(toilet); fetchReviews(toilet.name); fetchToiletPhotos(toilet.name); }}
          />
        ))}
      </MapView>

      {loadingToilets && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1a56db" />
          <Text style={styles.loadingText}>Finding toilets near you...</Text>
        </View>
      )}

      {selectedToilet && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 8 }]}>
          {toiletPhotos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {toiletPhotos.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.toiletPhoto} />
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity style={styles.imagePlaceholder} onPress={handleAddPhoto} disabled={uploadingPhoto}>
              <Text style={styles.imagePlaceholderText}>
                {uploadingPhoto ? "Uploading..." : "📷 Tap to add a photo"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.sheetContent}>
            {showPaperPrompt && (
              <View style={styles.refillPrompt}>
                <Text style={styles.refillText}>🧻 Has toilet paper been refilled?</Text>
                <View style={styles.refillButtons}>
                  <TouchableOpacity style={styles.refillYes} onPress={() => handlePaperRefill(true)}>
                    <Text style={styles.refillYesText}>Yes!</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.refillNo} onPress={() => handlePaperRefill(false)}>
                    <Text style={styles.refillNoText}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
              {!selectedToilet.has_paper && <View style={[styles.tag, styles.tagWarning]}><Text style={styles.tagWarningText}>⚠️ No Paper</Text></View>}
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.goButton}
                onPress={() => {
                  const { latitude, longitude, name } = selectedToilet;
                  const url = `maps://?q=${encodeURIComponent(name)}&ll=${latitude},${longitude}`;
                  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
                  Linking.openURL(url).catch(() => Linking.openURL(fallback));
                }}
              >
                <Text style={styles.goButtonText}>📍 Let's Go!</Text>
              </TouchableOpacity>
              {toiletPhotos.length > 0 && (
                <TouchableOpacity style={styles.photoButton} onPress={handleAddPhoto} disabled={uploadingPhoto}>
                  <Ionicons name="camera-outline" size={22} color="#374151" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.saveToiletButton} onPress={() => toggleSave(selectedToilet.name)}>
                <Ionicons
                  name={savedToilets.includes(selectedToilet.name) ? 'heart' : 'heart-outline'}
                  size={22}
                  color={savedToilets.includes(selectedToilet.name) ? '#ef4444' : '#374151'}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedToilet(null)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
                  {review.user_id === currentUserId && (
                    <TouchableOpacity onPress={() => handleDeleteReview(review.id)} style={styles.deleteReviewBtn}>
                      <Text style={styles.deleteReviewText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
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
  header: { backgroundColor: "white", paddingBottom: 4, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, zIndex: 10, overflow: "visible" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoImage: { width: 60, height: 60, resizeMode: "contain" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1a56db" },
  filterIcon: { padding: 4 },
  filterIconText: { fontSize: 22 },
  searchWrapper: { backgroundColor: "white", paddingHorizontal: 12, paddingBottom: 6, zIndex: 20 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  clearText: { fontSize: 15, color: "#9ca3af" },
  dropdown: { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6, overflow: "hidden" },
  dropdownItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  dropdownName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  dropdownAddress: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  dropdownArrow: { fontSize: 18, color: "#1a56db", marginLeft: 8 },
  separator: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 16 },
  noResults: { padding: 16, textAlign: "center", color: "#9ca3af", fontSize: 14 },
  filterRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: "white", zIndex: 9 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "white", borderWidth: 1.5, borderColor: "#d1d5db" },
  chipActive: { backgroundColor: "#1a56db", borderColor: "#1a56db" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "white" },
  map: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.85)", justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 15, color: "#6b7280", fontWeight: "600" },
  bottomSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  photoScroll: { height: 140, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  toiletPhoto: { width: 400, height: 140, resizeMode: "cover" },
  imagePlaceholder: { height: 140, backgroundColor: "#e5e7eb", borderTopLeftRadius: 20, borderTopRightRadius: 20, justifyContent: "center", alignItems: "center" },
  imagePlaceholderText: { fontSize: 16, color: "#9ca3af" },
  sheetContent: { padding: 16 },
  refillPrompt: { backgroundColor: "#fff7ed", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#fed7aa" },
  refillText: { fontSize: 14, fontWeight: "600", color: "#9a3412", marginBottom: 10 },
  refillButtons: { flexDirection: "row", gap: 8 },
  refillYes: { flex: 1, backgroundColor: "#16a34a", borderRadius: 8, padding: 10, alignItems: "center" },
  refillYesText: { color: "white", fontWeight: "700", fontSize: 14 },
  refillNo: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 8, padding: 10, alignItems: "center" },
  refillNoText: { color: "#374151", fontWeight: "700", fontSize: 14 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#111827", flex: 1 },
  verifiedBadge: { backgroundColor: "#1a56db", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  verifiedText: { color: "white", fontSize: 11, fontWeight: "700" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  ratingText: { fontSize: 13, color: "#1a56db", textDecorationLine: "underline", fontWeight: "600" },
  sheetAddress: { fontSize: 13, color: "#6b7280", marginBottom: 10 },
  tagRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  tag: { backgroundColor: "#eff6ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#bfdbfe" },
  tagText: { fontSize: 13, color: "#1a56db", fontWeight: "600" },
  tagWarning: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  tagWarningText: { fontSize: 13, color: "#9a3412", fontWeight: "600" },
  buttonRow: { flexDirection: "row", gap: 10 },
  goButton: { flex: 1, backgroundColor: "#1a56db", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  goButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  photoButton: { width: 50, backgroundColor: "#f3f4f6", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveToiletButton: { width: 50, backgroundColor: "#f3f4f6", borderRadius: 12, alignItems: "center", justifyContent: "center" },
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
  deleteReviewBtn: { padding: 4 },
  deleteReviewText: { fontSize: 16 },
});
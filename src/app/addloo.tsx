import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../supabaseConfig';

const AMENITIES = [
  { key: 'has_bidet', label: 'Bidet', icon: '🚿' },
  { key: 'has_paper', label: 'Tissue', icon: '🧻' },
  { key: 'handicapped_access', label: 'Accessible', icon: '♿' },
  { key: 'has_shower', label: 'Shower', icon: '🚿' },
];

export default function AddLooScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [toiletName, setToiletName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const [amenities, setAmenities] = useState<Record<string, boolean>>({
    has_bidet: false,
    has_paper: false,
    handicapped_access: false,
    has_shower: false,
  });

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function useCurrentLocation() {
    setLocating(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Please allow location access to use this feature.');
      setLocating(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLatitude(loc.coords.latitude);
    setLongitude(loc.coords.longitude);
    const geocode = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    if (geocode.length > 0) {
      const g = geocode[0];
      const addr = [g.streetNumber, g.street, g.city, g.postalCode].filter(Boolean).join(', ');
      setAddress(addr);
    }
    setLocating(false);
    Alert.alert('Location found!', 'Your current location has been set.');
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!toiletName.trim()) { Alert.alert('Error', 'Please enter a toilet name'); return; }
    if (!address.trim()) { Alert.alert('Error', 'Please enter an address'); return; }
    if (!latitude || !longitude) { Alert.alert('Error', 'Please use the current location button to set coordinates'); return; }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert("Error", "You must be logged in to submit a toilet"); setSubmitting(false); return; }

    // Upload photo first if one was selected
    let photoUrl: string | null = null;
    if (photoUri) {
      setUploadingPhoto(true);
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('toilet-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('toilet-photos').getPublicUrl(fileName);
        photoUrl = publicUrl;
      }
      setUploadingPhoto(false);
    }

    // Insert submission with photo URL
    const { error } = await supabase.from('submissions').insert({
      name: toiletName.trim(),
      address: address.trim(),
      latitude,
      longitude,
      has_bidet: amenities.has_bidet,
      has_paper: amenities.has_paper,
      handicapped_access: amenities.handicapped_access,
      has_shower: amenities.has_shower,
      submitted_by: user.id,
      status: 'pending',
      photo_url: photoUrl,
    });

    setSubmitting(false);

    if (error) { Alert.alert('Error', error.message); return; }

    Alert.alert('🚽 Loo Added!', 'Thanks for contributing to LooWhere! Your submission will be reviewed.', [
      { text: 'OK', onPress: () => {
        setStep(0);
        setToiletName('');
        setAddress('');
        setLatitude(null);
        setLongitude(null);
        setPhotoUri(null);
        setAmenities({ has_bidet: false, has_paper: false, handicapped_access: false, has_shower: false });
      }}
    ]);
  }

  if (step === 0) {
    return (
      <View style={[styles.landing, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.landingEmoji}>🚽</Text>
        <Text style={styles.landingTitle}>Know a Loo?</Text>
        <Text style={styles.landingSubtitle}>Help the community by adding a toilet that isn't on the map yet!</Text>
        <TouchableOpacity style={styles.landingButton} onPress={() => setStep(1)}>
          <Text style={styles.landingButtonText}>➕ Add a Loo!</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep(step - 1)}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>Step {step} of 3</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {step === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.mascotCard}>
              <Text style={styles.mascotEmoji}>🚽</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.mascotTitle}>Where's the Loo?</Text>
                <Text style={styles.mascotSubtitle}>Tell us where to find it!</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}>
              {locating ? <ActivityIndicator color="white" /> : <Text style={styles.locationButtonText}>📍 Use My Current Location</Text>}
            </TouchableOpacity>
            {latitude && <View style={styles.locationSet}><Text style={styles.locationSetText}>✅ Location set!</Text></View>}
            <Text style={styles.inputLabel}>Toilet Name</Text>
            <TextInput style={styles.input} placeholder='e.g. "ION Orchard B2 near Uniqlo"' value={toiletName} onChangeText={setToiletName} />
            <Text style={styles.inputLabel}>Address / Postal Code</Text>
            <TextInput style={styles.input} placeholder="e.g. 2 Orchard Turn, Singapore 238801" value={address} onChangeText={setAddress} />
            <TouchableOpacity style={styles.nextButton} onPress={() => {
              if (!toiletName.trim() || !address.trim()) { Alert.alert('Error', 'Please fill in all fields'); return; }
              if (!latitude) { Alert.alert('Error', 'Please use the current location button to set coordinates'); return; }
              setStep(2);
            }}>
              <Text style={styles.nextButtonText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.mascotCard}>
              <Text style={styles.mascotEmoji}>🚽</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.mascotTitle}>Help a buddy out!</Text>
                <Text style={styles.mascotSubtitle}>What's inside this flush factory?</Text>
              </View>
            </View>
            <View style={styles.amenitiesGrid}>
              {AMENITIES.map((a) => (
                <TouchableOpacity key={a.key} style={[styles.amenityCard, amenities[a.key] && styles.amenityCardActive]} onPress={() => setAmenities(prev => ({ ...prev, [a.key]: !prev[a.key] }))}>
                  {amenities[a.key] && <View style={styles.amenityCheck}><Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>✓</Text></View>}
                  <Text style={styles.amenityIcon}>{a.icon}</Text>
                  <Text style={[styles.amenityLabel, amenities[a.key] && styles.amenityLabelActive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
              <Text style={styles.nextButtonText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <View style={styles.mascotCard}>
              <Text style={styles.mascotEmoji}>🚽</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.mascotTitle}>One last thing!</Text>
                <Text style={styles.mascotSubtitle}>Got a photo? (Optional)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.photoPlaceholder} onPress={handlePickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoText}>Tap to add a photo</Text>
                  <Text style={styles.photoSubtext}>Optional — skip if you don't have one</Text>
                </>
              )}
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity style={styles.removePhotoButton} onPress={() => setPhotoUri(null)}>
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting || uploadingPhoto}>
              <Text style={styles.submitButtonText}>{submitting || uploadingPhoto ? 'Submitting...' : '🚽 Submit Loo!'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.skipButtonText}>Skip and submit without photo</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  landing: { flex: 1, backgroundColor: '#f0f4f8', alignItems: 'center', justifyContent: 'center', padding: 32 },
  landingEmoji: { fontSize: 80, marginBottom: 24 },
  landingTitle: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  landingSubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  landingButton: { backgroundColor: '#1a56db', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, shadowColor: '#1a56db', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  landingButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { fontSize: 16, color: '#1a56db', fontWeight: '600' },
  stepText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  progressBar: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginBottom: 24 },
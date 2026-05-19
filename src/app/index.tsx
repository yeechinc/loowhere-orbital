import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../../supabaseConfig";

export default function HomeScreen() {
  const [toilets, setToilets] = useState([]);

  useEffect(() => {
    async function checkUser() {
      await supabase.auth.signOut();
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

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 1.3521,
          longitude: 103.8198,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {toilets.map((toilet) => (
          <Marker
            key={toilet.id}
            coordinate={{
              latitude: toilet.latitude,
              longitude: toilet.longitude,
            }}
            title={toilet.name}
            description={toilet.has_bidet ? "🚿 Has bidet" : "🚽 No bidet"}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },
});

import { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabaseConfig";

export default function LoginScreen({ onSwitchToRegister, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", error.message);
    } else {
      onSuccess();
    }
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/logo_signin.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.subtitle}>Sign in to continue</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSwitchToRegister}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#ffffff" },
  logo: { width: 200, height: 200, alignSelf: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 32 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12 },
  button: { backgroundColor: "#1a56db", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  link: { color: "#1a56db", textAlign: "center", fontSize: 13 },
});

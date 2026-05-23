import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { supabase } from "../../supabaseConfig";
import LoginScreen from "./login";
import RegisterScreen from "./register";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    checkUser();
  }, []);

  if (loading) return null;

  if (!user && showRegister) {
    return (
      <RegisterScreen
        onSwitchToLogin={() => setShowRegister(false)}
        onSuccess={() => setUser(true)}
      />
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onSwitchToRegister={() => setShowRegister(true)}
        onSuccess={() => setUser(true)}
      />
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

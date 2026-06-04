import HomeScreen from '@/app/index';
import ProfileScreen from '@/app/profile';
import AddLooScreen from '@/app/addloo';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ComingSoonScreen({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>🚧</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>{title}</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>Coming soon!</Text>
    </View>
  );
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState('map');

  const renderScreen = () => {
    switch (activeTab) {
      case 'map': return <HomeScreen />;
      case 'saved': return <ComingSoonScreen title="Saved" />;
      case 'addloo': return <AddLooScreen />;
      case 'games': return <ComingSoonScreen title="Games" />;
      case 'profile': return <ProfileScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>

        {/* Saved */}
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('saved')}>
          <View style={[styles.iconWrap, activeTab === 'saved' && styles.iconWrapActive]}>
            <Text style={styles.iconEmoji}>🔖</Text>
          </View>
          <Text style={[styles.label, activeTab === 'saved' && styles.labelActive]}>Saved</Text>
        </TouchableOpacity>

        {/* Add Loo */}
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('addloo')}>
          <View style={[styles.iconWrap, activeTab === 'addloo' && styles.iconWrapActive]}>
            <Text style={styles.iconEmoji}>➕</Text>
          </View>
          <Text style={[styles.label, activeTab === 'addloo' && styles.labelActive]}>Add Loo</Text>
        </TouchableOpacity>

        {/* Map - center raised button */}
        <TouchableOpacity style={styles.addLooTab} onPress={() => setActiveTab('map')}>
          <View style={[styles.addLooButton, activeTab === 'map' && styles.addLooButtonActive]}>
            <Text style={styles.addLooIcon}>🧭</Text>
          </View>
          <Text style={[styles.label, activeTab === 'map' && styles.labelActive]}>Map</Text>
        </TouchableOpacity>

        {/* Games */}
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('games')}>
          <View style={[styles.iconWrap, activeTab === 'games' && styles.iconWrapActive]}>
            <Text style={styles.iconEmoji}>🎮</Text>
          </View>
          <Text style={[styles.label, activeTab === 'games' && styles.labelActive]}>Games</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('profile')}>
          <View style={[styles.iconWrap, activeTab === 'profile' && styles.iconWrapActive]}>
            <Text style={styles.iconEmoji}>👤</Text>
          </View>
          <Text style={[styles.label, activeTab === 'profile' && styles.labelActive]}>Profile</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#eff6ff',
  },
  iconEmoji: { fontSize: 20 },
  label: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  labelActive: { color: '#1a56db', fontWeight: '700' },

  // Map center raised button
  addLooTab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
    marginTop: -20,
  },
  addLooButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a56db',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1a56db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  addLooButtonActive: {
    backgroundColor: '#1240a8',
  },
  addLooIcon: { fontSize: 24 },
});
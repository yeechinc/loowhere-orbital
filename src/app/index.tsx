import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../supabaseConfig';

export default function HomeScreen() {
  const [toilets, setToilets] = useState([]);

  useEffect(() => {
    async function fetchToilets() {
      const { data, error } = await supabase.from('toilets').select('*');
      if (data) {
        setToilets(data);
        console.log('Toilets loaded:', data);
      }
      if (error) console.log('Error:', error);
    }
    fetchToilets();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚽 LooWhere</Text>
      {toilets.map((toilet) => (
        <Text key={toilet.id} style={styles.item}>
          {toilet.has_bidet ? '🚿' : '🚽'} {toilet.name}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  item: { fontSize: 18, marginBottom: 10 },
});
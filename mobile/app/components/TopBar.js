import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../_layout';

export default function TopBar({ title, onMenuPress, rightAction }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { height: 56 + insets.top, paddingTop: insets.top }]}>
      <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
        <View style={styles.hamburger}>
          <View style={styles.bar} />
          <View style={styles.bar} />
          <View style={styles.bar} />
        </View>
      </TouchableOpacity>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.iconButton}>{rightAction || null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hamburger: { width: 20, justifyContent: 'space-between', height: 14 },
  bar: { height: 2, backgroundColor: COLORS.gold, borderRadius: 1 },
  title: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
});

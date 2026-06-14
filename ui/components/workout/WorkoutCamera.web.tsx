import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

interface WorkoutCameraProps {
  style?: StyleProp<ViewStyle>;
  onTrackingStatusChange?: (status: 'camera-unavailable') => void;
}

export default function WorkoutCamera({ style, onTrackingStatusChange }: WorkoutCameraProps) {
  React.useEffect(() => {
    onTrackingStatusChange?.('camera-unavailable');
  }, [onTrackingStatusChange]);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>Mobile camera build required</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '600',
  },
});

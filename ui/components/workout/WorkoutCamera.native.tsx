import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  type CameraPosition,
} from 'react-native-vision-camera';

type TrackingStatus = 'permission-required' | 'camera-unavailable' | 'frame-pipeline-ready';

interface WorkoutCameraProps {
  facing: CameraPosition;
  isActive: boolean;
  style?: StyleProp<ViewStyle>;
  onTrackingStatusChange?: (status: TrackingStatus) => void;
}

export default function WorkoutCamera({
  facing,
  isActive,
  style,
  onTrackingStatusChange,
}: WorkoutCameraProps) {
  const device = useCameraDevice(facing);
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission && canRequestPermission) {
      requestPermission();
    }
  }, [canRequestPermission, hasPermission, requestPermission]);

  useEffect(() => {
    if (!hasPermission) {
      onTrackingStatusChange?.('permission-required');
    } else if (!device) {
      onTrackingStatusChange?.('camera-unavailable');
    } else {
      onTrackingStatusChange?.('frame-pipeline-ready');
    }
  }, [device, hasPermission, onTrackingStatusChange]);

  const frameOutput = useFrameOutput({
    targetResolution: { width: 256, height: 256 },
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    enablePreviewSizedOutputBuffers: true,
    onFrame(frame) {
      'worklet';
      // MediaPipe/TFLite native inference plugs in here. Never count reps without landmarks.
      frame.dispose();
    },
  });

  if (!hasPermission) {
    return (
      <View style={[styles.fallback, style]}>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return <View style={[styles.fallback, style]} />;
  }

  return (
    <Camera
      style={[StyleSheet.absoluteFill, style]}
      device={device}
      isActive={isActive}
      mirrorMode="auto"
      orientationSource="device"
      outputs={[frameOutput]}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

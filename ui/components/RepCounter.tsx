import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface RepCounterProps {
  currentReps: number;
  targetReps: number;
  isActive: boolean;
  onRepComplete?: () => void;
}

export default function RepCounter({ 
  currentReps, 
  targetReps, 
  isActive, 
  onRepComplete 
}: RepCounterProps) {
  const [animatedValue] = useState(new Animated.Value(1));
  const [lastRepCount, setLastRepCount] = useState(currentReps);

  useEffect(() => {
    if (currentReps > lastRepCount) {
      // Animate rep increment
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      setLastRepCount(currentReps);
      
      if (currentReps >= targetReps) {
        onRepComplete?.();
      }
    }
  }, [currentReps, targetReps, lastRepCount, onRepComplete]);

  const progress = Math.min(currentReps / targetReps, 1);
  const isComplete = currentReps >= targetReps;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.counterContainer,
          { transform: [{ scale: animatedValue }] }
        ]}
      >
        <Text style={[styles.repCount, isComplete && styles.repCountComplete]}>
          {currentReps}
        </Text>
        <Text style={styles.repTarget}>/ {targetReps}</Text>
      </Animated.View>
      
      <Text style={styles.repLabel}>Reps</Text>
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: `${progress * 100}%`,
                backgroundColor: isComplete ? '#00C9A7' : '#FF6B35'
              }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      {/* Status Indicator */}
      <View style={[
        styles.statusIndicator,
        { backgroundColor: isActive ? '#00C9A7' : '#666' }
      ]}>
        <Text style={styles.statusText}>
          {isComplete ? 'Complete' : isActive ? 'Tracking' : 'Paused'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  repCount: {
    fontSize: 72,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 72,
  },
  repCountComplete: {
    color: '#00C9A7',
  },
  repTarget: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginLeft: 4,
  },
  repLabel: {
    fontSize: 18,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    width: 40,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
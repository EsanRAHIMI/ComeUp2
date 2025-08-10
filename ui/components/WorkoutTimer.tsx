import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Timer, Play, Pause } from 'lucide-react-native';

interface WorkoutTimerProps {
  isActive: boolean;
  onTimeUpdate?: (seconds: number) => void;
}

export default function WorkoutTimer({ isActive, onTimeUpdate }: WorkoutTimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => {
          const newTime = prev + 1;
          onTimeUpdate?.(newTime);
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, onTimeUpdate]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setSeconds(0);
  };

  return (
    <View style={styles.container}>
      <Timer size={16} color="#fff" />
      <Text style={styles.timeText}>{formatTime(seconds)}</Text>
      {isActive ? (
        <Pause size={14} color="#00C9A7" />
      ) : (
        <Play size={14} color="#666" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
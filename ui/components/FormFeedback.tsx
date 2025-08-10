import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Circle as XCircle } from 'lucide-react-native';

interface FormFeedbackProps {
  score: number;
  feedback: string[];
  isVisible: boolean;
}

export default function FormFeedback({ score, feedback, isVisible }: FormFeedbackProps) {
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#00C9A7';
    if (score >= 75) return '#FFD93D';
    return '#FF4757';
  };

  const getScoreIcon = (score: number) => {
    const color = getScoreColor(score);
    if (score >= 90) return <CheckCircle size={20} color={color} />;
    if (score >= 75) return <AlertTriangle size={20} color={color} />;
    return <XCircle size={20} color={color} />;
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Work';
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        }
      ]}
    >
      <View style={styles.scoreContainer}>
        {getScoreIcon(score)}
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreLabel}>{getScoreLabel(score)}</Text>
          <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
            {score}%
          </Text>
        </View>
      </View>

      {feedback.length > 0 && (
        <View style={styles.feedbackContainer}>
          {feedback.slice(0, 2).map((item, index) => (
            <Text key={index} style={styles.feedbackText}>
              • {item}
            </Text>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 16,
    margin: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreInfo: {
    marginLeft: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  feedbackContainer: {
    gap: 4,
  },
  feedbackText: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
});
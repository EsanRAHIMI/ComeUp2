import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Play, 
  Calendar, 
  Target, 
  Zap, 
  Trophy,
  Clock,
  Flame,
  Activity,
  TrendingUp
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface WorkoutSummary {
  completed: number;
  streak: number;
  calories: number;
  duration: string;
}

interface TodayWorkout {
  name: string;
  exercises: number;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export default function HomeScreen() {
  const [summary, setSummary] = useState<WorkoutSummary>({
    completed: 24,
    streak: 7,
    calories: 2850,
    duration: '180'
  });

  const [todayWorkout] = useState<TodayWorkout>({
    name: 'Upper Body Strength',
    exercises: 8,
    duration: '45',
    difficulty: 'Intermediate'
  });

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const handleStartWorkout = () => {
    router.push('/workout');
  };

  const StatCard = ({ icon: Icon, title, value, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Icon size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>Ready to ComeUp?</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Activity size={24} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        {/* Today's Workout Card */}
        <LinearGradient
          colors={['#FF6B35', '#FF8A65']}
          style={styles.workoutCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.workoutCardContent}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Today's Workout</Text>
              <Text style={styles.workoutName}>{todayWorkout.name}</Text>
              <View style={styles.workoutDetails}>
                <View style={styles.workoutDetail}>
                  <Target size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.workoutDetailText}>{todayWorkout.exercises} exercises</Text>
                </View>
                <View style={styles.workoutDetail}>
                  <Clock size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.workoutDetailText}>{todayWorkout.duration} min</Text>
                </View>
                <View style={styles.workoutDetail}>
                  <Zap size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.workoutDetailText}>{todayWorkout.difficulty}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStartWorkout}
            >
              <Play size={24} color="#FF6B35" fill="#FF6B35" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              icon={Trophy}
              title="Workouts"
              value={summary.completed}
              color="#00C9A7"
            />
            <StatCard 
              icon={Flame}
              title="Day Streak"
              value={summary.streak}
              color="#FF4757"
            />
            <StatCard 
              icon={Zap}
              title="Calories"
              value={summary.calories}
              color="#FFD93D"
            />
            <StatCard 
              icon={Clock}
              title="Minutes"
              value={summary.duration}
              color="#6C5CE7"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/programs')}
            >
              <Calendar size={20} color="#FF6B35" />
              <Text style={styles.actionButtonText}>View Programs</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/progress')}
            >
              <TrendingUp size={20} color="#FF6B35" />
              <Text style={styles.actionButtonText}>Check Progress</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Zap size={20} color="#00C9A7" />
              <Text style={styles.insightTitle}>Performance Analysis</Text>
            </View>
            <Text style={styles.insightText}>
              Your squat form has improved 15% this week! Keep focusing on depth and knee alignment for optimal results.
            </Text>
          </View>
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Target size={20} color="#FFD93D" />
              <Text style={styles.insightTitle}>Recommendation</Text>
            </View>
            <Text style={styles.insightText}>
              Consider adding 5 more minutes to your rest periods between heavy sets to maximize strength gains.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  workoutCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  workoutCardContent: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  workoutName: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 12,
  },
  workoutDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutDetailText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  startButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  insightsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  insightCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  insightText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
});
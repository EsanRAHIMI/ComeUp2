import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  TrendingUp, 
  Calendar,
  Award,
  Flame,
  Clock,
  Target,
  Activity,
  ChevronRight
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ProgressStats {
  totalWorkouts: number;
  totalMinutes: number;
  currentStreak: number;
  caloriesBurned: number;
  averageFormScore: number;
  weeklyProgress: number[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  date?: string;
}

interface WorkoutHistory {
  id: string;
  name: string;
  date: string;
  duration: number;
  exercisesCompleted: number;
  formScore: number;
  caloriesBurned: number;
}

export default function ProgressScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  
  const [stats] = useState<ProgressStats>({
    totalWorkouts: 47,
    totalMinutes: 2580,
    currentStreak: 12,
    caloriesBurned: 8420,
    averageFormScore: 92,
    weeklyProgress: [85, 88, 92, 89, 95, 91, 94],
  });

  const [achievements] = useState<Achievement[]>([
    { id: '1', title: 'First Steps', description: 'Complete your first workout', icon: '🎯', unlocked: true, date: '2024-01-15' },
    { id: '2', title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', unlocked: true, date: '2024-02-01' },
    { id: '3', title: 'Form Master', description: 'Achieve 95% form accuracy', icon: '⭐', unlocked: true, date: '2024-02-10' },
    { id: '4', title: 'Century Club', description: 'Complete 100 workouts', icon: '💯', unlocked: false },
  ]);

  const [recentWorkouts] = useState<WorkoutHistory[]>([
    { 
      id: '1', 
      name: 'Upper Body Strength', 
      date: '2024-02-15', 
      duration: 45, 
      exercisesCompleted: 8, 
      formScore: 94, 
      caloriesBurned: 280 
    },
    { 
      id: '2', 
      name: 'Lower Body Power', 
      date: '2024-02-13', 
      duration: 50, 
      exercisesCompleted: 6, 
      formScore: 89, 
      caloriesBurned: 320 
    },
    { 
      id: '3', 
      name: 'Full Body HIIT', 
      date: '2024-02-11', 
      duration: 35, 
      exercisesCompleted: 10, 
      formScore: 96, 
      caloriesBurned: 380 
    },
  ]);

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: any) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Icon size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PeriodButton = ({ period, label }: { period: string; label: string }) => (
    <TouchableOpacity 
      style={[
        styles.periodButton, 
        selectedPeriod === period && styles.periodButtonActive
      ]}
      onPress={() => setSelectedPeriod(period as any)}
    >
      <Text style={[
        styles.periodButtonText,
        selectedPeriod === period && styles.periodButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <PeriodButton period="week" label="Week" />
          <PeriodButton period="month" label="Month" />
          <PeriodButton period="year" label="Year" />
        </View>

        {/* Main Stats */}
        <View style={styles.statsGrid}>
          <StatCard 
            icon={Activity}
            title="Workouts"
            value={stats.totalWorkouts}
            subtitle="completed"
            color="#00C9A7"
          />
          <StatCard 
            icon={Clock}
            title="Total Time"
            value={`${Math.floor(stats.totalMinutes / 60)}h`}
            subtitle={`${stats.totalMinutes % 60}m`}
            color="#6C5CE7"
          />
          <StatCard 
            icon={Flame}
            title="Streak"
            value={`${stats.currentStreak} days`}
            subtitle="current"
            color="#FF4757"
          />
          <StatCard 
            icon={TrendingUp}
            title="Form Score"
            value={`${stats.averageFormScore}%`}
            subtitle="average"
            color="#FFD93D"
          />
        </View>

        {/* Weekly Progress Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Weekly Form Scores</Text>
          <View style={styles.chart}>
            {stats.weeklyProgress.map((score, index) => (
              <View key={index} style={styles.chartBar}>
                <View 
                  style={[
                    styles.chartBarFill,
                    { 
                      height: `${score}%`,
                      backgroundColor: score >= 90 ? '#00C9A7' : score >= 80 ? '#FFD93D' : '#FF4757'
                    }
                  ]}
                />
                <Text style={styles.chartLabel}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <TouchableOpacity>
              <ChevronRight size={20} color="#FF6B35" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.achievementsList}>
              {achievements.map(achievement => (
                <View 
                  key={achievement.id} 
                  style={[
                    styles.achievementCard,
                    !achievement.unlocked && styles.achievementCardLocked
                  ]}
                >
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={[
                    styles.achievementTitle,
                    !achievement.unlocked && styles.achievementTitleLocked
                  ]}>
                    {achievement.title}
                  </Text>
                  <Text style={[
                    styles.achievementDescription,
                    !achievement.unlocked && styles.achievementDescriptionLocked
                  ]}>
                    {achievement.description}
                  </Text>
                  {achievement.unlocked && achievement.date && (
                    <Text style={styles.achievementDate}>
                      Unlocked {new Date(achievement.date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Recent Workouts */}
        <View style={styles.historyContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            <TouchableOpacity>
              <ChevronRight size={20} color="#FF6B35" />
            </TouchableOpacity>
          </View>
          {recentWorkouts.map(workout => (
            <View key={workout.id} style={styles.historyCard}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{workout.name}</Text>
                <Text style={styles.historyDate}>
                  {new Date(workout.date).toLocaleDateString()}
                </Text>
                <View style={styles.historyStats}>
                  <Text style={styles.historyStat}>{workout.duration}min</Text>
                  <Text style={styles.historyStat}>•</Text>
                  <Text style={styles.historyStat}>{workout.exercisesCompleted} exercises</Text>
                  <Text style={styles.historyStat}>•</Text>
                  <Text style={styles.historyStat}>{workout.caloriesBurned} cal</Text>
                </View>
              </View>
              <View style={styles.formScoreContainer}>
                <Text style={styles.formScoreLabel}>Form</Text>
                <Text style={[
                  styles.formScore,
                  { color: workout.formScore >= 90 ? '#00C9A7' : workout.formScore >= 80 ? '#FFD93D' : '#FF4757' }
                ]}>
                  {workout.formScore}%
                </Text>
              </View>
            </View>
          ))}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  periodButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  periodButtonText: {
    color: '#999',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  chartBar: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  achievementsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  achievementsList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  achievementCard: {
    width: 140,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  achievementCardLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: '#666',
  },
  achievementDescription: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 14,
  },
  achievementDescriptionLocked: {
    color: '#555',
  },
  achievementDate: {
    fontSize: 10,
    color: '#00C9A7',
    marginTop: 4,
    textAlign: 'center',
  },
  historyContainer: {
    paddingBottom: 20,
  },
  historyCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 8,
  },
  historyStat: {
    fontSize: 12,
    color: '#666',
  },
  formScoreContainer: {
    alignItems: 'center',
  },
  formScoreLabel: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  formScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
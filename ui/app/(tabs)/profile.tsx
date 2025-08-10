import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, Target, Volume2, Camera, Bell, CircleHelp as HelpCircle, LogOut, ChevronRight, CreditCard as Edit3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  name: string;
  age: number;
  height: number; // cm
  weight: number; // kg
  goal: 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  workoutDays: number;
}

interface Settings {
  voiceFeedback: boolean;
  formCorrection: boolean;
  notifications: boolean;
  autoRest: boolean;
  coachMode: boolean;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Alex Johnson',
    age: 28,
    height: 175,
    weight: 70,
    goal: 'Muscle Gain',
    fitnessLevel: 'Intermediate',
    workoutDays: 4,
  });

  const [settings, setSettings] = useState<Settings>({
    voiceFeedback: true,
    formCorrection: true,
    notifications: true,
    autoRest: true,
    coachMode: false,
  });

  const [isEditing, setIsEditing] = useState(false);

  const updateSetting = (key: keyof Settings) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: !prev[key] };
      
      // Save coach mode to AsyncStorage
      if (key === 'coachMode') {
        AsyncStorage.setItem('coachMode', newSettings.coachMode.toString()).catch(console.error);
      }
      
      return newSettings;
    });
  };

  const ProfileCard = () => (
    <LinearGradient
      colors={['#FF6B35', '#FF8A65']}
      style={styles.profileCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.profileContent}>
        <View style={styles.avatarContainer}>
          <User size={32} color="#fff" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileGoal}>{profile.goal} • {profile.fitnessLevel}</Text>
          <Text style={styles.profileStats}>
            {profile.age} years • {profile.height}cm • {profile.weight}kg
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editProfileButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Edit3 size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    value, 
    onToggle, 
    showArrow = false 
  }: any) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Icon size={20} color="#FF6B35" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {onToggle ? (
        <Switch 
          value={value} 
          onValueChange={onToggle}
          trackColor={{ false: '#333', true: '#FF6B35' }}
          thumbColor="#fff"
        />
      ) : showArrow ? (
        <ChevronRight size={20} color="#666" />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={20} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileCard />

        {isEditing && (
          <View style={styles.editContainer}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goal</Text>
              <View style={styles.goalSelector}>
                {['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength'].map(goal => (
                  <TouchableOpacity 
                    key={goal}
                    style={[
                      styles.goalOption,
                      profile.goal === goal && styles.goalOptionActive
                    ]}
                    onPress={() => setProfile(prev => ({ ...prev, goal: goal as any }))}
                  >
                    <Text style={[
                      styles.goalOptionText,
                      profile.goal === goal && styles.goalOptionTextActive
                    ]}>
                      {goal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* AI Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>AI & Feedback</Text>
          <SettingItem 
            icon={User}
            title="Coach Mode"
            subtitle="Access exercise database management tools"
            value={settings.coachMode}
            onToggle={() => updateSetting('coachMode')}
          />
          <SettingItem 
            icon={Volume2}
            title="Voice Feedback"
            subtitle="Real-time coaching during workouts"
            value={settings.voiceFeedback}
            onToggle={() => updateSetting('voiceFeedback')}
          />
          <SettingItem 
            icon={Camera}
            title="Form Correction"
            subtitle="AI-powered movement analysis"
            value={settings.formCorrection}
            onToggle={() => updateSetting('formCorrection')}
          />
          <SettingItem 
            icon={Target}
            title="Auto Rest Timer"
            subtitle="Automatic rest period management"
            value={settings.autoRest}
            onToggle={() => updateSetting('autoRest')}
          />
        </View>

        {/* General Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>General</Text>
          <SettingItem 
            icon={Bell}
            title="Notifications"
            subtitle="Workout reminders and progress updates"
            value={settings.notifications}
            onToggle={() => updateSetting('notifications')}
          />
          <SettingItem 
            icon={HelpCircle}
            title="Help & Support"
            showArrow={true}
          />
          <SettingItem 
            icon={LogOut}
            title="Sign Out"
            showArrow={true}
          />
        </View>

        {/* AI Recommendations */}
        <View style={styles.recommendationsContainer}>
          <Text style={styles.sectionTitle}>AI Recommendations</Text>
          <View style={styles.recommendationCard}>
            <Target size={20} color="#00C9A7" />
            <View style={styles.recommendationText}>
              <Text style={styles.recommendationTitle}>Optimize Recovery</Text>
              <Text style={styles.recommendationDescription}>
                Based on your recent workouts, consider adding a dedicated recovery day between intense sessions.
              </Text>
            </View>
          </View>
          <View style={styles.recommendationCard}>
            <Target size={20} color="#FFD93D" />
            <View style={styles.recommendationText}>
              <Text style={styles.recommendationTitle}>Nutrition Focus</Text>
              <Text style={styles.recommendationDescription}>
                Your muscle gain goal suggests increasing protein intake to 2.2g per kg of body weight.
              </Text>
            </View>
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
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  profileContent: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileGoal: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  profileStats: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  goalSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  goalOptionActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  goalOptionText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  goalOptionTextActive: {
    color: '#fff',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 1,
    borderWidth: 1,
    borderColor: '#333',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  recommendationsContainer: {
    marginBottom: 20,
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'flex-start',
  },
  recommendationText: {
    marginLeft: 12,
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
});
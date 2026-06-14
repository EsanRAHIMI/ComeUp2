import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, CreditCard as Edit3, Trash2, Calendar, Download, Clock, Target, Zap, CircleCheck as CheckCircle, X, Search, Share2, QrCode, Copy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { exerciseDatabase, ExerciseTemplate } from '../../services/exerciseDatabase';
import { programSharingService } from '../../services/programSharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const createClientId = () => Date.now().toString();

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restTime: number;
  instructions: string;
  videoUrl: string;
  muscleGroups: string[];
}

interface WorkoutProgram {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number;
  exercises: Exercise[];
  isActive: boolean;
  daysPerWeek: number;
  tags: string[];
  shareCode?: string;
}

export default function ProgramsScreen() {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([
    {
      id: '1',
      name: 'Upper Body Strength',
      description: 'Build upper body strength with bodyweight exercises',
      difficulty: 'Intermediate',
      duration: 45,
      exercises: [
        { 
          id: '1', 
          name: 'Push-ups', 
          sets: 3, 
          reps: 12, 
          restTime: 60,
          instructions: 'Keep your body straight, lower chest to ground, push back up',
          videoUrl: 'youtube.com/watch?v=bQvuy5f5j-8',
          muscleGroups: ['chest', 'triceps', 'shoulders']
        },
        { 
          id: '2', 
          name: 'Diamond Push-ups', 
          sets: 3, 
          reps: 8, 
          restTime: 90,
          instructions: 'Form diamond shape with hands, perform push-up',
          videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
          muscleGroups: ['triceps', 'chest']
        },
      ],
      isActive: true,
      daysPerWeek: 3,
      tags: ['strength', 'upper-body', 'bodyweight'],
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null>(null);
  const [selectedProgramForShare, setSelectedProgramForShare] = useState<WorkoutProgram | null>(null);
  
  // Form states
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programDifficulty, setProgramDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [programDaysPerWeek, setProgramDaysPerWeek] = useState(3);
  const [programTags, setProgramTags] = useState('');
  const [programExercises, setProgramExercises] = useState<Exercise[]>([]);
  
  // Exercise search states
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [availableExercises, setAvailableExercises] = useState<ExerciseTemplate[]>(exerciseDatabase.getAllExercises());
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  
  // Import states
  const [importCode, setImportCode] = useState('');

  // Coach mode states
  const [showCoachPanel, setShowCoachPanel] = useState(false);
  const [showExerciseEditor, setShowExerciseEditor] = useState(false);
  const [editingExerciseTemplate, setEditingExerciseTemplate] = useState<ExerciseTemplate | null>(null);
  const [isCoachMode, setIsCoachMode] = useState(false);
  
  // Exercise template form states
  const [exerciseTemplateName, setExerciseTemplateName] = useState('');
  const [exerciseTemplateCategory, setExerciseTemplateCategory] = useState<'Strength' | 'Cardio' | 'Flexibility' | 'Balance'>('Strength');
  const [exerciseTemplateMuscleGroups, setExerciseTemplateMuscleGroups] = useState('');
  const [exerciseTemplateDifficulty, setExerciseTemplateDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [exerciseTemplateEquipment, setExerciseTemplateEquipment] = useState('');
  const [exerciseTemplateDefaultSets, setExerciseTemplateDefaultSets] = useState(3);
  const [exerciseTemplateDefaultReps, setExerciseTemplateDefaultReps] = useState(12);
  const [exerciseTemplateDefaultRestTime, setExerciseTemplateDefaultRestTime] = useState(60);
  const [exerciseTemplateInstructions, setExerciseTemplateInstructions] = useState('');
  const [exerciseTemplateVideoUrl, setExerciseTemplateVideoUrl] = useState('');
  const [exerciseTemplateThumbnailUrl, setExerciseTemplateThumbnailUrl] = useState('');
  const [exerciseTemplateTrackingType, setExerciseTemplateTrackingType] = useState<'reps' | 'time'>('reps');
  const [exerciseTemplateTips, setExerciseTemplateTips] = useState('');
  const [exerciseTemplateCommonMistakes, setExerciseTemplateCommonMistakes] = useState('');

  // Load coach mode setting on component mount
  useEffect(() => {
    const loadCoachMode = async () => {
      try {
        const coachModeValue = await AsyncStorage.getItem('coachMode');
        setIsCoachMode(coachModeValue === 'true');
      } catch (error) {
        console.log('Error loading coach mode:', error);
      }
    };
    loadCoachMode();
  }, []);

  // Listen for coach mode changes
  useEffect(() => {
    const checkCoachMode = async () => {
      try {
        const coachModeValue = await AsyncStorage.getItem('coachMode');
        setIsCoachMode(coachModeValue === 'true');
      } catch (error) {
        console.log('Error checking coach mode:', error);
      }
    };
    
    // Check coach mode when screen comes into focus
    const interval = setInterval(checkCoachMode, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleActivateProgram = (programId: string) => {
    setPrograms(prev => prev.map(program => ({
      ...program,
      isActive: program.id === programId
    })));
  };

  const handleDeleteProgram = (programId: string) => {
    Alert.alert(
      'Delete Program',
      'Are you sure you want to delete this program?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => setPrograms(prev => prev.filter(program => program.id !== programId))
        }
      ]
    );
  };

  const handleCreateProgram = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEditProgram = (program: WorkoutProgram) => {
    setProgramName(program.name);
    setProgramDescription(program.description);
    setProgramDifficulty(program.difficulty);
    setProgramDaysPerWeek(program.daysPerWeek);
    setProgramTags(program.tags.join(', '));
    setProgramExercises([...program.exercises]);
    setEditingProgram(program);
    setShowCreateModal(true);
  };

  const handleSaveProgram = () => {
    if (!programName.trim()) {
      Alert.alert('Error', 'Please enter a program name');
      return;
    }

    if (programExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    const estimatedDuration = programExercises.reduce((total, exercise) => {
      return total + (exercise.sets * (exercise.reps * 3 + exercise.restTime));
    }, 0) / 60;

    const newProgram: WorkoutProgram = {
      id: editingProgram?.id || createClientId(),
      name: programName,
      description: programDescription,
      difficulty: programDifficulty,
      duration: Math.round(estimatedDuration),
      exercises: programExercises,
      isActive: editingProgram?.isActive || false,
      daysPerWeek: programDaysPerWeek,
      tags: programTags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };

    if (editingProgram) {
      setPrograms(prev => prev.map(p => p.id === editingProgram.id ? newProgram : p));
    } else {
      setPrograms(prev => [...prev, newProgram]);
    }

    setShowCreateModal(false);
    resetForm();
  };

  const resetForm = () => {
    setProgramName('');
    setProgramDescription('');
    setProgramDifficulty('Beginner');
    setProgramDaysPerWeek(3);
    setProgramTags('');
    setProgramExercises([]);
    setEditingProgram(null);
  };

  const handleSearchExercises = (query: string) => {
    setExerciseSearchQuery(query);
    const results = exerciseDatabase.searchExercises(query);
    setAvailableExercises(results);
  };

  const handleAddExercise = (exerciseTemplate: ExerciseTemplate) => {
    const newExercise: Exercise = {
      id: createClientId(),
      name: exerciseTemplate.name,
      sets: exerciseTemplate.defaultSets,
      reps: exerciseTemplate.defaultReps,
      restTime: exerciseTemplate.defaultRestTime,
      instructions: exerciseTemplate.instructions,
      videoUrl: exerciseTemplate.videoUrl,
      muscleGroups: exerciseTemplate.muscleGroups,
    };

    setProgramExercises(prev => [...prev, newExercise]);
    setShowExerciseSelector(false);
    setExerciseSearchQuery('');
    setAvailableExercises(exerciseDatabase.getAllExercises());
  };

  const handleEditExercise = (index: number, field: keyof Exercise, value: any) => {
    setProgramExercises(prev => prev.map((exercise, i) => 
      i === index ? { ...exercise, [field]: value } : exercise
    ));
  };

  const handleRemoveExercise = (index: number) => {
    setProgramExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleShareProgram = (program: WorkoutProgram) => {
    setSelectedProgramForShare(program);
    setShowShareModal(true);
  };

  const handleGenerateShareCode = async () => {
    if (!selectedProgramForShare) return;

    try {
      const shareCode = programSharingService.shareProgram(selectedProgramForShare, 'current-user');
      
      // Update program with share code
      setPrograms(prev => prev.map(p => 
        p.id === selectedProgramForShare.id ? { ...p, shareCode } : p
      ));

      Alert.alert(
        'Program Shared!',
        `Share code: ${shareCode}\n\nOthers can import this program using this code.`,
        [
          { text: 'Copy Code', onPress: () => copyToClipboard(shareCode) },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to share program');
    }
  };

  const handleImportProgram = () => {
    if (!importCode.trim()) {
      Alert.alert('Error', 'Please enter a share code');
      return;
    }

    try {
      const importedProgram = programSharingService.importProgram(importCode.trim());
      if (importedProgram) {
        setPrograms(prev => [...prev, importedProgram]);
        setShowImportModal(false);
        setImportCode('');
        Alert.alert('Success', `Program "${importedProgram.name}" imported successfully!`);
      } else {
        Alert.alert('Error', 'Invalid share code or program not found');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import program');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      // In a real app, you'd use Clipboard from @react-native-clipboard/clipboard
      console.log('Copied to clipboard:', text);
      Alert.alert('Copied', 'Share code copied to clipboard');
    } catch (error) {
      console.log('Failed to copy:', error);
    }
  };

  const shareViaSystem = async (shareCode: string) => {
    try {
      await Share.share({
        message: `Check out my workout program! Import it using code: ${shareCode} in the ComeUp app.`,
        title: 'Workout Program Share',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleCreateExerciseTemplate = () => {
    resetExerciseTemplateForm();
    setShowExerciseEditor(true);
  };

  const handleEditExerciseTemplate = (template: ExerciseTemplate) => {
    setExerciseTemplateName(template.name);
    setExerciseTemplateCategory(template.category);
    setExerciseTemplateMuscleGroups(template.muscleGroups.join(', '));
    setExerciseTemplateDifficulty(template.difficulty);
    setExerciseTemplateEquipment(template.equipment.join(', '));
    setExerciseTemplateDefaultSets(template.defaultSets);
    setExerciseTemplateDefaultReps(template.defaultReps);
    setExerciseTemplateDefaultRestTime(template.defaultRestTime);
    setExerciseTemplateInstructions(template.instructions);
    setExerciseTemplateVideoUrl(template.videoUrl);
    setExerciseTemplateThumbnailUrl(template.thumbnailUrl);
    setExerciseTemplateTrackingType(template.trackingType || 'reps');
    setExerciseTemplateTips(template.tips.join('\n'));
    setExerciseTemplateCommonMistakes(template.commonMistakes.join('\n'));
    setEditingExerciseTemplate(template);
    setShowExerciseEditor(true);
  };

  const handleSaveExerciseTemplate = () => {
    if (!exerciseTemplateName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    const exerciseTemplate: ExerciseTemplate = {
      id: editingExerciseTemplate?.id || exerciseTemplateName.toLowerCase().replace(/\s+/g, '-'),
      name: exerciseTemplateName,
      category: exerciseTemplateCategory,
      muscleGroups: exerciseTemplateMuscleGroups.split(',').map(group => group.trim()).filter(group => group),
      difficulty: exerciseTemplateDifficulty,
      equipment: exerciseTemplateEquipment.split(',').map(eq => eq.trim()).filter(eq => eq),
      defaultSets: exerciseTemplateDefaultSets,
      defaultReps: exerciseTemplateDefaultReps,
      defaultRestTime: exerciseTemplateDefaultRestTime,
      instructions: exerciseTemplateInstructions,
      videoUrl: exerciseTemplateVideoUrl,
      thumbnailUrl: exerciseTemplateThumbnailUrl,
      trackingType: exerciseTemplateTrackingType,
      tips: exerciseTemplateTips.split('\n').map(tip => tip.trim()).filter(tip => tip),
      commonMistakes: exerciseTemplateCommonMistakes.split('\n').map(mistake => mistake.trim()).filter(mistake => mistake),
    };

    if (editingExerciseTemplate) {
      exerciseDatabase.updateExercise(exerciseTemplate);
    } else {
      exerciseDatabase.addExercise(exerciseTemplate);
    }

    setAvailableExercises(exerciseDatabase.getAllExercises());
    setShowExerciseEditor(false);
    resetExerciseTemplateForm();
    Alert.alert('Success', `Exercise ${editingExerciseTemplate ? 'updated' : 'created'} successfully!`);
  };

  const handleDeleteExerciseTemplate = (exerciseId: string) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise from the database?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            exerciseDatabase.deleteExercise(exerciseId);
            setAvailableExercises(exerciseDatabase.getAllExercises());
            Alert.alert('Success', 'Exercise deleted successfully!');
          }
        }
      ]
    );
  };

  const resetExerciseTemplateForm = () => {
    setExerciseTemplateName('');
    setExerciseTemplateCategory('Strength');
    setExerciseTemplateMuscleGroups('');
    setExerciseTemplateDifficulty('Beginner');
    setExerciseTemplateEquipment('');
    setExerciseTemplateDefaultSets(3);
    setExerciseTemplateDefaultReps(12);
    setExerciseTemplateDefaultRestTime(60);
    setExerciseTemplateInstructions('');
    setExerciseTemplateVideoUrl('');
    setExerciseTemplateThumbnailUrl('');
    setExerciseTemplateTrackingType('reps');
    setExerciseTemplateTips('');
    setExerciseTemplateCommonMistakes('');
    setEditingExerciseTemplate(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return '#00C9A7';
      case 'Intermediate': return '#FFD93D';
      case 'Advanced': return '#FF4757';
      default: return '#666';
    }
  };

  const ProgramCard = ({ program }: { program: WorkoutProgram }) => (
    <View style={styles.programCard}>
      <View style={styles.programHeader}>
        <View style={styles.programInfo}>
          <Text style={styles.programName}>{program.name}</Text>
          <Text style={styles.programDescription}>{program.description}</Text>
          <View style={styles.programMeta}>
            <View style={styles.metaItem}>
              <Clock size={14} color="#999" />
              <Text style={styles.metaText}>{program.duration} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Target size={14} color="#999" />
              <Text style={styles.metaText}>{program.exercises.length} exercises</Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={14} color="#999" />
              <Text style={styles.metaText}>{program.daysPerWeek}x/week</Text>
            </View>
          </View>
          <View style={styles.tagsContainer}>
            {program.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(program.difficulty) }]}>
            <Text style={styles.difficultyText}>{program.difficulty}</Text>
          </View>
        </View>
        
        {program.isActive && (
          <View style={styles.activeIndicator}>
            <CheckCircle size={20} color="#00C9A7" />
          </View>
        )}
      </View>

      <View style={styles.exerciseList}>
        {program.exercises.slice(0, 3).map((exercise, index) => (
          <Text key={exercise.id} style={styles.exerciseItem}>
            {index + 1}. {exercise.name} ({exercise.sets}x{exercise.reps})
          </Text>
        ))}
        {program.exercises.length > 3 && (
          <Text style={styles.moreExercises}>
            +{program.exercises.length - 3} more exercises
          </Text>
        )}
      </View>

      <View style={styles.programActions}>
        {!program.isActive && (
          <TouchableOpacity 
            style={styles.activateButton}
            onPress={() => handleActivateProgram(program.id)}
          >
            <Text style={styles.activateButtonText}>Activate</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => handleShareProgram(program)}
        >
          <Share2 size={16} color="#00C9A7" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => handleEditProgram(program)}
        >
          <Edit3 size={16} color="#FF6B35" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteProgram(program.id)}
        >
          <Trash2 size={16} color="#FF4757" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ExerciseItem = ({ exercise, index }: { exercise: Exercise; index: number }) => (
    <View style={styles.exerciseEditItem}>
      <View style={styles.exerciseEditHeader}>
        <Text style={styles.exerciseEditName}>{exercise.name}</Text>
        <TouchableOpacity 
          style={styles.removeExerciseButton}
          onPress={() => handleRemoveExercise(index)}
        >
          <X size={16} color="#FF4757" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.exerciseEditControls}>
        <View style={styles.exerciseControl}>
          <Text style={styles.exerciseControlLabel}>Sets</Text>
          <TextInput
            style={styles.exerciseControlInput}
            value={exercise.sets.toString()}
            onChangeText={(text) => handleEditExercise(index, 'sets', parseInt(text) || 1)}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>
        
        <View style={styles.exerciseControl}>
          <Text style={styles.exerciseControlLabel}>Reps</Text>
          <TextInput
            style={styles.exerciseControlInput}
            value={exercise.reps.toString()}
            onChangeText={(text) => handleEditExercise(index, 'reps', parseInt(text) || 1)}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
        
        <View style={styles.exerciseControl}>
          <Text style={styles.exerciseControlLabel}>Rest (s)</Text>
          <TextInput
            style={styles.exerciseControlInput}
            value={exercise.restTime.toString()}
            onChangeText={(text) => handleEditExercise(index, 'restTime', parseInt(text) || 30)}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
      </View>
      
      <Text style={styles.exerciseInstructions}>{exercise.instructions}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Programs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.importButton}
            onPress={() => setShowImportModal(true)}
          >
            <Download size={20} color="#00C9A7" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateProgram}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Coach Mode Panel */}
        {isCoachMode && (
          <View style={styles.coachPanel}>
            <Text style={styles.coachPanelTitle}>Coach Mode Active</Text>
            <Text style={styles.coachPanelSubtext}>
              You can now create and edit exercise templates in the database.
            </Text>
            <View style={styles.coachActions}>
              <TouchableOpacity 
                style={styles.coachButton}
                onPress={handleCreateExerciseTemplate}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.coachButtonText}>New Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.coachButton, styles.coachButtonSecondary]}
                onPress={() => setShowCoachPanel(!showCoachPanel)}
              >
                <Text style={[styles.coachButtonText, styles.coachButtonTextSecondary]}>
                  {showCoachPanel ? 'Hide' : 'Manage'} Database
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Coach Exercise Database Management */}
        {isCoachMode && showCoachPanel && (
          <View style={styles.programsContainer}>
            <Text style={styles.sectionTitle}>Exercise Database</Text>
            {availableExercises.map(exercise => (
              <View key={exercise.id} style={styles.coachExerciseItem}>
                <View style={styles.coachExerciseInfo}>
                  <Text style={styles.coachExerciseName}>{exercise.name}</Text>
                  <Text style={styles.coachExerciseMeta}>
                    {exercise.defaultSets}x{exercise.defaultReps} • {exercise.category} • {exercise.difficulty}
                  </Text>
                  <Text style={styles.coachExerciseMuscles}>
                    {exercise.muscleGroups.join(', ')}
                  </Text>
                </View>
                <View style={styles.coachExerciseActions}>
                  <TouchableOpacity 
                    style={styles.coachEditButton}
                    onPress={() => handleEditExerciseTemplate(exercise)}
                  >
                    <Edit3 size={14} color="#FF6B35" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.coachDeleteButton}
                    onPress={() => handleDeleteExerciseTemplate(exercise.id)}
                  >
                    <Trash2 size={14} color="#FF4757" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.programsContainer}>
          {programs.map(program => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </View>

        {/* AI Generate New Program */}
        <LinearGradient
          colors={['#FF6B35', '#FF8A65']}
          style={styles.aiGenerateCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.aiGenerateContent}>
            <Zap size={32} color="#fff" />
            <Text style={styles.aiGenerateTitle}>Generate New Program</Text>
            <Text style={styles.aiGenerateSubtext}>
              Let AI create a personalized workout plan based on your goals and progress
            </Text>
            <TouchableOpacity style={styles.aiGenerateButton}>
              <Text style={styles.aiGenerateButtonText}>Create with AI</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Create/Edit Program Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingProgram ? 'Edit Program' : 'Create Program'}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Program Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter program name..."
                placeholderTextColor="#666"
                value={programName}
                onChangeText={setProgramName}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe your program..."
                placeholderTextColor="#666"
                value={programDescription}
                onChangeText={setProgramDescription}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Difficulty Level</Text>
              <View style={styles.difficultySelector}>
                {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                  <TouchableOpacity 
                    key={level}
                    style={[
                      styles.difficultyOption,
                      { backgroundColor: getDifficultyColor(level) },
                      programDifficulty === level && styles.difficultyOptionActive
                    ]}
                    onPress={() => setProgramDifficulty(level as any)}
                  >
                    <Text style={styles.difficultyOptionText}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Days per Week</Text>
              <View style={styles.daysSelector}>
                {[1, 2, 3, 4, 5, 6, 7].map(days => (
                  <TouchableOpacity 
                    key={days}
                    style={[
                      styles.dayOption,
                      programDaysPerWeek === days && styles.dayOptionActive
                    ]}
                    onPress={() => setProgramDaysPerWeek(days)}
                  >
                    <Text style={[
                      styles.dayOptionText,
                      programDaysPerWeek === days && styles.dayOptionTextActive
                    ]}>
                      {days}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tags (comma separated)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. strength, cardio, beginner..."
                placeholderTextColor="#666"
                value={programTags}
                onChangeText={setProgramTags}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.exercisesHeader}>
                <Text style={styles.inputLabel}>Exercises ({programExercises.length})</Text>
                <TouchableOpacity 
                  style={styles.addExerciseButton}
                  onPress={() => setShowExerciseSelector(true)}
                >
                  <Plus size={16} color="#FF6B35" />
                  <Text style={styles.addExerciseText}>Add Exercise</Text>
                </TouchableOpacity>
              </View>
              
              {programExercises.map((exercise, index) => (
                <ExerciseItem key={exercise.id} exercise={exercise} index={index} />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveProgram}
              >
                <Text style={styles.saveButtonText}>
                  {editingProgram ? 'Update Program' : 'Create Program'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Exercise Selector Modal */}
      <Modal
        visible={showExerciseSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity onPress={() => setShowExerciseSelector(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#666"
              value={exerciseSearchQuery}
              onChangeText={handleSearchExercises}
            />
          </View>

          <FlatList
            data={availableExercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.exerciseSelectItem}
                onPress={() => handleAddExercise(item)}
              >
                <View style={styles.exerciseSelectInfo}>
                  <Text style={styles.exerciseSelectName}>{item.name}</Text>
                  <Text style={styles.exerciseSelectMeta}>
                    {item.defaultSets}x{item.defaultReps} • {item.category} • {item.difficulty}
                  </Text>
                  <Text style={styles.exerciseSelectMuscles}>
                    {item.muscleGroups.join(', ')}
                  </Text>
                </View>
                <Plus size={20} color="#FF6B35" />
              </TouchableOpacity>
            )}
            style={styles.exerciseList}
          />
        </SafeAreaView>
      </Modal>

      {/* Share Program Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Share Program</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {selectedProgramForShare?.shareCode ? (
              <View style={styles.shareCodeContainer}>
                <Text style={styles.shareCodeLabel}>Share Code:</Text>
                <View style={styles.shareCodeBox}>
                  <Text style={styles.shareCodeText}>{selectedProgramForShare.shareCode}</Text>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(selectedProgramForShare.shareCode!)}
                  >
                    <Copy size={16} color="#FF6B35" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.systemShareButton}
                  onPress={() => shareViaSystem(selectedProgramForShare.shareCode!)}
                >
                  <Share2 size={16} color="#fff" />
                  <Text style={styles.systemShareText}>Share via System</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.generateShareContainer}>
                <Text style={styles.generateShareText}>
                  Generate a share code to let others import this program
                </Text>
                <TouchableOpacity 
                  style={styles.generateShareButton}
                  onPress={handleGenerateShareCode}
                >
                  <Text style={styles.generateShareButtonText}>Generate Share Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Import Program Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Import Program</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.importContainer}>
              <Text style={styles.importLabel}>Enter Share Code:</Text>
              <TextInput
                style={styles.importInput}
                placeholder="Enter share code..."
                placeholderTextColor="#666"
                value={importCode}
                onChangeText={setImportCode}
                autoCapitalize="characters"
              />
              
              <TouchableOpacity 
                style={styles.importSubmitButton}
                onPress={handleImportProgram}
              >
                <Download size={16} color="#fff" />
                <Text style={styles.importButtonText}>Import Program</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Template Editor Modal */}
      <Modal
        visible={showExerciseEditor}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingExerciseTemplate ? 'Edit Exercise' : 'Create Exercise'}
            </Text>
            <TouchableOpacity onPress={() => setShowExerciseEditor(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Exercise Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter exercise name..."
                placeholderTextColor="#666"
                value={exerciseTemplateName}
                onChangeText={setExerciseTemplateName}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categorySelector}>
                {['Strength', 'Cardio', 'Flexibility', 'Balance'].map(category => (
                  <TouchableOpacity 
                    key={category}
                    style={[
                      styles.categoryOption,
                      exerciseTemplateCategory === category && styles.categoryOptionActive
                    ]}
                    onPress={() => setExerciseTemplateCategory(category as any)}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      exerciseTemplateCategory === category && styles.categoryOptionTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Muscle Groups (comma separated)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. chest, triceps, shoulders..."
                placeholderTextColor="#666"
                value={exerciseTemplateMuscleGroups}
                onChangeText={setExerciseTemplateMuscleGroups}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe how to perform this exercise..."
                placeholderTextColor="#666"
                value={exerciseTemplateInstructions}
                onChangeText={setExerciseTemplateInstructions}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Video Tutorial URL</Text>
              <TextInput
                style={styles.textInput}
                value={exerciseTemplateVideoUrl}
                onChangeText={setExerciseTemplateVideoUrl}
                placeholder="https://example.com/video.mp4"
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tracking Type</Text>
              <View style={styles.trackingTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.trackingTypeButton,
                    exerciseTemplateTrackingType === 'reps' && styles.trackingTypeButtonActive
                  ]}
                  onPress={() => setExerciseTemplateTrackingType('reps')}
                >
                  <Text style={[
                    styles.trackingTypeText,
                    exerciseTemplateTrackingType === 'reps' && styles.trackingTypeTextActive
                  ]}>
                    Reps
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.trackingTypeButton,
                    exerciseTemplateTrackingType === 'time' && styles.trackingTypeButtonActive
                  ]}
                  onPress={() => setExerciseTemplateTrackingType('time')}
                >
                  <Text style={[
                    styles.trackingTypeText,
                    exerciseTemplateTrackingType === 'time' && styles.trackingTypeTextActive
                  ]}>
                    Time
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {exerciseTemplateTrackingType === 'time' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Default Duration (seconds)</Text>
                <TextInput
                  style={styles.textInput}
                  value={exerciseTemplateDefaultReps.toString()}
                  onChangeText={(text) => setExerciseTemplateDefaultReps(parseInt(text) || 30)}
                  placeholder="30"
                  keyboardType="numeric"
                />
              </View>
            )}

            {exerciseTemplateTrackingType === 'reps' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Default Reps</Text>
                <TextInput
                  style={styles.textInput}
                  value={exerciseTemplateDefaultReps.toString()}
                  onChangeText={(text) => setExerciseTemplateDefaultReps(parseInt(text) || 12)}
                  placeholder="12"
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Default Values</Text>
              <View style={styles.defaultValuesContainer}>
                <View style={styles.defaultValueItem}>
                  <Text style={styles.defaultValueLabel}>Sets</Text>
                  <TextInput
                    style={styles.defaultValueInput}
                    value={exerciseTemplateDefaultSets.toString()}
                    onChangeText={(text) => setExerciseTemplateDefaultSets(parseInt(text) || 1)}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                
                <View style={styles.defaultValueItem}>
                  <Text style={styles.defaultValueLabel}>Rest (s)</Text>
                  <TextInput
                    style={styles.defaultValueInput}
                    value={exerciseTemplateDefaultRestTime.toString()}
                    onChangeText={(text) => setExerciseTemplateDefaultRestTime(parseInt(text) || 30)}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveExerciseTemplate}
              >
                <Text style={styles.saveButtonText}>
                  {editingExerciseTemplate ? 'Update Exercise' : 'Create Exercise'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  importSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00C9A7',
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  programsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  programCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  programDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    lineHeight: 18,
  },
  programMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: '#FF6B35',
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  activeIndicator: {
    marginLeft: 12,
  },
  exerciseList: {
    marginBottom: 16,
  },
  exerciseItem: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  moreExercises: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  programActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  activateButton: {
    backgroundColor: '#00C9A7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 'auto',
  },
  activateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,201,167,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,107,53,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,71,87,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiGenerateCard: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  aiGenerateContent: {
    padding: 24,
    alignItems: 'center',
  },
  aiGenerateTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  aiGenerateSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  aiGenerateButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  aiGenerateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  trackingTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  trackingTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
  },
  trackingTypeButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  trackingTypeText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 14,
  },
  trackingTypeTextActive: {
    color: '#fff',
  },
  difficultySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    opacity: 0.7,
  },
  difficultyOptionActive: {
    opacity: 1,
  },
  difficultyOptionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  daysSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayOptionActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  dayOptionText: {
    color: '#999',
    fontWeight: '600',
  },
  dayOptionTextActive: {
    color: '#fff',
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,53,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  addExerciseText: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 14,
  },
  exerciseEditItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseEditName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  removeExerciseButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,71,87,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseEditControls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  exerciseControl: {
    flex: 1,
  },
  exerciseControlLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  exerciseControlInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  exerciseInstructions: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
  modalActions: {
    marginTop: 32,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
  },
  exerciseSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseSelectInfo: {
    flex: 1,
  },
  exerciseSelectName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseSelectMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  exerciseSelectMuscles: {
    fontSize: 11,
    color: '#666',
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareModalTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  shareCodeContainer: {
    alignItems: 'center',
  },
  shareCodeLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  shareCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  shareCodeText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  copyButton: {
    padding: 4,
  },
  systemShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  systemShareText: {
    color: '#fff',
    fontWeight: '600',
  },
  generateShareContainer: {
    alignItems: 'center',
  },
  generateShareText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  generateShareButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  generateShareButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  importContainer: {
    alignItems: 'center',
  },
  importLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  importInput: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    width: '100%',
    marginBottom: 16,
    textAlign: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00C9A7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  importButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  coachPanel: {
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#00C9A7',
  },
  coachPanelTitle: {
    fontSize: 20,
    color: '#00C9A7',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  coachPanelSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 20,
    lineHeight: 20,
  },
  coachActions: {
    flexDirection: 'row',
    gap: 12,
  },
  coachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00C9A7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  coachButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00C9A7',
  },
  coachButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  coachButtonTextSecondary: {
    color: '#00C9A7',
  },
  coachExerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  coachExerciseInfo: {
    flex: 1,
  },
  coachExerciseName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  coachExerciseMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  coachExerciseMuscles: {
    fontSize: 11,
    color: '#666',
  },
  coachExerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  coachEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,53,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,71,87,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },
  categoryOptionActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryOptionText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  defaultValuesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  defaultValueItem: {
    flex: 1,
  },
  defaultValueLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  defaultValueInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 16,
  },
});

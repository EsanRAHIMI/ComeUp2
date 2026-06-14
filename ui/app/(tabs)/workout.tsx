import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Play, Pause, Camera, RotateCcw, X, Volume2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';
import WorkoutCamera from '../../components/workout/WorkoutCamera';

const { height } = Dimensions.get('window');

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restTime: number;
  videoUrl?: string;
  instructions: string;
}

interface WorkoutProgram {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface WorkoutSession {
  program: WorkoutProgram;
  currentExerciseIndex: number;
  currentSet: number;
  currentRep: number;
  isActive: boolean;
  isResting: boolean;
  restTimeRemaining: number;
  totalWorkoutTime: number;
  phase: 'ready' | 'exercising' | 'resting' | 'complete';
}

export default function WorkoutScreen() {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [, setTrackingStatus] = useState<'permission-required' | 'camera-unavailable' | 'frame-pipeline-ready'>('permission-required');
  
  // Active workout program (in real app, this would come from user's active program)
  const [activeProgram] = useState<WorkoutProgram>({
    id: '1',
    name: 'Upper Body Strength',
    exercises: [
      { 
        id: '1', 
        name: 'Push-ups', 
        sets: 3, 
        reps: 12, 
        restTime: 60,
        videoUrl: 'https://youtu.be/bQvuy5f5j-8',
        instructions: 'Keep your body straight, lower chest to ground, push back up'
      },
      { 
        id: '2', 
        name: 'Squats', 
        sets: 3, 
        reps: 15, 
        restTime: 60,
        videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
        instructions: 'Feet shoulder-width apart, lower until thighs parallel to ground'
      },
      { 
        id: '3', 
        name: 'Lunges', 
        sets: 2, 
        reps: 10, 
        restTime: 45,
        videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
        instructions: 'Step forward, lower hips until both knees at 90 degrees'
      },
      { 
        id: '4', 
        name: 'Plank Hold', 
        sets: 3, 
        reps: 30, 
        restTime: 60,
        videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
        instructions: 'Hold straight line from head to heels, engage core'
      },
    ]
  });

  const [workout, setWorkout] = useState<WorkoutSession>({
    program: activeProgram,
    currentExerciseIndex: 0,
    currentSet: 1,
    currentRep: 0,
    isActive: false,
    isResting: false,
    restTimeRemaining: 0,
    totalWorkoutTime: 0,
    phase: 'ready'
  });

  // Audio for beep sounds
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Video player ref
  const videoRef = useRef<Video>(null);
  const [videoStatus, setVideoStatus] = useState<any>({ isLoaded: false, isPlaying: false });
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isYouTubeVideo, setIsYouTubeVideo] = useState(false);
  const [viewMode, setViewMode] = useState<'video' | 'instructions'>('video');

  // Load beep sound
  useEffect(() => {
    const loadSound = async () => {
      try {
        // In real app, you'd load actual beep sound files
        // const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/beep.mp3'));
        // setSound(sound);
      } catch (error) {
        console.log('Error loading sound:', error);
      }
    };
    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Check if current exercise has YouTube video
  useEffect(() => {
    const currentExercise = workout.program.exercises[workout.currentExerciseIndex];
    if (currentExercise?.videoUrl) {
      const isYouTube = currentExercise.videoUrl.includes('youtube.com') || 
                       currentExercise.videoUrl.includes('youtu.be');
      setIsYouTubeVideo(isYouTube);
      setVideoError(null);
    }
  }, [workout.currentExerciseIndex]);

  // Extract YouTube video ID
  const extractYouTubeVideoId = (url: string): string | null => {
    try {
      let videoId = '';
      
      // Handle different YouTube URL formats
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0];
      }
      
      return videoId || null;
    } catch (error) {
      console.log('Error converting YouTube URL:', error);
    }
    
    return null;
  };

  // Main workout timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (workout.isActive && !workout.isResting) {
      // Total workout time counter
      interval = setInterval(() => {
        setWorkout(prev => ({
          ...prev,
          totalWorkoutTime: prev.totalWorkoutTime + 1
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workout.isActive, workout.isResting]);

  // Rest timer
  useEffect(() => {
    let restInterval: ReturnType<typeof setInterval>;
    
    if (workout.isResting && workout.restTimeRemaining > 0) {
      restInterval = setInterval(() => {
        setWorkout(prev => {
          const newRestTime = prev.restTimeRemaining - 1;
          
          if (newRestTime <= 0) {
            // Rest complete, start next set or exercise
            return {
              ...prev,
              isResting: false,
              restTimeRemaining: 0,
              phase: 'exercising'
            };
          }
          
          return {
            ...prev,
            restTimeRemaining: newRestTime
          };
        });
      }, 1000);
    }

    return () => {
      if (restInterval) clearInterval(restInterval);
    };
  }, [workout.isResting, workout.restTimeRemaining]);

  // Video player functions
  const playVideo = async () => {
    if (videoRef.current && videoStatus.isLoaded) {
      try {
        await videoRef.current.playAsync();
      } catch (error) {
        console.log('Error playing video:', error);
        setVideoError('Failed to play video');
      }
    }
  };

  const pauseVideo = async () => {
    if (videoRef.current && videoStatus.isLoaded) {
      try {
        await videoRef.current.pauseAsync();
      } catch (error) {
        console.log('Error pausing video:', error);
      }
    }
  };

  const replayVideo = async () => {
    if (videoRef.current && videoStatus.isLoaded) {
      try {
        await videoRef.current.replayAsync();
      } catch (error) {
        console.log('Error replaying video:', error);
      }
    }
  };

  const openYouTubeVideo = async () => {
    const currentExercise = workout.program.exercises[workout.currentExerciseIndex];
    if (currentExercise?.videoUrl) {
      let url = currentExercise.videoUrl;
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch (error) {
        console.log('Error opening YouTube video:', error);
        setVideoError('Failed to open video');
      }
    }
  };

  const playBeep = async (type: 'rep' | 'set_complete' | 'exercise_complete') => {
    if (!isVoiceEnabled) return;
    
    try {
      // In real app, play different beep sounds
      console.log(`🔊 Beep: ${type}`);
      // await sound?.replayAsync();
    } catch (error) {
      console.log('Error playing beep:', error);
    }
  };

  const handleRepDetected = () => {
    const currentExercise = workout.program.exercises[workout.currentExerciseIndex];
    const newRepCount = workout.currentRep + 1;
    
    // Play rep beep
    playBeep('rep');
    
    if (newRepCount >= currentExercise.reps) {
      // Set complete
      playBeep('set_complete');
      handleSetComplete();
    } else {
      // Just increment rep
      setWorkout(prev => ({
        ...prev,
        currentRep: newRepCount
      }));
    }
  };

  const handleSetComplete = () => {
    const currentExercise = workout.program.exercises[workout.currentExerciseIndex];
    
    if (workout.currentSet >= currentExercise.sets) {
      // Exercise complete, move to next exercise
      handleExerciseComplete();
    } else {
      // Start rest period for next set
      setWorkout(prev => ({
        ...prev,
        currentSet: prev.currentSet + 1,
        currentRep: 0,
        isResting: true,
        restTimeRemaining: currentExercise.restTime,
        phase: 'resting'
      }));
    }
  };

  const handleExerciseComplete = () => {
    if (workout.currentExerciseIndex >= workout.program.exercises.length - 1) {
      // Workout complete
      handleWorkoutComplete();
    } else {
      // Move to next exercise
      const nextExercise = workout.program.exercises[workout.currentExerciseIndex + 1];
      playBeep('exercise_complete');
      
      setWorkout(prev => ({
        ...prev,
        currentExerciseIndex: prev.currentExerciseIndex + 1,
        currentSet: 1,
        currentRep: 0,
        isResting: true,
        restTimeRemaining: 90, // Longer rest between exercises
        phase: 'resting'
      }));
    }
  };

  const handleWorkoutComplete = () => {
    setWorkout(prev => ({
      ...prev,
      isActive: false,
      phase: 'complete'
    }));
    
    setIsCameraActive(false);
    
    Alert.alert(
      'Workout Complete! 🎉',
      `Congratulations! You completed ${workout.program.name} in ${formatTime(workout.totalWorkoutTime)}.`,
      [
        {
          text: 'View Progress',
          onPress: () => router.push('/progress'),
        },
        {
          text: 'Done',
          style: 'default',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartWorkout = () => {
    setWorkout(prev => ({
      ...prev,
      isActive: true,
      phase: 'exercising',
      totalWorkoutTime: 0
    }));
  };

  const handlePauseWorkout = () => {
    setWorkout(prev => ({
      ...prev,
      isActive: false,
      phase: 'ready'
    }));
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleVoice = () => {
    setIsVoiceEnabled(prev => !prev);
  };

  const toggleCamera = () => {
    setIsCameraActive(prev => !prev);
  };

  const handleEndWorkout = () => {
    Alert.alert(
      'End Workout?',
      'Are you sure you want to end this workout session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: () => {
            setWorkout(prev => ({ ...prev, isActive: false }));
            setIsCameraActive(false);
            router.back();
          },
        },
      ]
    );
  };

  // Manual fallback until native pose landmarks are connected.
  const handleManualRep = () => {
    if (workout.isActive && !workout.isResting) {
      handleRepDetected();
    }
  };

  const currentExercise = workout.program.exercises[workout.currentExerciseIndex];

  return (
    <View style={styles.container}>
      {isCameraActive ? (
        <>
          {/* User Camera - Optimized Position */}
          <View style={styles.cameraContainer}>
            <WorkoutCamera
              style={styles.camera}
              facing={facing}
              isActive={isCameraActive}
              onTrackingStatusChange={setTrackingStatus}
            />
              {/* Glass Camera Overlay */}
              <View style={styles.cameraOverlayLayer} pointerEvents="box-none">
              <View style={styles.glassOverlay} pointerEvents="box-none">
                <SafeAreaView style={styles.cameraOverlay}>
                  {/* Top Controls */}
                  <View style={styles.topControls}>
                    <View style={styles.workoutInfo}>
                      <View style={styles.workoutInfoCard}>
                        <Text style={styles.workoutTitle}>{workout.program.name}</Text>
                        <Text style={styles.exerciseName}>{currentExercise?.name}</Text>
                        <View style={styles.exerciseCounter}>
                          <Text style={styles.exerciseCounterText}>
                            {workout.currentExerciseIndex + 1}/{workout.program.exercises.length}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Professional Rep Counter */}
                  <View style={styles.professionalRepCounter}>
                    <View style={styles.repCounterContent}>
                      <View style={styles.repNumbers}>
                        <Text style={styles.currentRep}>{workout.currentRep}</Text>
                        <Text style={styles.repSeparator}>/</Text>
                        <Text style={styles.targetRep}>{currentExercise?.reps || 0}</Text>
                      </View>
                      <Text style={styles.repLabel}>REPS</Text>
                      <View style={styles.setIndicator}>
                        <Text style={styles.setLabel}>SET {workout.currentSet}/{currentExercise?.sets}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Professional Control Buttons */}
                  <View style={styles.bottomControls}>
                    <TouchableOpacity 
                      style={styles.modernControlButton}
                      onPress={handleEndWorkout}
                    >
                      <X size={18} color="#fff" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modernControlButton, isCameraActive && styles.modernControlButtonActive]}
                      onPress={toggleCamera}
                    >
                      <Camera size={16} color={isCameraActive ? "#00C9A7" : "rgba(255,255,255,0.8)"} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.modernControlButton}
                      onPress={toggleCameraFacing}
                    >
                      <RotateCcw size={16} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modernControlButton, isVoiceEnabled && styles.modernControlButtonActive]}
                      onPress={toggleVoice}
                    >
                      {isVoiceEnabled ? 
                        <Volume2 size={16} color="#00C9A7" /> : 
                        <Volume2 size={16} color="rgba(255,255,255,0.4)" />
                      }
                    </TouchableOpacity>
                    
                    {/* Manual fallback. Automatic counting must come from pose landmarks, never simulation. */}
                    {workout.isActive && !workout.isResting && (
                      <TouchableOpacity 
                        style={styles.manualRepButton}
                        onPress={handleManualRep}
                      >
                        <Text style={styles.manualRepText}>+1</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                      style={[styles.primaryControlButton, workout.isActive && styles.primaryControlButtonPause]}
                      onPress={workout.isActive ? handlePauseWorkout : handleStartWorkout}
                      disabled={workout.isResting}
                    >
                      {workout.isActive ? 
                        <Pause size={20} color="#fff" /> : 
                        <Play size={20} color="#fff" />
                      }
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </View>
              </View>
          </View>

          {/* Exercise Demo Video - Optimized Layout */}
          <View style={styles.demoContainer}>
            {workout.isResting ? (
              <View style={styles.restDisplay}>
                <Text style={styles.restTitle}>Rest Time</Text>
                <Text style={styles.restTimer}>{formatTime(workout.restTimeRemaining)}</Text>
                <Text style={styles.restSubtext}>
                  {workout.currentSet <= currentExercise.sets ? 
                    `Prepare for Set ${workout.currentSet}` : 
                    'Prepare for next exercise'
                  }
                </Text>
                <TouchableOpacity 
                  style={styles.skipRestButton}
                  onPress={() => {
                    setWorkout(prev => ({
                      ...prev,
                      isResting: false,
                      restTimeRemaining: 0,
                      phase: 'exercising'
                    }));
                  }}
                >
                  <Text style={styles.skipRestText}>Skip Rest</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.demoVideoContainer}>
                {/* Exercise Demo Video */}
                {/* View Mode Toggle */}
                <View style={styles.viewModeToggle}>
                  <TouchableOpacity 
                    style={[
                      styles.viewModeButton,
                      viewMode === 'video' && styles.viewModeButtonActive
                    ]}
                    onPress={() => setViewMode('video')}
                  >
                    <Text style={[
                      styles.viewModeButtonText,
                      viewMode === 'video' && styles.viewModeButtonTextActive
                    ]}>
                      Video
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.viewModeButton,
                      viewMode === 'instructions' && styles.viewModeButtonActive
                    ]}
                    onPress={() => setViewMode('instructions')}
                  >
                    <Text style={[
                      styles.viewModeButtonText,
                      viewMode === 'instructions' && styles.viewModeButtonTextActive
                    ]}>
                      Instructions
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.videoContainer}>
                  {viewMode === 'video' ? (
                    <>
                      {videoError && (
                        <View style={styles.videoError}>
                          <Text style={styles.videoErrorText}>Video unavailable</Text>
                          <Text style={styles.videoErrorSubtext}>Switch to instructions</Text>
                        </View>
                      )}
                      
                      {isYouTubeVideo ? (
                        <View style={styles.youtubeContainer}>
                          <View style={styles.youtubeThumbnail}>
                            {extractYouTubeVideoId(currentExercise?.videoUrl || '') && (
                              <Image
                                source={{ uri: `https://img.youtube.com/vi/${extractYouTubeVideoId(currentExercise?.videoUrl || '')}/maxresdefault.jpg` }}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  resizeMode: 'cover',
                                  borderRadius: 12,
                                }}
                              />
                            )}
                            <TouchableOpacity 
                              style={styles.youtubePlayButton}
                              onPress={openYouTubeVideo}
                            >
                              <Play size={48} color="#fff" fill="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <Video
                          ref={videoRef}
                          style={styles.video}
                          source={{
                            uri: currentExercise?.videoUrl || 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4'
                          }}
                          useNativeControls={false}
                          resizeMode={ResizeMode.CONTAIN}
                          isLooping
                          shouldPlay={false}
                          onPlaybackStatusUpdate={(status) => {
                            setVideoStatus(status);
                            if ('error' in status && status.error) {
                              setVideoError(status.error);
                            }
                          }}
                          onLoad={() => {
                            console.log('Video loaded successfully');
                            setVideoError(null);
                          }}
                          onError={(error) => {
                            console.log('Video error:', error);
                            setVideoError('Failed to load video');
                          }}
                        />
                      )}
                      
                      {/* Video Controls Overlay */}
                      {!videoError && !isYouTubeVideo && videoRef.current && videoStatus.isLoaded && (
                        <View style={styles.videoControls}>
                          <TouchableOpacity 
                            style={styles.videoControlButton}
                            onPress={videoStatus.isPlaying ? pauseVideo : playVideo}
                          >
                            {videoStatus.isPlaying ? 
                              <Pause size={32} color="#fff" /> : 
                              <Play size={32} color="#fff" />
                            }
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={styles.videoControlButton}
                            onPress={replayVideo}
                          >
                            <RotateCcw size={24} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  ) : (
                    /* Instructions View */
                    <View style={styles.instructionsView}>
                      <ScrollView style={styles.instructionsContent} showsVerticalScrollIndicator={true}>
                        <Text style={styles.instructionsText}>
                          {currentExercise?.instructions}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                {/* Exercise Info */}
                {/* Moved Exercise Info and Time Bar */}
                <View style={styles.bottomInfoContainer}>
                  {/* Set Progress */}
                  <View style={styles.setProgressContainer}>
                    <Text style={styles.setProgressText}>
                      Set {workout.currentSet} of {currentExercise?.sets}
                    </Text>
                    <View style={styles.setProgressBar}>
                      <View 
                        style={[
                          styles.setProgressFill, 
                          { width: `${(workout.currentSet / (currentExercise?.sets || 1)) * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>

                  {/* Exercise Progress and Time */}
                  <View style={styles.exerciseInfoBar}>
                    <View style={styles.exerciseProgress}>
                      <Text style={styles.exerciseProgressText}>
                        Exercise {workout.currentExerciseIndex + 1} of {workout.program.exercises.length}
                      </Text>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { width: `${((workout.currentExerciseIndex + 1) / workout.program.exercises.length) * 100}%` }
                          ]} 
                        />
                      </View>
                    </View>
                    <Text style={styles.totalTime}>{formatTime(workout.totalWorkoutTime)}</Text>
                  </View>
                </View>
              </View>
            )}

          </View>
        </>
      ) : (
        <SafeAreaView style={styles.noCameraContainer}>
          <View style={styles.noCameraContent}>
            <Text style={styles.noCameraTitle}>Camera Off</Text>
            <Text style={styles.noCameraText}>
              Camera is turned off. Turn it on to continue workout tracking.
            </Text>
            <TouchableOpacity 
              style={styles.resumeCameraButton}
              onPress={toggleCamera}
            >
              <Text style={styles.resumeCameraButtonText}>Turn On Camera</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    minHeight: height * 0.5,
    maxHeight: height * 0.6,
  },
  camera: {
    flex: 1,
    borderRadius: 0,
  },
  cameraOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glassOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  demoContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    minHeight: height * 0.4,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionContent: {
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noCameraContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCameraContent: {
    alignItems: 'center',
    padding: 20,
  },
  noCameraTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noCameraText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  resumeCameraButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  resumeCameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topControls: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modernControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(20px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modernControlButtonActive: {
    backgroundColor: 'rgba(0,201,167,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.4)',
  },
  workoutInfo: {
    alignItems: 'center',
  },
  workoutInfoCard: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  workoutTitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exerciseName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  exerciseCounter: {
    marginTop: 4,
  },
  exerciseCounterText: {
    fontSize: 9,
    color: 'rgba(255,107,53,0.9)',
    fontWeight: '700',
    letterSpacing: 1,
  },
  professionalRepCounter: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: [{ translateY: -70 }],
    paddingHorizontal: 20,
  },
  repCounterContent: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  repNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  currentRep: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '800',
    lineHeight: 36,
  },
  repSeparator: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginHorizontal: 6,
    lineHeight: 36,
  },
  targetRep: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    lineHeight: 36,
  },
  repLabel: {
    fontSize: 8,
    color: 'rgba(255,107,53,0.8)',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  setIndicator: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  setLabel: {
    fontSize: 8,
    color: 'rgba(255,107,53,0.9)',
    fontWeight: '700',
    letterSpacing: 1,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  primaryControlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,107,53,0.95)',
    backdropFilter: 'blur(20px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  primaryControlButtonPause: {
    backgroundColor: 'rgba(255,71,87,0.95)',
    shadowColor: '#FF4757',
  },
  manualRepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,201,167,0.9)',
    backdropFilter: 'blur(20px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#00C9A7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  manualRepText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  restDisplay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restTitle: {
    fontSize: 24,
    color: '#FFD93D',
    fontWeight: 'bold',
  },
  restTimer: {
    fontSize: 64,
    color: '#fff',
    fontWeight: 'bold',
    marginVertical: 16,
  },
  restSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    textAlign: 'center',
  },
  skipRestButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipRestText: {
    color: '#fff',
    fontWeight: '600',
  },
  demoVideoContainer: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    zIndex: 1,
  },
  videoErrorText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  videoErrorSubtext: {
    fontSize: 14,
    color: '#999',
  },
  videoControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  videoControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  youtubeTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  youtubeUrl: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  youtubeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  youtubeContainer2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  youtubeThumbnail: {
    width: '100%',
    height: '70%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubePlayButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  youtubeTitle2: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  youtubeSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    margin: 20,
    marginBottom: 0,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#FF6B35',
  },
  viewModeButtonText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  instructionsView: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  instructionsContent: {
    flex: 1,
    padding: 20,
  },
  instructionsText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  videoPlaceholderText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 16,
  },
  exerciseInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bottomInfoContainer: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
  },
  setProgressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  setProgressText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  setProgressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  setProgressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  exerciseProgress: {
    flex: 1,
    marginRight: 16,
  },
  exerciseProgressText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  totalTime: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

// Voice Feedback Service for Real-time Coaching
// This service provides text-to-speech functionality and intelligent feedback

interface VoiceFeedbackConfig {
  enabled: boolean;
  language: string;
  speed: number;
  pitch: number;
  volume: number;
}

interface FeedbackContext {
  exercise: string;
  currentRep: number;
  targetReps: number;
  currentSet: number;
  targetSets: number;
  formScore: number;
  phase: 'preparation' | 'execution' | 'return' | 'rest';
}

class VoiceFeedbackService {
  private config: VoiceFeedbackConfig = {
    enabled: true,
    language: 'en-US',
    speed: 1.0,
    pitch: 1.0,
    volume: 0.8,
  };

  private lastFeedbackTime: number = 0;
  private feedbackCooldown: number = 2000; // 2 seconds between feedback

  // Initialize text-to-speech (in real implementation, would use expo-speech)
  private speak(text: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    if (!this.config.enabled) return;
    
    const now = Date.now();
    if (priority === 'low' && now - this.lastFeedbackTime < this.feedbackCooldown) {
      return; // Skip low priority feedback if too recent
    }

    console.log(`🗣️ Voice: ${text}`); // In real app, this would be actual TTS
    this.lastFeedbackTime = now;
    
    // Real implementation would use:
    // import * as Speech from 'expo-speech';
    // Speech.speak(text, {
    //   language: this.config.language,
    //   pitch: this.config.pitch,
    //   rate: this.config.speed,
    //   volume: this.config.volume,
    // });
  }

  // Main feedback function called during workout
  provideFeedback(context: FeedbackContext): void {
    const { exercise, currentRep, targetReps, currentSet, targetSets, formScore, phase } = context;

    // Exercise start
    if (currentRep === 0 && currentSet === 1) {
      this.speak(`Starting ${exercise}. ${targetSets} sets of ${targetReps} reps.`, 'high');
      return;
    }

    // Rep progress feedback
    if (phase === 'execution') {
      this.provideRepFeedback(currentRep, targetReps, formScore);
    }

    // Set completion
    if (currentRep >= targetReps) {
      this.provideSetCompletionFeedback(currentSet, targetSets);
    }

    // Form feedback
    if (formScore < 80) {
      this.provideFormFeedback(exercise, formScore);
    }
  }

  private provideRepFeedback(currentRep: number, targetReps: number, formScore: number): void {
    const remaining = targetReps - currentRep;
    
    // Milestone announcements
    if (remaining === 5 && targetReps > 8) {
      this.speak('5 more reps!', 'medium');
    } else if (remaining === 2) {
      this.speak('2 more!', 'medium');
    } else if (remaining === 1) {
      this.speak('Last one!', 'medium');
    }

    // Encouragement based on form
    if (formScore >= 90 && currentRep > 0 && currentRep % 5 === 0) {
      const encouragements = [
        'Perfect form!',
        'Excellent technique!',
        'Keep it up!',
        'Looking strong!',
      ];
      this.speak(encouragements[Math.floor(Math.random() * encouragements.length)], 'low');
    }
  }

  private provideSetCompletionFeedback(currentSet: number, targetSets: number): void {
    if (currentSet < targetSets) {
      this.speak(`Set ${currentSet} complete! Rest for 60 seconds.`, 'high');
    } else {
      this.speak('Exercise complete! Great work!', 'high');
    }
  }

  private provideFormFeedback(exercise: string, formScore: number): void {
    const formFeedback = this.getExerciseSpecificFormFeedback(exercise, formScore);
    if (formFeedback) {
      this.speak(formFeedback, 'medium');
    }
  }

  private getExerciseSpecificFormFeedback(exercise: string, score: number): string | null {
    const feedbackMap: { [key: string]: { [key: number]: string } } = {
      'push-ups': {
        70: 'Keep your body straight',
        60: 'Lower your chest more',
        50: 'Control the movement',
      },
      'squats': {
        70: 'Go deeper in your squat',
        60: 'Keep your knees aligned',
        50: 'Focus on your form',
      },
      'lunges': {
        70: 'Step out further',
        60: 'Keep your torso upright',
        50: 'Control the descent',
      },
    };

    const exerciseFeedback = feedbackMap[exercise];
    if (!exerciseFeedback) return null;

    // Find appropriate feedback based on score
    for (const threshold of [70, 60, 50]) {
      if (score <= threshold) {
        return exerciseFeedback[threshold];
      }
    }

    return null;
  }

  // Workout session management
  announceWorkoutStart(workoutName: string, exercises: string[]): void {
    this.speak(`Starting ${workoutName}. We'll do ${exercises.length} exercises today.`, 'high');
  }

  announceNextExercise(exerciseName: string, sets: number, reps: number): void {
    this.speak(`Next exercise: ${exerciseName}. ${sets} sets of ${reps} reps.`, 'high');
  }

  announceRestPeriod(seconds: number): void {
    this.speak(`Rest for ${seconds} seconds.`, 'high');
    
    // Countdown for last 5 seconds
    setTimeout(() => {
      if (seconds <= 5) {
        this.speak('Get ready!', 'medium');
      }
    }, (seconds - 5) * 1000);
  }

  announceWorkoutComplete(duration: string, performance: { totalReps: number; averageForm: number }): void {
    const { totalReps, averageForm } = performance;
    this.speak(
      `Workout complete! ${duration} minutes, ${totalReps} total reps, ${averageForm}% average form score. Great job!`,
      'high'
    );
  }

  // Motivational phrases
  provideMotivation(context: 'struggling' | 'excellent' | 'halfway' | 'final_push'): void {
    const motivations = {
      struggling: [
        'You\'ve got this!',
        'Push through it!',
        'Stay strong!',
        'Focus on your goal!',
      ],
      excellent: [
        'Outstanding work!',
        'You\'re crushing it!',
        'Perfect execution!',
        'That\'s how it\'s done!',
      ],
      halfway: [
        'Halfway there!',
        'Keep the momentum!',
        'You\'re doing great!',
        'Strong and steady!',
      ],
      final_push: [
        'Final push!',
        'Give it everything!',
        'You\'re almost done!',
        'Finish strong!',
      ],
    };

    const phrases = motivations[context];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.speak(randomPhrase, 'low');
  }

  // Configuration methods
  updateConfig(newConfig: Partial<VoiceFeedbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  toggleEnabled(): void {
    this.config.enabled = !this.config.enabled;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Test functionality
  testVoice(): void {
    this.speak('Voice feedback is working correctly!', 'high');
  }
}

export const voiceFeedbackService = new VoiceFeedbackService();
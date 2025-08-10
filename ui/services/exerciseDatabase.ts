export interface ExerciseTemplate {
  id: string;
  name: string;
  category: 'Strength' | 'Cardio' | 'Flexibility' | 'Balance';
  muscleGroups: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string[];
  defaultSets: number;
  defaultReps: number;
  defaultRestTime: number;
  instructions: string;
  videoUrl: string;
  thumbnailUrl: string;
  trackingType: 'reps' | 'time';
  tips: string[];
  commonMistakes: string[];
}

class ExerciseDatabase {
  private exercises: ExerciseTemplate[] = [
    {
      id: 'push-ups',
      name: 'Push-ups',
      category: 'Strength',
      muscleGroups: ['chest', 'triceps', 'shoulders'],
      difficulty: 'Beginner',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 12,
      defaultRestTime: 60,
      instructions: 'Keep your body straight, lower chest to ground, push back up',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'reps',
      tips: ['Keep core engaged', 'Don\'t let hips sag'],
      commonMistakes: ['Arching back', 'Not going full range of motion'],
    },
    {
      id: 'squats',
      name: 'Squats',
      category: 'Strength',
      muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
      difficulty: 'Beginner',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 15,
      defaultRestTime: 60,
      instructions: 'Feet shoulder-width apart, lower until thighs parallel to ground',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'reps',
      tips: ['Keep knees aligned with toes', 'Push through heels'],
      commonMistakes: ['Knees caving inward', 'Not going deep enough'],
    },
    {
      id: 'plank',
      name: 'Plank',
      category: 'Strength',
      muscleGroups: ['core', 'shoulders', 'back'],
      difficulty: 'Beginner',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 30, // 30 seconds
      defaultRestTime: 60,
      instructions: 'Hold a straight line from head to heels, engage core',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'time',
      tips: ['Keep hips level', 'Breathe steadily'],
      commonMistakes: ['Hips too high or low', 'Holding breath'],
    },
    {
      id: 'lunges',
      name: 'Lunges',
      category: 'Strength',
      muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'calves'],
      difficulty: 'Intermediate',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 10,
      defaultRestTime: 60,
      instructions: 'Step forward, lower back knee toward ground, return to start',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'reps',
      tips: ['Keep front knee over ankle', 'Step back to starting position'],
      commonMistakes: ['Knee extending past toes', 'Leaning forward too much'],
    },
    {
      id: 'burpees',
      name: 'Burpees',
      category: 'Cardio',
      muscleGroups: ['full-body'],
      difficulty: 'Advanced',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 8,
      defaultRestTime: 90,
      instructions: 'Squat down, jump back to plank, do push-up, jump feet forward, jump up',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'reps',
      tips: ['Maintain good form throughout', 'Land softly'],
      commonMistakes: ['Rushing through movements', 'Poor landing form'],
    },
    {
      id: 'mountain-climbers',
      name: 'Mountain Climbers',
      category: 'Cardio',
      muscleGroups: ['core', 'shoulders', 'legs'],
      difficulty: 'Intermediate',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 20,
      defaultRestTime: 60,
      instructions: 'In plank position, alternate bringing knees to chest rapidly',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'reps',
      tips: ['Keep hips level', 'Maintain plank position'],
      commonMistakes: ['Hips bouncing up and down', 'Hands too far forward'],
    },
    {
      id: 'wall-sit',
      name: 'Wall Sit',
      category: 'Strength',
      muscleGroups: ['quadriceps', 'glutes'],
      difficulty: 'Intermediate',
      equipment: ['wall'],
      defaultSets: 3,
      defaultReps: 45, // 45 seconds
      defaultRestTime: 90,
      instructions: 'Back against wall, slide down until thighs parallel to ground, hold',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'time',
      tips: ['Keep back flat against wall', 'Distribute weight evenly'],
      commonMistakes: ['Sliding down the wall', 'Not going low enough'],
    },
    {
      id: 'jumping-jacks',
      name: 'Jumping Jacks',
      category: 'Cardio',
      muscleGroups: ['full-body'],
      difficulty: 'Beginner',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 25,
      defaultRestTime: 45,
      instructions: 'Jump feet apart while raising arms overhead, return to start',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'reps',
      tips: ['Land softly on balls of feet', 'Keep core engaged'],
      commonMistakes: ['Landing too hard', 'Arms not fully extended'],
    },
    {
      id: 'diamond-push-ups',
      name: 'Diamond Push-ups',
      category: 'Strength',
      muscleGroups: ['triceps', 'chest', 'shoulders'],
      difficulty: 'Advanced',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 8,
      defaultRestTime: 90,
      instructions: 'Form diamond shape with hands, perform push-up',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'reps',
      tips: ['Keep elbows close to body', 'Maintain straight line'],
      commonMistakes: ['Elbows flaring out', 'Not going full range'],
    },
    {
      id: 'high-knees',
      name: 'High Knees',
      category: 'Cardio',
      muscleGroups: ['legs', 'core'],
      difficulty: 'Beginner',
      equipment: ['none'],
      defaultSets: 3,
      defaultReps: 30, // 30 seconds
      defaultRestTime: 60,
      instructions: 'Run in place bringing knees up to hip level',
      videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      thumbnailUrl: '',
      trackingType: 'time',
      tips: ['Pump arms naturally', 'Stay on balls of feet'],
      commonMistakes: ['Not lifting knees high enough', 'Leaning backward'],
    },
  ];

  getAllExercises(): ExerciseTemplate[] {
    return [...this.exercises];
  }

  searchExercises(query: string): ExerciseTemplate[] {
    if (!query.trim()) {
      return this.getAllExercises();
    }
    
    const lowerCaseQuery = query.toLowerCase();
    return this.exercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(lowerCaseQuery) ||
        exercise.muscleGroups.some((group) =>
          group.toLowerCase().includes(lowerCaseQuery)
        ) ||
        exercise.category.toLowerCase().includes(lowerCaseQuery) ||
        exercise.difficulty.toLowerCase().includes(lowerCaseQuery)
    );
  }

  addExercise(exercise: ExerciseTemplate): void {
    this.exercises.push(exercise);
  }

  updateExercise(updatedExercise: ExerciseTemplate): void {
    const index = this.exercises.findIndex((e) => e.id === updatedExercise.id);
    if (index !== -1) {
      this.exercises[index] = updatedExercise;
    }
  }

  deleteExercise(id: string): void {
    this.exercises = this.exercises.filter((e) => e.id !== id);
  }

  getExerciseById(id: string): ExerciseTemplate | undefined {
    return this.exercises.find((e) => e.id === id);
  }

  getExercisesByCategory(category: string): ExerciseTemplate[] {
    return this.exercises.filter((e) => e.category === category);
  }

  getExercisesByMuscleGroup(muscleGroup: string): ExerciseTemplate[] {
    return this.exercises.filter((e) => 
      e.muscleGroups.some(group => 
        group.toLowerCase().includes(muscleGroup.toLowerCase())
      )
    );
  }

  getExercisesByDifficulty(difficulty: string): ExerciseTemplate[] {
    return this.exercises.filter((e) => e.difficulty === difficulty);
  }

  getExercisesByTrackingType(trackingType: 'reps' | 'time'): ExerciseTemplate[] {
    return this.exercises.filter((e) => e.trackingType === trackingType);
  }
}

export const exerciseDatabase = new ExerciseDatabase();
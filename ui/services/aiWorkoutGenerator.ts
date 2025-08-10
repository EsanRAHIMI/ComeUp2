interface WorkoutGenerationParams {
  goal: 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number;
  equipment: string[];
  focusAreas: string[];
  limitations?: string[];
}

interface GeneratedWorkout {
  name: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    restTime: number;
    instructions: string;
    muscleGroups: string[];
  }>;
  totalCalories: number;
  difficulty: number;
  postWorkoutNutrition: {
    protein: number;
    carbs: number;
    supplements: string[];
  };
}

class AIWorkoutGenerator {
  private exerciseDatabase = {
    bodyweight: [
      {
        name: 'Push-ups',
        muscleGroups: ['chest', 'triceps', 'shoulders'],
        difficulty: 2,
        instructions: 'Keep your body in a straight line from head to heels',
      },
      {
        name: 'Squats',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
        difficulty: 1,
        instructions: 'Lower until thighs are parallel to the ground',
      },
      {
        name: 'Lunges',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
        difficulty: 2,
        instructions: 'Step forward and lower your hips until both knees are at 90 degrees',
      },
      {
        name: 'Plank',
        muscleGroups: ['core', 'shoulders'],
        difficulty: 1,
        instructions: 'Hold a straight line from head to heels, engage your core',
      },
      {
        name: 'Burpees',
        muscleGroups: ['full body', 'cardio'],
        difficulty: 3,
        instructions: 'Jump down to plank, do a push-up, jump back up with arms overhead',
      },
      {
        name: 'Mountain Climbers',
        muscleGroups: ['core', 'cardio', 'shoulders'],
        difficulty: 2,
        instructions: 'Alternate bringing knees to chest in plank position',
      },
    ],
  };

  generateWorkout(params: WorkoutGenerationParams): GeneratedWorkout {
    const { goal, fitnessLevel, duration, focusAreas } = params;
    
    // Filter exercises based on focus areas and difficulty
    const availableExercises = this.exerciseDatabase.bodyweight.filter(exercise => {
      const matchesFocus = focusAreas.length === 0 || 
        exercise.muscleGroups.some(group => focusAreas.includes(group));
      const matchesDifficulty = this.matchesFitnessLevel(exercise.difficulty, fitnessLevel);
      return matchesFocus && matchesDifficulty;
    });

    // Select exercises based on duration
    const exerciseCount = Math.floor(duration / 6); // ~6 minutes per exercise
    const selectedExercises = availableExercises
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(exerciseCount, availableExercises.length));

    // Generate sets and reps based on goal and fitness level
    const workoutExercises = selectedExercises.map(exercise => {
      const { sets, reps, restTime } = this.calculateVolume(goal, fitnessLevel, exercise.difficulty);
      
      return {
        name: exercise.name,
        sets,
        reps,
        restTime,
        instructions: exercise.instructions,
        muscleGroups: exercise.muscleGroups,
      };
    });

    const totalCalories = this.estimateCalories(workoutExercises, duration, goal);
    const nutrition = this.generateNutritionRecommendations(goal, totalCalories);

    return {
      name: this.generateWorkoutName(goal, focusAreas),
      exercises: workoutExercises,
      totalCalories,
      difficulty: this.calculateWorkoutDifficulty(workoutExercises, fitnessLevel),
      postWorkoutNutrition: nutrition,
    };
  }

  private matchesFitnessLevel(exerciseDifficulty: number, fitnessLevel: string): boolean {
    const levelMap = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
    const userLevel = levelMap[fitnessLevel as keyof typeof levelMap];
    return exerciseDifficulty <= userLevel + 1; // Allow slightly harder exercises
  }

  private calculateVolume(
    goal: string, 
    fitnessLevel: string, 
    exerciseDifficulty: number
  ): { sets: number; reps: number; restTime: number } {
    const baseVolume = {
      'Beginner': { sets: 2, reps: 8, restTime: 90 },
      'Intermediate': { sets: 3, reps: 12, restTime: 60 },
      'Advanced': { sets: 4, reps: 15, restTime: 45 },
    };

    let volume = baseVolume[fitnessLevel as keyof typeof baseVolume];

    // Adjust based on goal
    switch (goal) {
      case 'Strength':
        volume.reps = Math.max(6, volume.reps - 3);
        volume.restTime += 30;
        break;
      case 'Weight Loss':
        volume.reps += 2;
        volume.restTime = Math.max(30, volume.restTime - 15);
        break;
      case 'Muscle Gain':
        volume.sets += 1;
        break;
    }

    return volume;
  }

  private estimateCalories(exercises: any[], duration: number, goal: string): number {
    const baseCaloriesPerMinute = goal === 'Weight Loss' ? 8 : 6;
    return Math.round(duration * baseCaloriesPerMinute);
  }

  private generateNutritionRecommendations(goal: string, caloriesBurned: number) {
    const baseProtein = Math.round(caloriesBurned * 0.15); // 15% of calories from protein
    
    return {
      protein: goal === 'Muscle Gain' ? baseProtein + 10 : baseProtein,
      carbs: goal === 'Weight Loss' ? 20 : 30,
      supplements: goal === 'Muscle Gain' 
        ? ['Whey Protein', 'Creatine'] 
        : goal === 'Weight Loss' 
        ? ['L-Carnitine', 'Green Tea Extract'] 
        : ['Multivitamin'],
    };
  }

  private generateWorkoutName(goal: string, focusAreas: string[]): string {
    const goalNames = {
      'Weight Loss': 'Fat Burn',
      'Muscle Gain': 'Muscle Builder',
      'Strength': 'Strength Training',
      'General Fitness': 'Total Body',
    };

    const focusName = focusAreas.length > 0 ? 
      focusAreas[0].charAt(0).toUpperCase() + focusAreas[0].slice(1) : 
      'Full Body';

    return `${focusName} ${goalNames[goal as keyof typeof goalNames]}`;
  }

  private calculateWorkoutDifficulty(exercises: any[], fitnessLevel: string): number {
    const levelMultiplier = { 'Beginner': 0.7, 'Intermediate': 1.0, 'Advanced': 1.3 };
    const totalVolume = exercises.reduce((sum, ex) => sum + (ex.sets * ex.reps), 0);
    return Math.round(totalVolume * levelMultiplier[fitnessLevel as keyof typeof levelMultiplier] / 10);
  }
}

export const aiWorkoutGenerator = new AIWorkoutGenerator();
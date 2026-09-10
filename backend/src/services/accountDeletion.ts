import { AiConversation } from '../models/AiConversation.js';
import { BodyMeasurement } from '../models/BodyMeasurement.js';
import { CommunityExerciseMedia } from '../models/CommunityExerciseMedia.js';
import { ExerciseMedia } from '../models/ExerciseMedia.js';
import { GptUsage } from '../models/GptUsage.js';
import { HabitLog } from '../models/HabitLog.js';
import { MealLog } from '../models/MealLog.js';
import { NutritionGeneratedPlate } from '../models/NutritionGeneratedPlate.js';
import { NutritionPlan } from '../models/NutritionPlan.js';
import { NutritionPlatePhoto } from '../models/NutritionPlatePhoto.js';
import { NutritionTarget } from '../models/NutritionTarget.js';
import { NutritionWeighLog } from '../models/NutritionWeighLog.js';
import { Program } from '../models/Program.js';
import { User } from '../models/User.js';
import { WorkoutSession } from '../models/WorkoutSession.js';
import { deleteNutritionFile } from './nutritionStorage.js';

/**
 * Hard-delete a user and all user-owned application data.
 * Nutrition object storage keys are removed best-effort (failures are ignored).
 */
export async function hardDeleteUserAccount(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select('_id');
  if (!user) return false;

  const [photos, plates] = await Promise.all([
    NutritionPlatePhoto.find({ userId }).select('storageKey').lean(),
    NutritionGeneratedPlate.find({ userId }).select('storageKey').lean(),
  ]);

  const storageKeys = [
    ...photos.map((p) => p.storageKey),
    ...plates.map((p) => p.storageKey),
  ].filter((key): key is string => Boolean(key));

  await Promise.all(
    storageKeys.map((key) => deleteNutritionFile(key).catch(() => undefined)),
  );

  await Promise.all([
    AiConversation.deleteMany({ userId }),
    BodyMeasurement.deleteMany({ userId }),
    CommunityExerciseMedia.deleteMany({ contributedBy: userId }),
    ExerciseMedia.deleteMany({ ownerId: userId }),
    GptUsage.deleteMany({ userId }),
    HabitLog.deleteMany({ userId }),
    MealLog.deleteMany({ userId }),
    NutritionGeneratedPlate.deleteMany({ userId }),
    NutritionPlan.deleteMany({ userId }),
    NutritionPlatePhoto.deleteMany({ userId }),
    NutritionTarget.deleteMany({ userId }),
    NutritionWeighLog.deleteMany({ userId }),
    Program.deleteMany({ ownerId: userId }),
    WorkoutSession.deleteMany({ userId }),
  ]);

  await User.findByIdAndDelete(userId);
  return true;
}

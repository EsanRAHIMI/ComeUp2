// Computer Vision Service for Real-time Movement Tracking
// This is a foundation for integrating with TensorFlow.js or MediaPipe

interface PoseKeypoint {
  x: number;
  y: number;
  confidence: number;
}

interface Pose {
  keypoints: { [key: string]: PoseKeypoint };
  confidence: number;
}

interface MovementAnalysis {
  exercise: string;
  repCount: number;
  formScore: number;
  feedback: string[];
  phase: 'preparation' | 'execution' | 'return' | 'rest';
}

interface ExerciseValidator {
  name: string;
  keyPoints: string[];
  validateForm: (pose: Pose) => { score: number; issues: string[] };
  countRep: (poses: Pose[]) => boolean;
}

class ComputerVisionService {
  private currentExercise: string = '';
  private poseHistory: Pose[] = [];
  private repCount: number = 0;
  private lastRepTime: number = 0;
  private movementState: 'top' | 'bottom' | 'unknown' = 'unknown';

  // Exercise validators for different movements
  private validators: { [key: string]: ExerciseValidator } = {
    'push-ups': {
      name: 'Push-ups',
      keyPoints: ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'],
      validateForm: (pose: Pose) => this.validatePushUpForm(pose),
      countRep: (poses: Pose[]) => this.countPushUpRep(poses),
    },
    'squats': {
      name: 'Squats',
      keyPoints: ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'],
      validateForm: (pose: Pose) => this.validateSquatForm(pose),
      countRep: (poses: Pose[]) => this.countSquatRep(poses),
    },
    'lunges': {
      name: 'Lunges',
      keyPoints: ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'],
      validateForm: (pose: Pose) => this.validateLungeForm(pose),
      countRep: (poses: Pose[]) => this.countLungeRep(poses),
    },
  };

  setCurrentExercise(exerciseName: string): void {
    this.currentExercise = exerciseName.toLowerCase().replace(/\s+/g, '-');
    this.poseHistory = [];
    this.repCount = 0;
    this.lastRepTime = 0;
    this.movementState = 'unknown';
  }

  // Main analysis function called for each frame
  analyzePose(pose: Pose): MovementAnalysis {
    this.poseHistory.push(pose);
    
    // Keep only recent poses for analysis (last 30 frames)
    if (this.poseHistory.length > 30) {
      this.poseHistory.shift();
    }

    const validator = this.validators[this.currentExercise];
    if (!validator) {
      return this.getDefaultAnalysis();
    }

    // Validate current form
    const { score, issues } = validator.validateForm(pose);
    
    // Check for rep completion
    const repDetected = validator.countRep(this.poseHistory);
    if (repDetected && Date.now() - this.lastRepTime > 1000) { // Prevent double counting
      this.repCount++;
      this.lastRepTime = Date.now();
    }

    return {
      exercise: validator.name,
      repCount: this.repCount,
      formScore: score,
      feedback: this.generateFeedback(score, issues),
      phase: this.determineMovementPhase(pose, validator),
    };
  }

  // Push-up specific validation
  private validatePushUpForm(pose: Pose): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    // Check body alignment (simplified simulation)
    const shoulderToHip = this.calculateAngle(
      pose.keypoints.left_shoulder,
      pose.keypoints.left_hip,
      pose.keypoints.left_knee
    );

    if (Math.abs(shoulderToHip - 180) > 20) {
      issues.push('Keep your body straight');
      score -= 20;
    }

    // Check elbow position
    const elbowAngle = this.calculateAngle(
      pose.keypoints.left_shoulder,
      pose.keypoints.left_elbow,
      pose.keypoints.left_wrist
    );

    if (elbowAngle > 120) {
      issues.push('Lower your chest more');
      score -= 15;
    }

    return { score: Math.max(0, score), issues };
  }

  private validateSquatForm(pose: Pose): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    // Check knee alignment
    const kneeAngle = this.calculateAngle(
      pose.keypoints.left_hip,
      pose.keypoints.left_knee,
      pose.keypoints.left_ankle
    );

    if (kneeAngle > 100) {
      issues.push('Squat deeper');
      score -= 15;
    }

    // Check back straight
    const backAngle = this.calculateAngle(
      pose.keypoints.left_shoulder,
      pose.keypoints.left_hip,
      pose.keypoints.left_knee
    );

    if (backAngle < 160) {
      issues.push('Keep your back straight');
      score -= 20;
    }

    return { score: Math.max(0, score), issues };
  }

  private validateLungeForm(pose: Pose): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    // Check front knee angle
    const frontKneeAngle = this.calculateAngle(
      pose.keypoints.left_hip,
      pose.keypoints.left_knee,
      pose.keypoints.left_ankle
    );

    if (frontKneeAngle < 80 || frontKneeAngle > 100) {
      issues.push('Keep front knee at 90 degrees');
      score -= 20;
    }

    return { score: Math.max(0, score), issues };
  }

  private countPushUpRep(poses: Pose[]): boolean {
    const pose = poses[poses.length - 1];
    const elbowAngle = this.calculateAngle(
      pose.keypoints.left_shoulder,
      pose.keypoints.left_elbow,
      pose.keypoints.left_wrist
    );

    if (elbowAngle < 95) {
      this.movementState = 'bottom';
      return false;
    }

    if (this.movementState === 'bottom' && elbowAngle > 155) {
      this.movementState = 'top';
      return true;
    }

    if (elbowAngle > 155) {
      this.movementState = 'top';
    }

    return false;
  }

  private countSquatRep(poses: Pose[]): boolean {
    const pose = poses[poses.length - 1];
    const kneeAngle = this.calculateAngle(
      pose.keypoints.left_hip,
      pose.keypoints.left_knee,
      pose.keypoints.left_ankle
    );

    if (kneeAngle < 105) {
      this.movementState = 'bottom';
      return false;
    }

    if (this.movementState === 'bottom' && kneeAngle > 160) {
      this.movementState = 'top';
      return true;
    }

    if (kneeAngle > 160) {
      this.movementState = 'top';
    }

    return false;
  }

  private countLungeRep(poses: Pose[]): boolean {
    const pose = poses[poses.length - 1];
    const leftKneeAngle = this.calculateAngle(
      pose.keypoints.left_hip,
      pose.keypoints.left_knee,
      pose.keypoints.left_ankle
    );
    const rightKneeAngle = this.calculateAngle(
      pose.keypoints.right_hip,
      pose.keypoints.right_knee,
      pose.keypoints.right_ankle
    );
    const deepestKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
    const recoveredKneeAngle = Math.max(leftKneeAngle, rightKneeAngle);

    if (deepestKneeAngle < 105) {
      this.movementState = 'bottom';
      return false;
    }

    if (this.movementState === 'bottom' && recoveredKneeAngle > 155) {
      this.movementState = 'top';
      return true;
    }

    if (leftKneeAngle > 155 && rightKneeAngle > 155) {
      this.movementState = 'top';
    }

    return false;
  }

  // Utility functions
  private calculateAngle(point1: PoseKeypoint, point2: PoseKeypoint, point3: PoseKeypoint): number {
    if (!point1 || !point2 || !point3) return 180; // Default to straight line
    
    const vector1 = { x: point1.x - point2.x, y: point1.y - point2.y };
    const vector2 = { x: point3.x - point2.x, y: point3.y - point2.y };
    
    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    const cos = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
    
    return angle * (180 / Math.PI);
  }

  private generateFeedback(score: number, issues: string[]): string[] {
    const feedback: string[] = [];
    
    if (score >= 90) {
      feedback.push('Excellent form!');
    } else if (score >= 80) {
      feedback.push('Good form');
    } else if (score >= 70) {
      feedback.push('Watch your form');
    } else {
      feedback.push('Focus on technique');
    }

    return [...feedback, ...issues];
  }

  private determineMovementPhase(pose: Pose, validator: ExerciseValidator): 'preparation' | 'execution' | 'return' | 'rest' {
    // Simplified phase detection
    if (this.poseHistory.length < 5) return 'preparation';
    
    const recentMovement = this.calculateMovementVelocity(this.poseHistory.slice(-5));
    
    if (recentMovement > 10) return 'execution';
    if (recentMovement > 5) return 'return';
    return 'rest';
  }

  private calculateMovementVelocity(poses: Pose[]): number {
    if (poses.length < 2) return 0;
    
    let totalMovement = 0;
    for (let i = 1; i < poses.length; i++) {
      const prev = poses[i - 1];
      const curr = poses[i];
      
      // Calculate movement of key body parts
      const shoulderMovement = Math.sqrt(
        Math.pow((curr.keypoints.left_shoulder?.x || 0) - (prev.keypoints.left_shoulder?.x || 0), 2) +
        Math.pow((curr.keypoints.left_shoulder?.y || 0) - (prev.keypoints.left_shoulder?.y || 0), 2)
      );
      
      totalMovement += shoulderMovement;
    }
    
    return totalMovement / (poses.length - 1);
  }

  private getDefaultAnalysis(): MovementAnalysis {
    return {
      exercise: 'Unknown',
      repCount: 0,
      formScore: 0,
      feedback: ['Position yourself in camera view'],
      phase: 'preparation',
    };
  }

  // Reset session data
  resetSession(): void {
    this.poseHistory = [];
    this.repCount = 0;
    this.lastRepTime = 0;
    this.movementState = 'unknown';
  }

  // Get current rep count
  getCurrentRepCount(): number {
    return this.repCount;
  }
}

export const computerVisionService = new ComputerVisionService();

// Program Sharing Service
// Handles sharing workout programs between users

import { WorkoutProgram } from '../types/workout';

interface SharedProgram extends WorkoutProgram {
  shareCode: string;
  createdBy: string;
  sharedAt: string;
  downloadCount: number;
}

class ProgramSharingService {
  private sharedPrograms: Map<string, SharedProgram> = new Map();

  // Generate a unique share code for a program
  generateShareCode(program: WorkoutProgram): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`.toUpperCase();
  }

  // Share a program publicly
  shareProgram(program: WorkoutProgram, createdBy: string): string {
    const shareCode = this.generateShareCode(program);
    
    const sharedProgram: SharedProgram = {
      ...program,
      shareCode,
      createdBy,
      sharedAt: new Date().toISOString(),
      downloadCount: 0,
      isPublic: true,
    };

    this.sharedPrograms.set(shareCode, sharedProgram);
    return shareCode;
  }

  // Get program by share code
  getProgramByShareCode(shareCode: string): SharedProgram | null {
    const program = this.sharedPrograms.get(shareCode.toUpperCase());
    if (program) {
      // Increment download count
      program.downloadCount++;
      this.sharedPrograms.set(shareCode, program);
    }
    return program || null;
  }

  // Get all public programs
  getPublicPrograms(): SharedProgram[] {
    return Array.from(this.sharedPrograms.values())
      .filter(program => program.isPublic)
      .sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime());
  }

  // Search shared programs
  searchSharedPrograms(query: string): SharedProgram[] {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.getPublicPrograms();

    return this.getPublicPrograms().filter(program =>
      program.name.toLowerCase().includes(searchTerm) ||
      program.description.toLowerCase().includes(searchTerm) ||
      program.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      program.createdBy.toLowerCase().includes(searchTerm)
    );
  }

  // Import a shared program
  importProgram(shareCode: string): WorkoutProgram | null {
    const sharedProgram = this.getProgramByShareCode(shareCode);
    if (!sharedProgram) return null;

    // Create a new program instance for the user
    const importedProgram: WorkoutProgram = {
      ...sharedProgram,
      id: this.generateNewId(),
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shareCode: undefined, // Remove share code for imported program
    };

    return importedProgram;
  }

  // Generate QR code data for sharing
  generateQRCodeData(shareCode: string): string {
    return `comeup://program/${shareCode}`;
  }

  // Parse QR code data
  parseQRCodeData(qrData: string): string | null {
    const match = qrData.match(/comeup:\/\/program\/([A-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  private generateNewId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Get program statistics
  getProgramStats(shareCode: string): { downloads: number; sharedAt: string } | null {
    const program = this.sharedPrograms.get(shareCode.toUpperCase());
    if (!program) return null;

    return {
      downloads: program.downloadCount,
      sharedAt: program.sharedAt,
    };
  }

  // Remove shared program (only by creator)
  removeSharedProgram(shareCode: string, createdBy: string): boolean {
    const program = this.sharedPrograms.get(shareCode.toUpperCase());
    if (!program || program.createdBy !== createdBy) return false;

    this.sharedPrograms.delete(shareCode.toUpperCase());
    return true;
  }
}

export const programSharingService = new ProgramSharingService();
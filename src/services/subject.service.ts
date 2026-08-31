import { SubjectRepository } from '../repositories/interfaces.js';
import { Subject } from '../types/index.js';

export class SubjectService {
  constructor(private subjectRepo: SubjectRepository) {}

  async createSubject(userId: string, name: string): Promise<Subject> {
    if (!name || name.trim() === '') {
      throw new Error('subject name cannot be empty');
    }
    return this.subjectRepo.create({ user_id: userId, name: name.trim() });
  }

  async getSubjects(userId: string): Promise<Subject[]> {
    return this.subjectRepo.getAll(userId);
  }

  async updateSubject(userId: string, id: string, name: string): Promise<void> {
    if (!name || name.trim() === '') {
      throw new Error('subject name cannot be empty');
    }

    const existing = await this.subjectRepo.getById(id);
    if (!existing) {
      throw new Error('subject not found');
    }
    if (existing.user_id !== userId) {
      throw new Error('unauthorized to update this subject');
    }

    await this.subjectRepo.update({ id, user_id: userId, name: name.trim() });
  }

  async deleteSubject(userId: string, id: string): Promise<void> {
    const existing = await this.subjectRepo.getById(id);
    if (!existing) {
      throw new Error('subject not found');
    }
    if (existing.user_id !== userId) {
      throw new Error('unauthorized to delete this subject');
    }

    await this.subjectRepo.delete(id, userId);
  }
}

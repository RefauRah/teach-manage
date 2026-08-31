import { StudentRepository } from '../repositories/interfaces.js';
import { StudentRequest, StudentResponse, Parent } from '../types/index.js';

export class StudentService {
  constructor(private studentRepo: StudentRepository) {}

  async createStudent(userId: string, req: StudentRequest): Promise<StudentResponse> {
    if (!req.full_name || req.full_name.trim() === '') {
      throw new Error('student full name is required');
    }

    if (
      req.fee_model !== 'per_session' &&
      req.fee_model !== 'monthly' &&
      req.fee_model !== 'per_hour'
    ) {
      throw new Error('invalid fee model; must be per_session, monthly, or per_hour');
    }

    const studentData = {
      user_id: userId,
      full_name: req.full_name.trim(),
      birth_date: req.birth_date || null,
      gender: req.gender || '',
      address: req.address || '',
      school: req.school || '',
      grade: req.grade || '',
      phone: req.phone || '',
      notes: req.notes || '',
      fee_model: req.fee_model,
      fee_amount: Number(req.fee_amount || 0)
    };

    const parentData: Parent = {
      father_name: req.father_name || '',
      mother_name: req.mother_name || '',
      phones: req.phones || [],
      email: req.email || '',
      address: req.parent_address || '',
      occupation: req.occupation || ''
    };

    return this.studentRepo.create(studentData, parentData, req.subjects || []);
  }

  async getStudents(userId: string): Promise<StudentResponse[]> {
    return this.studentRepo.getAll(userId);
  }

  async getStudentById(userId: string, id: string): Promise<StudentResponse> {
    const res = await this.studentRepo.getById(id, userId);
    if (!res) {
      throw new Error('student not found');
    }
    return res;
  }

  async updateStudent(userId: string, id: string, req: StudentRequest): Promise<void> {
    const existing = await this.studentRepo.getById(id, userId);
    if (!existing) {
      throw new Error('student not found');
    }

    if (!req.full_name || req.full_name.trim() === '') {
      throw new Error('student full name is required');
    }

    if (
      req.fee_model !== 'per_session' &&
      req.fee_model !== 'monthly' &&
      req.fee_model !== 'per_hour'
    ) {
      throw new Error('invalid fee model');
    }

    const studentData = {
      id,
      user_id: userId,
      full_name: req.full_name.trim(),
      birth_date: req.birth_date || null,
      gender: req.gender || '',
      address: req.address || '',
      school: req.school || '',
      grade: req.grade || '',
      phone: req.phone || '',
      notes: req.notes || '',
      fee_model: req.fee_model,
      fee_amount: Number(req.fee_amount || 0)
    };

    const parentData: Parent = {
      student_id: id,
      father_name: req.father_name || '',
      mother_name: req.mother_name || '',
      phones: req.phones || [],
      email: req.email || '',
      address: req.parent_address || '',
      occupation: req.occupation || ''
    };

    await this.studentRepo.update(studentData, parentData, req.subjects);
  }

  async deleteStudent(userId: string, id: string): Promise<void> {
    const existing = await this.studentRepo.getById(id, userId);
    if (!existing) {
      throw new Error('student not found');
    }
    await this.studentRepo.delete(id, userId);
  }
}

package service

import (
	"errors"
	"teaching-management/internal/model"
	"teaching-management/internal/repository"

	"github.com/google/uuid"
)

type ScheduleService struct {
	scheduleRepo *repository.ScheduleRepository
	studentRepo  *repository.StudentRepository
	subjectRepo  *repository.SubjectRepository
}

func NewScheduleService(
	scheduleRepo *repository.ScheduleRepository,
	studentRepo *repository.StudentRepository,
	subjectRepo *repository.SubjectRepository,
) *ScheduleService {
	return &ScheduleService{
		scheduleRepo: scheduleRepo,
		studentRepo:  studentRepo,
		subjectRepo:  subjectRepo,
	}
}

func (s *ScheduleService) CreateSchedule(userID uuid.UUID, req *model.Schedule) (*model.Schedule, error) {
	student, err := s.studentRepo.GetByID(req.StudentID, userID)
	if err != nil {
		return nil, err
	}
	if student == nil {
		return nil, errors.New("student not found or unauthorized")
	}

	subject, err := s.subjectRepo.GetByID(req.SubjectID)
	if err != nil {
		return nil, err
	}
	if subject == nil || subject.UserID != userID {
		return nil, errors.New("subject not found or unauthorized")
	}

	if req.DayOfWeek < 0 || req.DayOfWeek > 6 {
		return nil, errors.New("day of week must be between 0 (Sunday) and 6 (Saturday)")
	}

	schedule := &model.Schedule{
		StudentID: req.StudentID,
		SubjectID: req.SubjectID,
		DayOfWeek: req.DayOfWeek,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		IsActive:  true,
	}

	err = s.scheduleRepo.Create(schedule)
	if err != nil {
		return nil, err
	}

	return schedule, nil
}

func (s *ScheduleService) GetSchedules(userID uuid.UUID) ([]model.ScheduleResponse, error) {
	return s.scheduleRepo.GetAll(userID)
}

func (s *ScheduleService) UpdateSchedule(userID uuid.UUID, id uuid.UUID, req *model.Schedule) error {
	existing, err := s.scheduleRepo.GetByID(id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("schedule not found")
	}

	student, err := s.studentRepo.GetByID(existing.StudentID, userID)
	if err != nil {
		return err
	}
	if student == nil {
		return errors.New("unauthorized access to schedule")
	}

	if req.StudentID != existing.StudentID {
		newStudent, err := s.studentRepo.GetByID(req.StudentID, userID)
		if err != nil {
			return err
		}
		if newStudent == nil {
			return errors.New("new student not found or unauthorized")
		}
	}

	if req.SubjectID != existing.SubjectID {
		newSubject, err := s.subjectRepo.GetByID(req.SubjectID)
		if err != nil {
			return err
		}
		if newSubject == nil || newSubject.UserID != userID {
			return errors.New("new subject not found or unauthorized")
		}
	}

	existing.StudentID = req.StudentID
	existing.SubjectID = req.SubjectID
	existing.DayOfWeek = req.DayOfWeek
	existing.StartTime = req.StartTime
	existing.EndTime = req.EndTime
	existing.IsActive = req.IsActive

	return s.scheduleRepo.Update(existing)
}

func (s *ScheduleService) DeleteSchedule(userID uuid.UUID, id uuid.UUID) error {
	existing, err := s.scheduleRepo.GetByID(id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("schedule not found")
	}

	student, err := s.studentRepo.GetByID(existing.StudentID, userID)
	if err != nil {
		return err
	}
	if student == nil {
		return errors.New("unauthorized access to schedule")
	}

	return s.scheduleRepo.Delete(id)
}

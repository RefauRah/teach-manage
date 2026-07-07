package service

import (
	"errors"
	"time"

	"teaching-management/internal/model"
	"teaching-management/internal/repository"

	"github.com/google/uuid"
)

type SessionService struct {
	sessionRepo  *repository.SessionRepository
	studentRepo  *repository.StudentRepository
	scheduleRepo *repository.ScheduleRepository
}

func NewSessionService(
	sessionRepo *repository.SessionRepository,
	studentRepo *repository.StudentRepository,
	scheduleRepo *repository.ScheduleRepository,
) *SessionService {
	return &SessionService{
		sessionRepo:  sessionRepo,
		studentRepo:  studentRepo,
		scheduleRepo: scheduleRepo,
	}
}

func (s *SessionService) CreateSession(userID uuid.UUID, req *model.Session) (*model.Session, error) {
	student, err := s.studentRepo.GetByID(req.StudentID, userID)
	if err != nil {
		return nil, err
	}
	if student == nil {
		return nil, errors.New("student not found or unauthorized")
	}

	// Verify subject belongs to user
	// A simple check is to look at student's subjects or look up subject directly
	// Let's check student's subjects to make sure it's valid
	subjectValid := false
	for _, sub := range student.Subjects {
		if sub.ID == req.SubjectID {
			subjectValid = true
			break
		}
	}
	if !subjectValid {
		return nil, errors.New("subject is not associated with this student")
	}

	if req.Status != "completed" && req.Status != "cancelled" && req.Status != "rescheduled" {
		return nil, errors.New("invalid status")
	}

	// Calculate fee
	var fee float64
	if req.Status != "cancelled" {
		fee = s.calculateFee(student.FeeModel, student.FeeAmount, req.StartTime, req.EndTime)
	}

	session := &model.Session{
		StudentID:     req.StudentID,
		SubjectID:     req.SubjectID,
		ScheduleID:    nil, // ad-hoc
		SessionDate:   req.SessionDate,
		StartTime:     req.StartTime,
		EndTime:       req.EndTime,
		Status:        req.Status,
		FeeCalculated: fee,
	}

	err = s.sessionRepo.Create(session)
	if err != nil {
		return nil, err
	}

	return session, nil
}

func (s *SessionService) GetSessions(userID uuid.UUID, startDate, endDate string, studentIDStr string) ([]model.SessionResponse, error) {
	var studentID *uuid.UUID
	if studentIDStr != "" {
		parsed, err := uuid.Parse(studentIDStr)
		if err == nil {
			studentID = &parsed
		}
	}

	return s.sessionRepo.GetAll(userID, startDate, endDate, studentID)
}

func (s *SessionService) UpdateSession(userID uuid.UUID, id uuid.UUID, req *model.Session) error {
	existing, err := s.sessionRepo.GetByID(id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("session not found")
	}

	// Verify student belongs to user
	student, err := s.studentRepo.GetByID(existing.StudentID, userID)
	if err != nil {
		return err
	}
	if student == nil {
		return errors.New("unauthorized access to session")
	}

	if req.Status != "completed" && req.Status != "cancelled" && req.Status != "rescheduled" {
		return errors.New("invalid status")
	}

	existing.SessionDate = req.SessionDate
	existing.StartTime = req.StartTime
	existing.EndTime = req.EndTime
	existing.Status = req.Status

	// Re-calculate fee
	if existing.Status == "cancelled" {
		existing.FeeCalculated = 0.0
	} else {
		existing.FeeCalculated = s.calculateFee(student.FeeModel, student.FeeAmount, existing.StartTime, existing.EndTime)
	}

	return s.sessionRepo.Update(existing)
}

func (s *SessionService) DeleteSession(userID uuid.UUID, id uuid.UUID) error {
	existing, err := s.sessionRepo.GetByID(id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("session not found")
	}

	// Verify ownership
	student, err := s.studentRepo.GetByID(existing.StudentID, userID)
	if err != nil {
		return err
	}
	if student == nil {
		return errors.New("unauthorized access to session")
	}

	return s.sessionRepo.Delete(id)
}

func (s *SessionService) GenerateSessionsFromSchedule(userID uuid.UUID, startDateStr, endDateStr string) (int, error) {
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		return 0, errors.New("invalid start date format, must be YYYY-MM-DD")
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		return 0, errors.New("invalid end date format, must be YYYY-MM-DD")
	}

	if endDate.Before(startDate) {
		return 0, errors.New("end date must be after or equal to start date")
	}

	// Get active schedules
	schedules, err := s.scheduleRepo.GetActiveWithStudentDetails(userID)
	if err != nil {
		return 0, err
	}

	if len(schedules) == 0 {
		return 0, nil
	}

	var sessionsToCreate []model.Session
	count := 0

	// Loop through each day in the date range
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		dayOfWeek := int(d.Weekday()) // time.Weekday matches our DayOfWeek mapping (0 = Sunday...6 = Saturday)
		dateStr := d.Format("2006-01-02")

		for _, sc := range schedules {
			if sc.DayOfWeek == dayOfWeek {
				// Check if duplicate
				exists, err := s.sessionRepo.CheckExists(sc.StudentID, sc.SubjectID, dateStr, sc.StartTime)
				if err != nil {
					continue
				}

				if !exists {
					fee := s.calculateFee(sc.FeeModel, sc.FeeAmount, sc.StartTime, sc.EndTime)
					
					scheduleIDCopy := sc.ID
					session := model.Session{
						StudentID:     sc.StudentID,
						SubjectID:     sc.SubjectID,
						ScheduleID:    &scheduleIDCopy,
						SessionDate:   d,
						StartTime:     sc.StartTime,
						EndTime:       sc.EndTime,
						Status:        "completed", // default status
						FeeCalculated: fee,
					}
					sessionsToCreate = append(sessionsToCreate, session)
					count++
				}
			}
		}
	}

	if len(sessionsToCreate) > 0 {
		err = s.sessionRepo.BulkCreate(sessionsToCreate)
		if err != nil {
			return 0, err
		}
	}

	return count, nil
}

func (s *SessionService) calculateFee(feeModel string, feeAmount float64, startTime, endTime string) float64 {
	if feeModel == "per_session" {
		return feeAmount
	}
	if feeModel == "monthly" {
		return 0.0 // flat monthly fee handled globally/recap, 0 per session
	}
	if feeModel == "per_hour" {
		// Clean times (remove possible timezone suffix or format to HH:MM)
		layoutStart := "15:04:05"
		if len(startTime) >= 5 {
			startTime = startTime[:5]
		}
		if len(startTime) == 5 {
			layoutStart = "15:04"
		}
		t1, err1 := time.Parse(layoutStart, startTime)

		layoutEnd := "15:04:05"
		if len(endTime) >= 5 {
			endTime = endTime[:5]
		}
		if len(endTime) == 5 {
			layoutEnd = "15:04"
		}
		t2, err2 := time.Parse(layoutEnd, endTime)

		if err1 != nil || err2 != nil {
			return 0.0
		}

		duration := t2.Sub(t1)
		hours := duration.Hours()
		if hours < 0 {
			hours += 24 // wraps next day
		}
		return hours * feeAmount
	}
	return 0.0
}

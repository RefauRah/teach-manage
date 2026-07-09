package repository

import (
	"teaching-management/pkg/model"

	"github.com/google/uuid"
)

type ActiveScheduleRow struct {
	ID        uuid.UUID `db:"id" json:"id"`
	StudentID uuid.UUID `db:"student_id" json:"student_id"`
	SubjectID uuid.UUID `db:"subject_id" json:"subject_id"`
	DayOfWeek int       `db:"day_of_week" json:"day_of_week"`
	StartTime string    `db:"start_time" json:"start_time"`
	EndTime   string    `db:"end_time" json:"end_time"`
	FeeModel  string    `db:"fee_model" json:"fee_model"`
	FeeAmount float64   `db:"fee_amount" json:"fee_amount"`
}

type UserRepository interface {
	Create(user *model.User) error
	GetByEmail(email string) (*model.User, error)
	GetByID(id uuid.UUID) (*model.User, error)
}

type SubjectRepository interface {
	Create(subject *model.Subject) error
	GetAll(userID uuid.UUID) ([]model.Subject, error)
	GetByID(id uuid.UUID) (*model.Subject, error)
	Update(subject *model.Subject) error
	Delete(id uuid.UUID, userID uuid.UUID) error
}

type StudentRepository interface {
	Create(student *model.Student, parent *model.Parent, subjectIDs []uuid.UUID) error
	Update(student *model.Student, parent *model.Parent, subjectIDs []uuid.UUID) error
	Delete(id uuid.UUID, userID uuid.UUID) error
	GetAll(userID uuid.UUID) ([]model.StudentResponse, error)
	GetByID(id uuid.UUID, userID uuid.UUID) (*model.StudentResponse, error)
}

type ScheduleRepository interface {
	Create(schedule *model.Schedule) error
	GetByID(id uuid.UUID) (*model.Schedule, error)
	GetAll(userID uuid.UUID) ([]model.ScheduleResponse, error)
	Update(schedule *model.Schedule) error
	Delete(id uuid.UUID) error
	GetActiveWithStudentDetails(userID uuid.UUID) ([]ActiveScheduleRow, error)
}

type SessionRepository interface {
	Create(session *model.Session) error
	GetByID(id uuid.UUID) (*model.Session, error)
	GetAll(userID uuid.UUID, startDate, endDate string, studentID *uuid.UUID) ([]model.SessionResponse, error)
	Update(session *model.Session) error
	Delete(id uuid.UUID) error
	BulkCreate(sessions []model.Session) error
	CheckExists(studentID uuid.UUID, subjectID uuid.UUID, sessionDate string, startTime string) (bool, error)
}

type ReportRepository interface {
	Create(report *model.Report) error
	Update(report *model.Report) error
	GetBySessionID(sessionID uuid.UUID, userID uuid.UUID) (*model.ReportResponse, error)
	GetByID(id uuid.UUID, userID uuid.UUID) (*model.ReportResponse, error)
}

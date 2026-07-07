package model

import (
	"time"

	"github.com/google/uuid"
)

type Schedule struct {
	ID        uuid.UUID `db:"id" json:"id"`
	StudentID uuid.UUID `db:"student_id" json:"student_id"`
	SubjectID uuid.UUID `db:"subject_id" json:"subject_id"`
	DayOfWeek int       `db:"day_of_week" json:"day_of_week"` // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
	StartTime string    `db:"start_time" json:"start_time"`   // TIME in DB, mapped to string e.g. "14:00:00"
	EndTime   string    `db:"end_time" json:"end_time"`       // TIME in DB, mapped to string e.g. "16:00:00"
	IsActive  bool      `db:"is_active" json:"is_active"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type ScheduleResponse struct {
	ID          uuid.UUID `db:"id" json:"id"`
	StudentID   uuid.UUID `db:"student_id" json:"student_id"`
	SubjectID   uuid.UUID `db:"subject_id" json:"subject_id"`
	DayOfWeek   int       `db:"day_of_week" json:"day_of_week"`
	StartTime   string    `db:"start_time" json:"start_time"`
	EndTime     string    `db:"end_time" json:"end_time"`
	IsActive    bool      `db:"is_active" json:"is_active"`
	StudentName string    `db:"student_name" json:"student_name"`
	SubjectName string    `db:"subject_name" json:"subject_name"`
}

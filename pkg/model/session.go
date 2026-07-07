package model

import (
	"time"

	"github.com/google/uuid"
)

type Session struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	StudentID     uuid.UUID  `db:"student_id" json:"student_id"`
	SubjectID     uuid.UUID  `db:"subject_id" json:"subject_id"`
	ScheduleID    *uuid.UUID `db:"schedule_id" json:"schedule_id"`
	SessionDate   time.Time  `db:"session_date" json:"session_date"`
	StartTime     string     `db:"start_time" json:"start_time"`
	EndTime       string     `db:"end_time" json:"end_time"`
	Status        string     `db:"status" json:"status"` // completed, cancelled, rescheduled
	FeeCalculated float64    `db:"fee_calculated" json:"fee_calculated"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at" json:"updated_at"`
}

type SessionResponse struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	StudentID     uuid.UUID  `db:"student_id" json:"student_id"`
	SubjectID     uuid.UUID  `db:"subject_id" json:"subject_id"`
	ScheduleID    *uuid.UUID `db:"schedule_id" json:"schedule_id"`
	SessionDate   time.Time  `db:"session_date" json:"session_date"`
	StartTime     string     `db:"start_time" json:"start_time"`
	EndTime       string     `db:"end_time" json:"end_time"`
	Status        string     `db:"status" json:"status"`
	FeeCalculated float64    `db:"fee_calculated" json:"fee_calculated"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at" json:"updated_at"`
	StudentName   string     `db:"student_name" json:"student_name"`
	SubjectName   string     `db:"subject_name" json:"subject_name"`
	HasReport     bool       `db:"has_report" json:"has_report"`
}

type GenerateSessionsRequest struct {
	StartDate string `json:"start_date"` // YYYY-MM-DD
	EndDate   string `json:"end_date"`   // YYYY-MM-DD
}

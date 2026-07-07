package model

import (
	"time"

	"github.com/google/uuid"
)

type Report struct {
	ID                 uuid.UUID `db:"id" json:"id"`
	SessionID          uuid.UUID `db:"session_id" json:"session_id"`
	MaterialTaught     string    `db:"material_taught" json:"material_taught"`
	ComprehensionScore int       `db:"comprehension_score" json:"comprehension_score"`
	ComprehensionNotes string    `db:"comprehension_notes" json:"comprehension_notes"`
	Homework           string    `db:"homework" json:"homework"`
	BehaviorNotes      string    `db:"behavior_notes" json:"behavior_notes"`
	Recommendations    string    `db:"recommendations" json:"recommendations"`
	TeacherSignature   string    `db:"teacher_signature" json:"teacher_signature"`
	ParentSignature    *string   `db:"parent_signature" json:"parent_signature"`
	CreatedAt          time.Time `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time `db:"updated_at" json:"updated_at"`
}

type ReportResponse struct {
	ID                 uuid.UUID `db:"id" json:"id"`
	SessionID          uuid.UUID `db:"session_id" json:"session_id"`
	MaterialTaught     string    `db:"material_taught" json:"material_taught"`
	ComprehensionScore int       `db:"comprehension_score" json:"comprehension_score"`
	ComprehensionNotes string    `db:"comprehension_notes" json:"comprehension_notes"`
	Homework           string    `db:"homework" json:"homework"`
	BehaviorNotes      string    `db:"behavior_notes" json:"behavior_notes"`
	Recommendations    string    `db:"recommendations" json:"recommendations"`
	TeacherSignature   string    `db:"teacher_signature" json:"teacher_signature"`
	ParentSignature    *string   `db:"parent_signature" json:"parent_signature"`
	CreatedAt          time.Time `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time `db:"updated_at" json:"updated_at"`
	StudentName        string    `db:"student_name" json:"student_name"`
	SubjectName        string    `db:"subject_name" json:"subject_name"`
	SessionDate        time.Time `db:"session_date" json:"session_date"`
	StartTime          string    `db:"start_time" json:"start_time"`
	EndTime            string    `db:"end_time" json:"end_time"`
}

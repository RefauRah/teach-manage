package repository

import (
	"encoding/json"
	"errors"
	"teaching-management/pkg/model"
	"time"

	"github.com/google/uuid"
)

type SupabaseReportRepository struct {
	client *SupabaseClient
}

func NewSupabaseReportRepository(urlStr, anonKey string) ReportRepository {
	return &SupabaseReportRepository{
		client: NewSupabaseClient(urlStr, anonKey),
	}
}

func (r *SupabaseReportRepository) Create(report *model.Report) error {
	if report.ID == uuid.Nil {
		report.ID = uuid.New()
	}

	resp, err := r.client.Request("POST", "/reports", nil, report, "return=representation")
	if err != nil {
		return err
	}

	var reports []model.Report
	if err := json.Unmarshal(resp, &reports); err != nil {
		return err
	}

	if len(reports) == 0 {
		return errors.New("failed to create report: empty response")
	}

	*report = reports[0]
	return nil
}

func (r *SupabaseReportRepository) Update(report *model.Report) error {
	params := map[string]string{
		"id": "eq." + report.ID.String(),
	}

	type updateReport struct {
		MaterialTaught     string    `json:"material_taught"`
		ComprehensionScore int       `json:"comprehension_score"`
		ComprehensionNotes string    `json:"comprehension_notes"`
		Homework           string    `json:"homework"`
		BehaviorNotes      string    `json:"behavior_notes"`
		Recommendations    string    `json:"recommendations"`
		TeacherSignature   string    `json:"teacher_signature"`
		ParentSignature    *string   `json:"parent_signature"`
		UpdatedAt          string    `json:"updated_at"`
	}

	body := updateReport{
		MaterialTaught:     report.MaterialTaught,
		ComprehensionScore: report.ComprehensionScore,
		ComprehensionNotes: report.ComprehensionNotes,
		Homework:           report.Homework,
		BehaviorNotes:      report.BehaviorNotes,
		Recommendations:    report.Recommendations,
		TeacherSignature:   report.TeacherSignature,
		ParentSignature:    report.ParentSignature,
		UpdatedAt:          "now()",
	}

	_, err := r.client.Request("PATCH", "/reports", params, body, "")
	return err
}

type reportRowJSON struct {
	ID                 uuid.UUID `json:"id"`
	SessionID          uuid.UUID `json:"session_id"`
	MaterialTaught     string    `json:"material_taught"`
	ComprehensionScore int       `json:"comprehension_score"`
	ComprehensionNotes string    `json:"comprehension_notes"`
	Homework           string    `json:"homework"`
	BehaviorNotes      string    `json:"behavior_notes"`
	Recommendations    string    `json:"recommendations"`
	TeacherSignature   string    `json:"teacher_signature"`
	ParentSignature    *string   `json:"parent_signature"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	Sessions           *struct {
		SessionDate time.Time `json:"session_date"`
		StartTime   string    `json:"start_time"`
		EndTime     string    `json:"end_time"`
		Students    *struct {
			FullName string `json:"full_name"`
		} `json:"students"`
		Subjects *struct {
			Name string `json:"name"`
		} `json:"subjects"`
	} `json:"sessions"`
}

func (r *SupabaseReportRepository) GetBySessionID(sessionID uuid.UUID, userID uuid.UUID) (*model.ReportResponse, error) {
	params := map[string]string{
		"select":                     "id,session_id,material_taught,comprehension_score,comprehension_notes,homework,behavior_notes,recommendations,teacher_signature,parent_signature,created_at,updated_at,sessions!inner(session_date,start_time,end_time,students!inner(full_name,user_id),subjects(name))",
		"session_id":                 "eq." + sessionID.String(),
		"sessions.students.user_id": "eq." + userID.String(),
	}

	resp, err := r.client.Request("GET", "/reports", params, nil, "")
	if err != nil {
		return nil, err
	}

	var rows []reportRowJSON
	if err := json.Unmarshal(resp, &rows); err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return nil, nil
	}

	row := rows[0]
	studentName := ""
	subjectName := ""
	var sessionDate time.Time
	startTime := ""
	endTime := ""
	if row.Sessions != nil {
		sessionDate = row.Sessions.SessionDate
		startTime = row.Sessions.StartTime
		endTime = row.Sessions.EndTime
		if row.Sessions.Students != nil {
			studentName = row.Sessions.Students.FullName
		}
		if row.Sessions.Subjects != nil {
			subjectName = row.Sessions.Subjects.Name
		}
	}

	return &model.ReportResponse{
		ID:                 row.ID,
		SessionID:          row.SessionID,
		MaterialTaught:     row.MaterialTaught,
		ComprehensionScore: row.ComprehensionScore,
		ComprehensionNotes: row.ComprehensionNotes,
		Homework:           row.Homework,
		BehaviorNotes:      row.BehaviorNotes,
		Recommendations:    row.Recommendations,
		TeacherSignature:   row.TeacherSignature,
		ParentSignature:    row.ParentSignature,
		CreatedAt:          row.CreatedAt,
		UpdatedAt:          row.UpdatedAt,
		StudentName:        studentName,
		SubjectName:        subjectName,
		SessionDate:        sessionDate,
		StartTime:          startTime,
		EndTime:            endTime,
	}, nil
}

func (r *SupabaseReportRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*model.ReportResponse, error) {
	params := map[string]string{
		"select":                     "id,session_id,material_taught,comprehension_score,comprehension_notes,homework,behavior_notes,recommendations,teacher_signature,parent_signature,created_at,updated_at,sessions!inner(session_date,start_time,end_time,students!inner(full_name,user_id),subjects(name))",
		"id":                         "eq." + id.String(),
		"sessions.students.user_id": "eq." + userID.String(),
	}

	resp, err := r.client.Request("GET", "/reports", params, nil, "")
	if err != nil {
		return nil, err
	}

	var rows []reportRowJSON
	if err := json.Unmarshal(resp, &rows); err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return nil, nil
	}

	row := rows[0]
	studentName := ""
	subjectName := ""
	var sessionDate time.Time
	startTime := ""
	endTime := ""
	if row.Sessions != nil {
		sessionDate = row.Sessions.SessionDate
		startTime = row.Sessions.StartTime
		endTime = row.Sessions.EndTime
		if row.Sessions.Students != nil {
			studentName = row.Sessions.Students.FullName
		}
		if row.Sessions.Subjects != nil {
			subjectName = row.Sessions.Subjects.Name
		}
	}

	return &model.ReportResponse{
		ID:                 row.ID,
		SessionID:          row.SessionID,
		MaterialTaught:     row.MaterialTaught,
		ComprehensionScore: row.ComprehensionScore,
		ComprehensionNotes: row.ComprehensionNotes,
		Homework:           row.Homework,
		BehaviorNotes:      row.BehaviorNotes,
		Recommendations:    row.Recommendations,
		TeacherSignature:   row.TeacherSignature,
		ParentSignature:    row.ParentSignature,
		CreatedAt:          row.CreatedAt,
		UpdatedAt:          row.UpdatedAt,
		StudentName:        studentName,
		SubjectName:        subjectName,
		SessionDate:        sessionDate,
		StartTime:          startTime,
		EndTime:            endTime,
	}, nil
}

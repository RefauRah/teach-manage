package repository

import (
	"encoding/json"
	"errors"
	"teaching-management/pkg/model"
	"time"

	"github.com/google/uuid"
)

type SupabaseSessionRepository struct {
	client *SupabaseClient
}

func NewSupabaseSessionRepository(urlStr, anonKey string) SessionRepository {
	return &SupabaseSessionRepository{
		client: NewSupabaseClient(urlStr, anonKey),
	}
}

func (r *SupabaseSessionRepository) Create(session *model.Session) error {
	if session.ID == uuid.Nil {
		session.ID = uuid.New()
	}

	resp, err := r.client.Request("POST", "/sessions", nil, session, "return=representation")
	if err != nil {
		return err
	}

	var sessions []model.Session
	if err := json.Unmarshal(resp, &sessions); err != nil {
		return err
	}

	if len(sessions) == 0 {
		return errors.New("failed to create session: empty response")
	}

	*session = sessions[0]
	return nil
}

func (r *SupabaseSessionRepository) GetByID(id uuid.UUID) (*model.Session, error) {
	params := map[string]string{
		"id": "eq." + id.String(),
	}

	resp, err := r.client.Request("GET", "/sessions", params, nil, "")
	if err != nil {
		return nil, err
	}

	var sessions []model.Session
	if err := json.Unmarshal(resp, &sessions); err != nil {
		return nil, err
	}

	if len(sessions) == 0 {
		return nil, nil
	}

	return &sessions[0], nil
}

func (r *SupabaseSessionRepository) GetAll(userID uuid.UUID, startDate, endDate string, studentID *uuid.UUID) ([]model.SessionResponse, error) {
	params := map[string]string{
		"select":           "id,student_id,subject_id,schedule_id,session_date,start_time,end_time,status,fee_calculated,created_at,updated_at,students!inner(full_name,user_id),subjects(name),reports(id)",
		"students.user_id": "eq." + userID.String(),
		"order":            "session_date.desc,start_time.desc",
	}

	if startDate != "" && endDate != "" {
		params["and"] = "(session_date.gte." + startDate + ",session_date.lte." + endDate + ")"
	} else if startDate != "" {
		params["session_date"] = "gte." + startDate
	} else if endDate != "" {
		params["session_date"] = "lte." + endDate
	}
	if studentID != nil {
		params["student_id"] = "eq." + studentID.String()
	}

	resp, err := r.client.Request("GET", "/sessions", params, nil, "")
	if err != nil {
		return nil, err
	}

	type sessionRowJSON struct {
		ID            uuid.UUID  `json:"id"`
		StudentID     uuid.UUID  `json:"student_id"`
		SubjectID     uuid.UUID  `json:"subject_id"`
		ScheduleID    *uuid.UUID `json:"schedule_id"`
		SessionDate   time.Time  `json:"session_date"`
		StartTime     string     `json:"start_time"`
		EndTime       string     `json:"end_time"`
		Status        string     `json:"status"`
		FeeCalculated float64    `json:"fee_calculated"`
		CreatedAt     time.Time  `json:"created_at"`
		UpdatedAt     time.Time  `json:"updated_at"`
		Students      *struct {
			FullName string `json:"full_name"`
		} `json:"students"`
		Subjects *struct {
			Name string `json:"name"`
		} `json:"subjects"`
		Reports []struct {
			ID uuid.UUID `json:"id"`
		} `json:"reports"`
	}

	var rows []sessionRowJSON
	if err := json.Unmarshal(resp, &rows); err != nil {
		return nil, err
	}

	var responses = make([]model.SessionResponse, len(rows))
	for i, row := range rows {
		studentName := ""
		if row.Students != nil {
			studentName = row.Students.FullName
		}
		subjectName := ""
		if row.Subjects != nil {
			subjectName = row.Subjects.Name
		}
		hasReport := len(row.Reports) > 0

		responses[i] = model.SessionResponse{
			ID:            row.ID,
			StudentID:     row.StudentID,
			SubjectID:     row.SubjectID,
			ScheduleID:    row.ScheduleID,
			SessionDate:   row.SessionDate,
			StartTime:     row.StartTime,
			EndTime:       row.EndTime,
			Status:        row.Status,
			FeeCalculated: row.FeeCalculated,
			CreatedAt:     row.CreatedAt,
			UpdatedAt:     row.UpdatedAt,
			StudentName:   studentName,
			SubjectName:   subjectName,
			HasReport:     hasReport,
		}
	}

	return responses, nil
}

func (r *SupabaseSessionRepository) Update(session *model.Session) error {
	params := map[string]string{
		"id": "eq." + session.ID.String(),
	}

	type updateSession struct {
		StudentID     uuid.UUID  `json:"student_id"`
		SubjectID     uuid.UUID  `json:"subject_id"`
		ScheduleID    *uuid.UUID `json:"schedule_id"`
		SessionDate   string     `json:"session_date"`
		StartTime     string     `json:"start_time"`
		EndTime       string     `json:"end_time"`
		Status        string     `json:"status"`
		FeeCalculated float64    `json:"fee_calculated"`
		UpdatedAt     string     `json:"updated_at"`
	}

	body := updateSession{
		StudentID:     session.StudentID,
		SubjectID:     session.SubjectID,
		ScheduleID:    session.ScheduleID,
		SessionDate:   session.SessionDate.Format("2006-01-02"),
		StartTime:     session.StartTime,
		EndTime:       session.EndTime,
		Status:        session.Status,
		FeeCalculated: session.FeeCalculated,
		UpdatedAt:     "now()",
	}

	_, err := r.client.Request("PATCH", "/sessions", params, body, "")
	return err
}

func (r *SupabaseSessionRepository) Delete(id uuid.UUID) error {
	params := map[string]string{
		"id": "eq." + id.String(),
	}

	_, err := r.client.Request("DELETE", "/sessions", params, nil, "")
	return err
}

func (r *SupabaseSessionRepository) BulkCreate(sessions []model.Session) error {
	if len(sessions) == 0 {
		return nil
	}

	// Generate IDs for all sessions if not present
	for i := range sessions {
		if sessions[i].ID == uuid.Nil {
			sessions[i].ID = uuid.New()
		}
	}

	// PostgREST accepts bulk insert via POST with JSON array
	_, err := r.client.Request("POST", "/sessions", nil, sessions, "")
	return err
}

func (r *SupabaseSessionRepository) CheckExists(studentID uuid.UUID, subjectID uuid.UUID, sessionDate string, startTime string) (bool, error) {
	params := map[string]string{
		"student_id":   "eq." + studentID.String(),
		"subject_id":   "eq." + subjectID.String(),
		"session_date": "eq." + sessionDate,
		"start_time":   "eq." + startTime,
		"select":       "id",
		"limit":        "1",
	}

	resp, err := r.client.Request("GET", "/sessions", params, nil, "")
	if err != nil {
		return false, err
	}

	var results []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(resp, &results); err != nil {
		return false, err
	}

	return len(results) > 0, nil
}

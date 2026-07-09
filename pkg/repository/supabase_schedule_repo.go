package repository

import (
	"encoding/json"
	"errors"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
)

type SupabaseScheduleRepository struct {
	client *SupabaseClient
}

func NewSupabaseScheduleRepository(urlStr, anonKey string) ScheduleRepository {
	return &SupabaseScheduleRepository{
		client: NewSupabaseClient(urlStr, anonKey),
	}
}

func (r *SupabaseScheduleRepository) Create(schedule *model.Schedule) error {
	if schedule.ID == uuid.Nil {
		schedule.ID = uuid.New()
	}

	resp, err := r.client.Request("POST", "/schedules", nil, schedule, "return=representation")
	if err != nil {
		return err
	}

	var schedules []model.Schedule
	if err := json.Unmarshal(resp, &schedules); err != nil {
		return err
	}

	if len(schedules) == 0 {
		return errors.New("failed to create schedule: empty response")
	}

	*schedule = schedules[0]
	return nil
}

func (r *SupabaseScheduleRepository) GetByID(id uuid.UUID) (*model.Schedule, error) {
	params := map[string]string{
		"id": "eq." + id.String(),
	}

	resp, err := r.client.Request("GET", "/schedules", params, nil, "")
	if err != nil {
		return nil, err
	}

	var schedules []model.Schedule
	if err := json.Unmarshal(resp, &schedules); err != nil {
		return nil, err
	}

	if len(schedules) == 0 {
		return nil, nil
	}

	return &schedules[0], nil
}

func (r *SupabaseScheduleRepository) GetAll(userID uuid.UUID) ([]model.ScheduleResponse, error) {
	params := map[string]string{
		"select":           "id,student_id,subject_id,day_of_week,start_time,end_time,is_active,students!inner(full_name,user_id),subjects(name)",
		"students.user_id": "eq." + userID.String(),
		"order":            "day_of_week.asc,start_time.asc",
	}

	resp, err := r.client.Request("GET", "/schedules", params, nil, "")
	if err != nil {
		return nil, err
	}

	type scheduleRowJSON struct {
		ID        uuid.UUID `json:"id"`
		StudentID uuid.UUID `json:"student_id"`
		SubjectID uuid.UUID `json:"subject_id"`
		DayOfWeek int       `json:"day_of_week"`
		StartTime string    `json:"start_time"`
		EndTime   string    `json:"end_time"`
		IsActive  bool      `json:"is_active"`
		Students  *struct {
			FullName string `json:"full_name"`
		} `json:"students"`
		Subjects *struct {
			Name string `json:"name"`
		} `json:"subjects"`
	}

	var rows []scheduleRowJSON
	if err := json.Unmarshal(resp, &rows); err != nil {
		return nil, err
	}

	var responses = make([]model.ScheduleResponse, len(rows))
	for i, row := range rows {
		studentName := ""
		if row.Students != nil {
			studentName = row.Students.FullName
		}
		subjectName := ""
		if row.Subjects != nil {
			subjectName = row.Subjects.Name
		}

		responses[i] = model.ScheduleResponse{
			ID:          row.ID,
			StudentID:   row.StudentID,
			SubjectID:   row.SubjectID,
			DayOfWeek:   row.DayOfWeek,
			StartTime:   row.StartTime,
			EndTime:     row.EndTime,
			IsActive:    row.IsActive,
			StudentName: studentName,
			SubjectName: subjectName,
		}
	}

	return responses, nil
}

func (r *SupabaseScheduleRepository) Update(schedule *model.Schedule) error {
	params := map[string]string{
		"id": "eq." + schedule.ID.String(),
	}

	type updateSchedule struct {
		StudentID uuid.UUID `json:"student_id"`
		SubjectID uuid.UUID `json:"subject_id"`
		DayOfWeek int       `json:"day_of_week"`
		StartTime string    `json:"start_time"`
		EndTime   string    `json:"end_time"`
		IsActive  bool      `json:"is_active"`
		UpdatedAt string    `json:"updated_at"`
	}

	body := updateSchedule{
		StudentID: schedule.StudentID,
		SubjectID: schedule.SubjectID,
		DayOfWeek: schedule.DayOfWeek,
		StartTime: schedule.StartTime,
		EndTime:   schedule.EndTime,
		IsActive:  schedule.IsActive,
		UpdatedAt: "now()",
	}

	_, err := r.client.Request("PATCH", "/schedules", params, body, "")
	return err
}

func (r *SupabaseScheduleRepository) Delete(id uuid.UUID) error {
	params := map[string]string{
		"id": "eq." + id.String(),
	}

	_, err := r.client.Request("DELETE", "/schedules", params, nil, "")
	return err
}

func (r *SupabaseScheduleRepository) GetActiveWithStudentDetails(userID uuid.UUID) ([]ActiveScheduleRow, error) {
	params := map[string]string{
		"select":           "id,student_id,subject_id,day_of_week,start_time,end_time,students!inner(fee_model,fee_amount,user_id)",
		"is_active":        "eq.true",
		"students.user_id": "eq." + userID.String(),
	}

	resp, err := r.client.Request("GET", "/schedules", params, nil, "")
	if err != nil {
		return nil, err
	}

	type activeRowJSON struct {
		ID        uuid.UUID `json:"id"`
		StudentID uuid.UUID `json:"student_id"`
		SubjectID uuid.UUID `json:"subject_id"`
		DayOfWeek int       `json:"day_of_week"`
		StartTime string    `json:"start_time"`
		EndTime   string    `json:"end_time"`
		Students  *struct {
			FeeModel  string  `json:"fee_model"`
			FeeAmount float64 `json:"fee_amount"`
		} `json:"students"`
	}

	var rows []activeRowJSON
	if err := json.Unmarshal(resp, &rows); err != nil {
		return nil, err
	}

	var responses = make([]ActiveScheduleRow, len(rows))
	for i, row := range rows {
		feeModel := ""
		feeAmount := 0.0
		if row.Students != nil {
			feeModel = row.Students.FeeModel
			feeAmount = row.Students.FeeAmount
		}

		responses[i] = ActiveScheduleRow{
			ID:        row.ID,
			StudentID: row.StudentID,
			SubjectID: row.SubjectID,
			DayOfWeek: row.DayOfWeek,
			StartTime: row.StartTime,
			EndTime:   row.EndTime,
			FeeModel:  feeModel,
			FeeAmount: feeAmount,
		}
	}

	return responses, nil
}

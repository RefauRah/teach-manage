package repository

import (
	"database/sql"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PostgresScheduleRepository struct {
	db *sqlx.DB
}

func NewPostgresScheduleRepository(db *sqlx.DB) ScheduleRepository {
	return &PostgresScheduleRepository{db: db}
}

func (r *PostgresScheduleRepository) Create(schedule *model.Schedule) error {
	query := `INSERT INTO schedules (student_id, subject_id, day_of_week, start_time, end_time, is_active) 
	          VALUES ($1, $2, $3, $4, $5, $6) 
	          RETURNING id, created_at, updated_at`
	return r.db.QueryRow(query, schedule.StudentID, schedule.SubjectID, schedule.DayOfWeek, schedule.StartTime, schedule.EndTime, schedule.IsActive).
		Scan(&schedule.ID, &schedule.CreatedAt, &schedule.UpdatedAt)
}

func (r *PostgresScheduleRepository) GetByID(id uuid.UUID) (*model.Schedule, error) {
	var schedule model.Schedule
	query := `SELECT id, student_id, subject_id, day_of_week, start_time::text, end_time::text, is_active, created_at, updated_at 
	          FROM schedules WHERE id = $1`
	err := r.db.Get(&schedule, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &schedule, nil
}

func (r *PostgresScheduleRepository) GetAll(userID uuid.UUID) ([]model.ScheduleResponse, error) {
	var schedules = []model.ScheduleResponse{}
	query := `SELECT sc.id, sc.student_id, sc.subject_id, sc.day_of_week, sc.start_time::text, sc.end_time::text, sc.is_active, 
	                 st.full_name AS student_name, su.name AS subject_name 
	          FROM schedules sc
	          JOIN students st ON sc.student_id = st.id
	          JOIN subjects su ON sc.subject_id = su.id
	          WHERE st.user_id = $1
	          ORDER BY sc.day_of_week ASC, sc.start_time ASC`
	err := r.db.Select(&schedules, query, userID)
	if err != nil {
		return nil, err
	}
	return schedules, nil
}

func (r *PostgresScheduleRepository) Update(schedule *model.Schedule) error {
	query := `UPDATE schedules 
	          SET student_id = $1, subject_id = $2, day_of_week = $3, start_time = $4, end_time = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP 
	          WHERE id = $7`
	_, err := r.db.Exec(query, schedule.StudentID, schedule.SubjectID, schedule.DayOfWeek, schedule.StartTime, schedule.EndTime, schedule.IsActive, schedule.ID)
	return err
}

func (r *PostgresScheduleRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM schedules WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}


func (r *PostgresScheduleRepository) GetActiveWithStudentDetails(userID uuid.UUID) ([]ActiveScheduleRow, error) {
	var rows = []ActiveScheduleRow{}
	query := `SELECT sc.id, sc.student_id, sc.subject_id, sc.day_of_week, sc.start_time::text, sc.end_time::text, 
	                 st.fee_model, st.fee_amount 
	          FROM schedules sc
	          JOIN students st ON sc.student_id = st.id
	          WHERE st.user_id = $1 AND sc.is_active = TRUE`
	err := r.db.Select(&rows, query, userID)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

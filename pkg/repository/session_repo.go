package repository

import (
	"database/sql"
	"fmt"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SessionRepository struct {
	db *sqlx.DB
}

func NewSessionRepository(db *sqlx.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(session *model.Session) error {
	query := `INSERT INTO sessions (student_id, subject_id, schedule_id, session_date, start_time, end_time, status, fee_calculated) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
	          RETURNING id, created_at, updated_at`
	return r.db.QueryRow(query, session.StudentID, session.SubjectID, session.ScheduleID, session.SessionDate, session.StartTime, session.EndTime, session.Status, session.FeeCalculated).
		Scan(&session.ID, &session.CreatedAt, &session.UpdatedAt)
}

func (r *SessionRepository) GetByID(id uuid.UUID) (*model.Session, error) {
	var session model.Session
	query := `SELECT id, student_id, subject_id, schedule_id, session_date, start_time::text, end_time::text, status, fee_calculated, created_at, updated_at 
	          FROM sessions WHERE id = $1`
	err := r.db.Get(&session, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

func (r *SessionRepository) GetAll(userID uuid.UUID, startDate, endDate string, studentID *uuid.UUID) ([]model.SessionResponse, error) {
	var sessions = []model.SessionResponse{}
	query := `SELECT s.id, s.student_id, s.subject_id, s.schedule_id, s.session_date, s.start_time::text, s.end_time::text, s.status, s.fee_calculated, s.created_at, s.updated_at,
	                 st.full_name AS student_name, su.name AS subject_name,
	                 (CASE WHEN rep.id IS NOT NULL THEN TRUE ELSE FALSE END) as has_report
	          FROM sessions s
	          JOIN students st ON s.student_id = st.id
	          JOIN subjects su ON s.subject_id = su.id
	          LEFT JOIN reports rep ON rep.session_id = s.id
	          WHERE st.user_id = $1`

	args := []interface{}{userID}
	placeholderIndex := 2

	if startDate != "" {
		query += fmt.Sprintf(" AND s.session_date >= $%d", placeholderIndex)
		args = append(args, startDate)
		placeholderIndex++
	}

	if endDate != "" {
		query += fmt.Sprintf(" AND s.session_date <= $%d", placeholderIndex)
		args = append(args, endDate)
		placeholderIndex++
	}

	if studentID != nil {
		query += fmt.Sprintf(" AND s.student_id = $%d", placeholderIndex)
		args = append(args, *studentID)
		placeholderIndex++
	}

	query += " ORDER BY s.session_date DESC, s.start_time DESC"

	err := r.db.Select(&sessions, query, args...)
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *SessionRepository) Update(session *model.Session) error {
	query := `UPDATE sessions 
	          SET student_id = $1, subject_id = $2, schedule_id = $3, session_date = $4, start_time = $5, end_time = $6, status = $7, fee_calculated = $8, updated_at = CURRENT_TIMESTAMP 
	          WHERE id = $9`
	_, err := r.db.Exec(query, session.StudentID, session.SubjectID, session.ScheduleID, session.SessionDate, session.StartTime, session.EndTime, session.Status, session.FeeCalculated, session.ID)
	return err
}

func (r *SessionRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM sessions WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *SessionRepository) BulkCreate(sessions []model.Session) error {
	if len(sessions) == 0 {
		return nil
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `INSERT INTO sessions (student_id, subject_id, schedule_id, session_date, start_time, end_time, status, fee_calculated) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	for _, s := range sessions {
		_, err = tx.Exec(query, s.StudentID, s.SubjectID, s.ScheduleID, s.SessionDate, s.StartTime, s.EndTime, s.Status, s.FeeCalculated)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *SessionRepository) CheckExists(studentID uuid.UUID, subjectID uuid.UUID, sessionDate string, startTime string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(
		SELECT 1 FROM sessions 
		WHERE student_id = $1 AND subject_id = $2 AND session_date = $3 AND start_time = $4
	)`
	err := r.db.Get(&exists, query, studentID, subjectID, sessionDate, startTime)
	return exists, err
}

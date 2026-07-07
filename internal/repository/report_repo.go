package repository

import (
	"database/sql"
	"teaching-management/internal/model"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ReportRepository struct {
	db *sqlx.DB
}

func NewReportRepository(db *sqlx.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

func (r *ReportRepository) Create(report *model.Report) error {
	query := `INSERT INTO reports (session_id, material_taught, comprehension_score, comprehension_notes, homework, behavior_notes, recommendations, teacher_signature, parent_signature) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
	          RETURNING id, created_at, updated_at`
	return r.db.QueryRow(query, report.SessionID, report.MaterialTaught, report.ComprehensionScore, report.ComprehensionNotes, report.Homework, report.BehaviorNotes, report.Recommendations, report.TeacherSignature, report.ParentSignature).
		Scan(&report.ID, &report.CreatedAt, &report.UpdatedAt)
}

func (r *ReportRepository) Update(report *model.Report) error {
	query := `UPDATE reports 
	          SET material_taught = $1, comprehension_score = $2, comprehension_notes = $3, homework = $4, behavior_notes = $5, recommendations = $6, teacher_signature = $7, parent_signature = $8, updated_at = CURRENT_TIMESTAMP 
	          WHERE id = $9`
	_, err := r.db.Exec(query, report.MaterialTaught, report.ComprehensionScore, report.ComprehensionNotes, report.Homework, report.BehaviorNotes, report.Recommendations, report.TeacherSignature, report.ParentSignature, report.ID)
	return err
}

func (r *ReportRepository) GetBySessionID(sessionID uuid.UUID, userID uuid.UUID) (*model.ReportResponse, error) {
	var resp model.ReportResponse
	query := `SELECT r.id, r.session_id, r.material_taught, r.comprehension_score, r.comprehension_notes, r.homework, r.behavior_notes, r.recommendations, r.teacher_signature, r.parent_signature, r.created_at, r.updated_at,
	                 st.full_name AS student_name, su.name AS subject_name, se.session_date, se.start_time::text, se.end_time::text
	          FROM reports r
	          JOIN sessions se ON r.session_id = se.id
	          JOIN students st ON se.student_id = st.id
	          JOIN subjects su ON se.subject_id = su.id
	          WHERE r.session_id = $1 AND st.user_id = $2`
	err := r.db.Get(&resp, query, sessionID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &resp, nil
}

func (r *ReportRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*model.ReportResponse, error) {
	var resp model.ReportResponse
	query := `SELECT r.id, r.session_id, r.material_taught, r.comprehension_score, r.comprehension_notes, r.homework, r.behavior_notes, r.recommendations, r.teacher_signature, r.parent_signature, r.created_at, r.updated_at,
	                 st.full_name AS student_name, su.name AS subject_name, se.session_date, se.start_time::text, se.end_time::text
	          FROM reports r
	          JOIN sessions se ON r.session_id = se.id
	          JOIN students st ON se.student_id = st.id
	          JOIN subjects su ON se.subject_id = su.id
	          WHERE r.id = $1 AND st.user_id = $2`
	err := r.db.Get(&resp, query, id, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &resp, nil
}

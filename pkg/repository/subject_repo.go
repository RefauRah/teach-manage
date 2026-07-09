package repository

import (
	"database/sql"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PostgresSubjectRepository struct {
	db *sqlx.DB
}

func NewPostgresSubjectRepository(db *sqlx.DB) SubjectRepository {
	return &PostgresSubjectRepository{db: db}
}

func (r *PostgresSubjectRepository) Create(subject *model.Subject) error {
	query := `INSERT INTO subjects (user_id, name) 
	          VALUES ($1, $2) 
	          RETURNING id`
	return r.db.QueryRow(query, subject.UserID, subject.Name).Scan(&subject.ID)
}

func (r *PostgresSubjectRepository) GetAll(userID uuid.UUID) ([]model.Subject, error) {
	var subjects = []model.Subject{}
	query := `SELECT id, user_id, name FROM subjects WHERE user_id = $1 ORDER BY name ASC`
	err := r.db.Select(&subjects, query, userID)
	if err != nil {
		return nil, err
	}
	return subjects, nil
}

func (r *PostgresSubjectRepository) GetByID(id uuid.UUID) (*model.Subject, error) {
	var subject model.Subject
	query := `SELECT id, user_id, name FROM subjects WHERE id = $1`
	err := r.db.Get(&subject, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &subject, nil
}

func (r *PostgresSubjectRepository) Update(subject *model.Subject) error {
	query := `UPDATE subjects SET name = $1 WHERE id = $2 AND user_id = $3`
	_, err := r.db.Exec(query, subject.Name, subject.ID, subject.UserID)
	return err
}

func (r *PostgresSubjectRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	query := `DELETE FROM subjects WHERE id = $1 AND user_id = $2`
	_, err := r.db.Exec(query, id, userID)
	return err
}

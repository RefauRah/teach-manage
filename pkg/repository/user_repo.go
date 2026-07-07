package repository

import (
	"database/sql"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *model.User) error {
	query := `INSERT INTO users (name, email, password_hash) 
	          VALUES ($1, $2, $3) 
	          RETURNING id, created_at, updated_at`
	return r.db.QueryRow(query, user.Name, user.Email, user.PasswordHash).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *UserRepository) GetByEmail(email string) (*model.User, error) {
	var user model.User
	query := `SELECT id, name, email, password_hash, created_at, updated_at 
	          FROM users WHERE email = $1`
	err := r.db.Get(&user, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByID(id uuid.UUID) (*model.User, error) {
	var user model.User
	query := `SELECT id, name, email, password_hash, created_at, updated_at 
	          FROM users WHERE id = $1`
	err := r.db.Get(&user, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

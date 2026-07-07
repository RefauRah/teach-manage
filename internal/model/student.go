package model

import (
	"time"

	"github.com/google/uuid"
)

type Student struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	UserID    uuid.UUID  `db:"user_id" json:"user_id"`
	FullName  string     `db:"full_name" json:"full_name"`
	BirthDate *time.Time `db:"birth_date" json:"birth_date"`
	Gender    string     `db:"gender" json:"gender"`
	Address   string     `db:"address" json:"address"`
	School    string     `db:"school" json:"school"`
	Grade     string     `db:"grade" json:"grade"`
	Phone     string     `db:"phone" json:"phone"`
	Notes     string     `db:"notes" json:"notes"`
	FeeModel  string     `db:"fee_model" json:"fee_model"` // per_session, monthly, per_hour
	FeeAmount float64    `db:"fee_amount" json:"fee_amount"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
}

type StudentRequest struct {
	FullName  string     `json:"full_name"`
	BirthDate *time.Time `json:"birth_date"`
	Gender    string     `json:"gender"`
	Address   string     `json:"address"`
	School    string     `json:"school"`
	Grade     string     `json:"grade"`
	Phone     string     `json:"phone"`
	Notes     string     `json:"notes"`
	FeeModel  string     `json:"fee_model"`
	FeeAmount float64    `json:"fee_amount"`
	Subjects  []uuid.UUID `json:"subjects"`
	
	// Parent information nested
	FatherName string      `json:"father_name"`
	MotherName string      `json:"mother_name"`
	Phones     StringSlice `json:"phones"`
	Email      string      `json:"email"`
	ParentAddr string      `json:"parent_address"`
	Occupation string      `json:"occupation"`
}

type StudentResponse struct {
	ID        uuid.UUID   `json:"id"`
	UserID    uuid.UUID   `json:"user_id"`
	FullName  string      `json:"full_name"`
	BirthDate *time.Time  `json:"birth_date"`
	Gender    string      `json:"gender"`
	Address   string      `json:"address"`
	School    string      `json:"school"`
	Grade     string      `json:"grade"`
	Phone     string      `json:"phone"`
	Notes     string      `json:"notes"`
	FeeModel  string      `json:"fee_model"`
	FeeAmount float64     `json:"fee_amount"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	Parent    *Parent     `json:"parent"`
	Subjects  []Subject   `json:"subjects"`
}

package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
)

// StringSlice is a wrapper to scan JSONB array of strings in PostgreSQL
type StringSlice []string

func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, s)
}

func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(s)
}

type Parent struct {
	ID         uuid.UUID   `db:"id" json:"id"`
	StudentID  uuid.UUID   `db:"student_id" json:"student_id"`
	FatherName string      `db:"father_name" json:"father_name"`
	MotherName string      `db:"mother_name" json:"mother_name"`
	Phones     StringSlice `db:"phones" json:"phones"`
	Email      string      `db:"email" json:"email"`
	Address    string      `db:"address" json:"address"`
	Occupation string      `db:"occupation" json:"occupation"`
}

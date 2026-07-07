package model

import "github.com/google/uuid"

type Subject struct {
	ID     uuid.UUID `db:"id" json:"id"`
	UserID uuid.UUID `db:"user_id" json:"user_id"`
	Name   string    `db:"name" json:"name"`
}

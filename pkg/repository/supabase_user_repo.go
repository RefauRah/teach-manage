package repository

import (
	"encoding/json"
	"errors"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
)

type SupabaseUserRepository struct {
	client *SupabaseClient
}

func NewSupabaseUserRepository(urlStr, anonKey string) UserRepository {
	return &SupabaseUserRepository{
		client: NewSupabaseClient(urlStr, anonKey),
	}
}

type supabaseUser struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"`
	CreatedAt    *string   `json:"created_at,omitempty"`
	UpdatedAt    *string   `json:"updated_at,omitempty"`
}

func (r *SupabaseUserRepository) Create(user *model.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}

	payload := supabaseUser{
		ID:           user.ID,
		Name:         user.Name,
		Email:        user.Email,
		PasswordHash: user.PasswordHash,
	}

	resp, err := r.client.Request("POST", "/users", nil, payload, "return=representation")
	if err != nil {
		return err
	}

	var users []supabaseUser
	if err := json.Unmarshal(resp, &users); err != nil {
		return err
	}

	if len(users) == 0 {
		return errors.New("failed to create user in supabase: empty response")
	}

	u := users[0]
	user.ID = u.ID
	user.Name = u.Name
	user.Email = u.Email
	user.PasswordHash = u.PasswordHash
	return nil
}

func (r *SupabaseUserRepository) GetByEmail(email string) (*model.User, error) {
	params := map[string]string{
		"email": "eq." + email,
	}

	resp, err := r.client.Request("GET", "/users", params, nil, "")
	if err != nil {
		return nil, err
	}

	var users []supabaseUser
	if err := json.Unmarshal(resp, &users); err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, nil
	}

	u := users[0]
	return &model.User{
		ID:           u.ID,
		Name:         u.Name,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
	}, nil
}

func (r *SupabaseUserRepository) GetByID(id uuid.UUID) (*model.User, error) {
	params := map[string]string{
		"id": "eq." + id.String(),
	}

	resp, err := r.client.Request("GET", "/users", params, nil, "")
	if err != nil {
		return nil, err
	}

	var users []supabaseUser
	if err := json.Unmarshal(resp, &users); err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, nil
	}

	u := users[0]
	return &model.User{
		ID:           u.ID,
		Name:         u.Name,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
	}, nil
}

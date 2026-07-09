package repository

import (
	"encoding/json"
	"errors"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
)

type SupabaseSubjectRepository struct {
	client *SupabaseClient
}

func NewSupabaseSubjectRepository(urlStr, anonKey string) SubjectRepository {
	return &SupabaseSubjectRepository{
		client: NewSupabaseClient(urlStr, anonKey),
	}
}

func (r *SupabaseSubjectRepository) Create(subject *model.Subject) error {
	if subject.ID == uuid.Nil {
		subject.ID = uuid.New()
	}

	resp, err := r.client.Request("POST", "/subjects", nil, subject, "return=representation")
	if err != nil {
		return err
	}

	var subjects []model.Subject
	if err := json.Unmarshal(resp, &subjects); err != nil {
		return err
	}

	if len(subjects) == 0 {
		return errors.New("failed to create subject: empty response")
	}

	*subject = subjects[0]
	return nil
}

func (r *SupabaseSubjectRepository) GetAll(userID uuid.UUID) ([]model.Subject, error) {
	params := map[string]string{
		"user_id": "eq." + userID.String(),
		"order":   "name.asc",
	}

	resp, err := r.client.Request("GET", "/subjects", params, nil, "")
	if err != nil {
		return nil, err
	}

	var subjects []model.Subject
	if err := json.Unmarshal(resp, &subjects); err != nil {
		return nil, err
	}

	return subjects, nil
}

func (r *SupabaseSubjectRepository) GetByID(id uuid.UUID) (*model.Subject, error) {
	params := map[string]string{
		"id": "eq." + id.String(),
	}

	resp, err := r.client.Request("GET", "/subjects", params, nil, "")
	if err != nil {
		return nil, err
	}

	var subjects []model.Subject
	if err := json.Unmarshal(resp, &subjects); err != nil {
		return nil, err
	}

	if len(subjects) == 0 {
		return nil, nil
	}

	return &subjects[0], nil
}

func (r *SupabaseSubjectRepository) Update(subject *model.Subject) error {
	params := map[string]string{
		"id":      "eq." + subject.ID.String(),
		"user_id": "eq." + subject.UserID.String(),
	}

	type updateSubject struct {
		Name string `json:"name"`
	}
	body := updateSubject{Name: subject.Name}

	_, err := r.client.Request("PATCH", "/subjects", params, body, "")
	return err
}

func (r *SupabaseSubjectRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	params := map[string]string{
		"id":      "eq." + id.String(),
		"user_id": "eq." + userID.String(),
	}

	_, err := r.client.Request("DELETE", "/subjects", params, nil, "")
	return err
}

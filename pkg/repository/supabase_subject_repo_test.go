package repository

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
)

func TestSupabaseSubjectRepository_GetAll(t *testing.T) {
	userID := uuid.New()
	mockSubjects := []model.Subject{
		{ID: uuid.New(), UserID: userID, Name: "Biology"},
		{ID: uuid.New(), UserID: userID, Name: "Chemistry"},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			t.Errorf("Expected GET request, got %s", r.Method)
		}
		if r.URL.Path != "/rest/v1/subjects" {
			t.Errorf("Expected path /rest/v1/subjects, got %s", r.URL.Path)
		}
		if r.URL.Query().Get("user_id") != "eq."+userID.String() {
			t.Errorf("Expected user_id eq.%s, got '%s'", userID, r.URL.Query().Get("user_id"))
		}
		if r.URL.Query().Get("order") != "name.asc" {
			t.Errorf("Expected order 'name.asc', got '%s'", r.URL.Query().Get("order"))
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockSubjects)
	}))
	defer server.Close()

	repo := NewSupabaseSubjectRepository(server.URL, "test-key")

	subjects, err := repo.GetAll(userID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(subjects) != 2 {
		t.Errorf("Expected 2 subjects, got %d", len(subjects))
	}
	if subjects[0].Name != "Biology" || subjects[1].Name != "Chemistry" {
		t.Errorf("Subject names mismatch")
	}
}

func TestSupabaseSubjectRepository_Update(t *testing.T) {
	subjectID := uuid.New()
	userID := uuid.New()
	subject := &model.Subject{
		ID:     subjectID,
		UserID: userID,
		Name:   "Physics",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "PATCH" {
			t.Errorf("Expected PATCH request, got %s", r.Method)
		}
		if r.URL.Path != "/rest/v1/subjects" {
			t.Errorf("Expected path /rest/v1/subjects, got %s", r.URL.Path)
		}
		if r.URL.Query().Get("id") != "eq."+subjectID.String() {
			t.Errorf("Expected id query 'eq.%s', got '%s'", subjectID, r.URL.Query().Get("id"))
		}

		var payload struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal("Failed to decode payload")
		}

		if payload.Name != "Physics" {
			t.Errorf("Expected name 'Physics', got '%s'", payload.Name)
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	repo := NewSupabaseSubjectRepository(server.URL, "test-key")

	err := repo.Update(subject)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

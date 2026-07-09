package repository

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
)

func TestSupabaseUserRepository_Create(t *testing.T) {
	expectedID := uuid.New()
	mockUser := model.User{
		ID:           expectedID,
		Name:         "Test User",
		Email:        "test@example.com",
		PasswordHash: "hashed_password",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request details
		if r.Method != "POST" {
			t.Errorf("Expected POST request, got %s", r.Method)
		}
		if r.URL.Path != "/rest/v1/users" {
			t.Errorf("Expected path /rest/v1/users, got %s", r.URL.Path)
		}
		if r.Header.Get("apikey") != "test-key" {
			t.Errorf("Expected apikey header 'test-key', got '%s'", r.Header.Get("apikey"))
		}
		if r.Header.Get("Prefer") != "return=representation" {
			t.Errorf("Expected Prefer header 'return=representation', got '%s'", r.Header.Get("Prefer"))
		}

		// Read and verify body
		var payload model.User
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal("Failed to decode request body")
		}

		if payload.Name != mockUser.Name || payload.Email != mockUser.Email {
			t.Errorf("Request body mismatch. Expected name=%s, email=%s", mockUser.Name, mockUser.Email)
		}

		// Respond with JSON array containing the user
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode([]model.User{mockUser})
	}))
	defer server.Close()

	repo := NewSupabaseUserRepository(server.URL, "test-key")

	user := &model.User{
		Name:         "Test User",
		Email:        "test@example.com",
		PasswordHash: "hashed_password",
	}

	err := repo.Create(user)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if user.ID != expectedID {
		t.Errorf("Expected user ID to be updated to %s, got %s", expectedID, user.ID)
	}
}

func TestSupabaseUserRepository_GetByEmail(t *testing.T) {
	expectedID := uuid.New()
	mockUser := model.User{
		ID:           expectedID,
		Name:         "Test User",
		Email:        "test@example.com",
		PasswordHash: "hashed_password",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify query parameter
		emailQuery := r.URL.Query().Get("email")
		if emailQuery != "eq.test@example.com" {
			t.Errorf("Expected query parameter email=eq.test@example.com, got '%s'", emailQuery)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]model.User{mockUser})
	}))
	defer server.Close()

	repo := NewSupabaseUserRepository(server.URL, "test-key")

	user, err := repo.GetByEmail("test@example.com")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if user == nil {
		t.Fatal("Expected user to be returned, got nil")
	}

	if user.ID != expectedID {
		t.Errorf("Expected user ID to be %s, got %s", expectedID, user.ID)
	}
}

func TestSupabaseUserRepository_GetByEmail_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("[]"))
	}))
	defer server.Close()

	repo := NewSupabaseUserRepository(server.URL, "test-key")

	user, err := repo.GetByEmail("notfound@example.com")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if user != nil {
		t.Errorf("Expected nil user, got %+v", user)
	}
}

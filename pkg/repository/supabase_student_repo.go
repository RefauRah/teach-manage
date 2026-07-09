package repository

import (
	"encoding/json"
	"fmt"
	"strings"
	"teaching-management/pkg/model"

	"github.com/google/uuid"
)

type SupabaseStudentRepository struct {
	client *SupabaseClient
}

func NewSupabaseStudentRepository(urlStr, anonKey string) StudentRepository {
	return &SupabaseStudentRepository{
		client: NewSupabaseClient(urlStr, anonKey),
	}
}

type studentSubjectPayload struct {
	StudentID uuid.UUID `json:"student_id"`
	SubjectID uuid.UUID `json:"subject_id"`
}

func (r *SupabaseStudentRepository) Create(student *model.Student, parent *model.Parent, subjectIDs []uuid.UUID) error {
	if student.ID == uuid.Nil {
		student.ID = uuid.New()
	}
	parent.StudentID = student.ID
	if parent.ID == uuid.Nil {
		parent.ID = uuid.New()
	}

	// 1. Create Student
	respStudent, err := r.client.Request("POST", "/students", nil, student, "return=representation")
	if err != nil {
		return err
	}
	var createdStudents []model.Student
	if err := json.Unmarshal(respStudent, &createdStudents); err != nil || len(createdStudents) == 0 {
		return fmt.Errorf("failed to parse created student response: %w", err)
	}
	*student = createdStudents[0]

	// 2. Create Parent
	respParent, err := r.client.Request("POST", "/parents", nil, parent, "return=representation")
	if err != nil {
		return err
	}
	var createdParents []model.Parent
	if err := json.Unmarshal(respParent, &createdParents); err != nil || len(createdParents) == 0 {
		return fmt.Errorf("failed to parse created parent response: %w", err)
	}
	*parent = createdParents[0]

	// 3. Create Student Subjects
	if len(subjectIDs) > 0 {
		payloads := make([]studentSubjectPayload, len(subjectIDs))
		for i, subID := range subjectIDs {
			payloads[i] = studentSubjectPayload{
				StudentID: student.ID,
				SubjectID: subID,
			}
		}
		_, err = r.client.Request("POST", "/student_subjects", nil, payloads, "")
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *SupabaseStudentRepository) Update(student *model.Student, parent *model.Parent, subjectIDs []uuid.UUID) error {
	// 1. Update Student
	paramsStudent := map[string]string{
		"id":      "eq." + student.ID.String(),
		"user_id": "eq." + student.UserID.String(),
	}
	// Omit id, user_id, created_at, updated_at from update payload to be safe
	type studentUpdatePayload struct {
		FullName  string      `json:"full_name"`
		BirthDate *string     `json:"birth_date,omitempty"`
		Gender    string      `json:"gender"`
		Address   string      `json:"address"`
		School    string      `json:"school"`
		Grade     string      `json:"grade"`
		Phone     string      `json:"phone"`
		Notes     string      `json:"notes"`
		FeeModel  string      `json:"fee_model"`
		FeeAmount float64     `json:"fee_amount"`
		UpdatedAt string      `json:"updated_at"`
	}

	var birthDateStr *string
	if student.BirthDate != nil {
		formatted := student.BirthDate.Format("2006-01-02")
		birthDateStr = &formatted
	}

	payload := studentUpdatePayload{
		FullName:  student.FullName,
		BirthDate: birthDateStr,
		Gender:    student.Gender,
		Address:   student.Address,
		School:    student.School,
		Grade:     student.Grade,
		Phone:     student.Phone,
		Notes:     student.Notes,
		FeeModel:  student.FeeModel,
		FeeAmount: student.FeeAmount,
		UpdatedAt: "now()",
	}

	_, err := r.client.Request("PATCH", "/students", paramsStudent, payload, "")
	if err != nil {
		return err
	}

	// 2. Update Parent
	paramsParent := map[string]string{
		"student_id": "eq." + student.ID.String(),
	}
	type parentUpdatePayload struct {
		FatherName string            `json:"father_name"`
		MotherName string            `json:"mother_name"`
		Phones     model.StringSlice `json:"phones"`
		Email      string            `json:"email"`
		Address    string            `json:"address"`
		Occupation string            `json:"occupation"`
	}
	payloadParent := parentUpdatePayload{
		FatherName: parent.FatherName,
		MotherName: parent.MotherName,
		Phones:     parent.Phones,
		Email:      parent.Email,
		Address:    parent.Address,
		Occupation: parent.Occupation,
	}

	_, err = r.client.Request("PATCH", "/parents", paramsParent, payloadParent, "")
	if err != nil {
		return err
	}

	// 3. Update Student Subjects (Delete and Re-insert)
	paramsDeleteSubjects := map[string]string{
		"student_id": "eq." + student.ID.String(),
	}
	_, err = r.client.Request("DELETE", "/student_subjects", paramsDeleteSubjects, nil, "")
	if err != nil {
		return err
	}

	if len(subjectIDs) > 0 {
		payloads := make([]studentSubjectPayload, len(subjectIDs))
		for i, subID := range subjectIDs {
			payloads[i] = studentSubjectPayload{
				StudentID: student.ID,
				SubjectID: subID,
			}
		}
		_, err = r.client.Request("POST", "/student_subjects", nil, payloads, "")
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *SupabaseStudentRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	params := map[string]string{
		"id":      "eq." + id.String(),
		"user_id": "eq." + userID.String(),
	}
	_, err := r.client.Request("DELETE", "/students", params, nil, "")
	return err
}

func (r *SupabaseStudentRepository) GetAll(userID uuid.UUID) ([]model.StudentResponse, error) {
	params := map[string]string{
		"user_id": "eq." + userID.String(),
		"order":   "full_name.asc",
	}

	respBytes, err := r.client.Request("GET", "/students", params, nil, "")
	if err != nil {
		return nil, err
	}

	var students []model.Student
	if err := json.Unmarshal(respBytes, &students); err != nil {
		return nil, err
	}

	if len(students) == 0 {
		return []model.StudentResponse{}, nil
	}

	studentIDs := make([]string, len(students))
	studentMap := make(map[uuid.UUID]*model.StudentResponse)
	responses := make([]model.StudentResponse, len(students))

	for i, s := range students {
		studentIDs[i] = s.ID.String()
		responses[i] = model.StudentResponse{
			ID:        s.ID,
			UserID:    s.UserID,
			FullName:  s.FullName,
			BirthDate: s.BirthDate,
			Gender:    s.Gender,
			Address:   s.Address,
			School:    s.School,
			Grade:     s.Grade,
			Phone:     s.Phone,
			Notes:     s.Notes,
			FeeModel:  s.FeeModel,
			FeeAmount: s.FeeAmount,
			CreatedAt: s.CreatedAt,
			UpdatedAt: s.UpdatedAt,
			Subjects:  []model.Subject{},
		}
	}

	for i := range responses {
		studentMap[responses[i].ID] = &responses[i]
	}

	// Fetch parents
	inFilter := "in.(" + strings.Join(studentIDs, ",") + ")"
	parentParams := map[string]string{
		"student_id": inFilter,
	}
	respParentsBytes, err := r.client.Request("GET", "/parents", parentParams, nil, "")
	if err == nil {
		var parents []model.Parent
		if json.Unmarshal(respParentsBytes, &parents) == nil {
			for _, p := range parents {
				if resp, ok := studentMap[p.StudentID]; ok {
					resp.Parent = &p
				}
			}
		}
	}

	// Fetch student subjects
	subParams := map[string]string{
		"select":     "student_id,subject_id,subjects(id,name)",
		"student_id": inFilter,
	}
	respSubBytes, err := r.client.Request("GET", "/student_subjects", subParams, nil, "")
	if err == nil {
		type subEmbed struct {
			ID   uuid.UUID `json:"id"`
			Name string    `json:"name"`
		}
		type studentSubjectRow struct {
			StudentID uuid.UUID `json:"student_id"`
			SubjectID uuid.UUID `json:"subject_id"`
			Subjects  *subEmbed `json:"subjects"`
		}

		var ssRows []studentSubjectRow
		if json.Unmarshal(respSubBytes, &ssRows) == nil {
			for _, row := range ssRows {
				if row.Subjects != nil {
					if resp, ok := studentMap[row.StudentID]; ok {
						resp.Subjects = append(resp.Subjects, model.Subject{
							ID:   row.Subjects.ID,
							Name: row.Subjects.Name,
						})
					}
				}
			}
		}
	}

	return responses, nil
}

func (r *SupabaseStudentRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*model.StudentResponse, error) {
	params := map[string]string{
		"id":      "eq." + id.String(),
		"user_id": "eq." + userID.String(),
	}

	respBytes, err := r.client.Request("GET", "/students", params, nil, "")
	if err != nil {
		return nil, err
	}

	var students []model.Student
	if err := json.Unmarshal(respBytes, &students); err != nil {
		return nil, err
	}

	if len(students) == 0 {
		return nil, nil
	}

	s := students[0]
	resp := &model.StudentResponse{
		ID:        s.ID,
		UserID:    s.UserID,
		FullName:  s.FullName,
		BirthDate: s.BirthDate,
		Gender:    s.Gender,
		Address:   s.Address,
		School:    s.School,
		Grade:     s.Grade,
		Phone:     s.Phone,
		Notes:     s.Notes,
		FeeModel:  s.FeeModel,
		FeeAmount: s.FeeAmount,
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
		Subjects:  []model.Subject{},
	}

	// Fetch parent
	parentParams := map[string]string{
		"student_id": "eq." + s.ID.String(),
	}
	respParentBytes, err := r.client.Request("GET", "/parents", parentParams, nil, "")
	if err == nil {
		var parents []model.Parent
		if json.Unmarshal(respParentBytes, &parents) == nil && len(parents) > 0 {
			resp.Parent = &parents[0]
		}
	}

	// Fetch subjects
	subParams := map[string]string{
		"select":     "student_id,subject_id,subjects(id,name)",
		"student_id": "eq." + s.ID.String(),
	}
	respSubBytes, err := r.client.Request("GET", "/student_subjects", subParams, nil, "")
	if err == nil {
		type subEmbed struct {
			ID   uuid.UUID `json:"id"`
			Name string    `json:"name"`
		}
		type studentSubjectRow struct {
			StudentID uuid.UUID `json:"student_id"`
			SubjectID uuid.UUID `json:"subject_id"`
			Subjects  *subEmbed `json:"subjects"`
		}

		var ssRows []studentSubjectRow
		if json.Unmarshal(respSubBytes, &ssRows) == nil {
			for _, row := range ssRows {
				if row.Subjects != nil {
					resp.Subjects = append(resp.Subjects, model.Subject{
						ID:   row.Subjects.ID,
						Name: row.Subjects.Name,
					})
				}
			}
		}
	}

	return resp, nil
}

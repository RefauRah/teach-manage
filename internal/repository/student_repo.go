package repository

import (
	"database/sql"
	"teaching-management/internal/model"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type StudentRepository struct {
	db *sqlx.DB
}

func NewStudentRepository(db *sqlx.DB) *StudentRepository {
	return &StudentRepository{db: db}
}

func (r *StudentRepository) Create(student *model.Student, parent *model.Parent, subjectIDs []uuid.UUID) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Insert Student
	queryStudent := `INSERT INTO students (user_id, full_name, birth_date, gender, address, school, grade, phone, notes, fee_model, fee_amount)
	                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	                 RETURNING id, created_at, updated_at`
	err = tx.QueryRow(queryStudent, student.UserID, student.FullName, student.BirthDate, student.Gender, student.Address, student.School, student.Grade, student.Phone, student.Notes, student.FeeModel, student.FeeAmount).
		Scan(&student.ID, &student.CreatedAt, &student.UpdatedAt)
	if err != nil {
		return err
	}

	// 2. Insert Parent
	queryParent := `INSERT INTO parents (student_id, father_name, mother_name, phones, email, address, occupation)
	                VALUES ($1, $2, $3, $4, $5, $6, $7)
	                RETURNING id`
	parent.StudentID = student.ID
	err = tx.QueryRow(queryParent, parent.StudentID, parent.FatherName, parent.MotherName, parent.Phones, parent.Email, parent.Address, parent.Occupation).
		Scan(&parent.ID)
	if err != nil {
		return err
	}

	// 3. Insert Student Subjects
	if len(subjectIDs) > 0 {
		querySubject := `INSERT INTO student_subjects (student_id, subject_id) VALUES ($1, $2)`
		for _, subjectID := range subjectIDs {
			_, err = tx.Exec(querySubject, student.ID, subjectID)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (r *StudentRepository) Update(student *model.Student, parent *model.Parent, subjectIDs []uuid.UUID) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Update Student
	queryStudent := `UPDATE students SET full_name = $1, birth_date = $2, gender = $3, address = $4, school = $5, grade = $6, phone = $7, notes = $8, fee_model = $9, fee_amount = $10, updated_at = CURRENT_TIMESTAMP
	                 WHERE id = $11 AND user_id = $12`
	_, err = tx.Exec(queryStudent, student.FullName, student.BirthDate, student.Gender, student.Address, student.School, student.Grade, student.Phone, student.Notes, student.FeeModel, student.FeeAmount, student.ID, student.UserID)
	if err != nil {
		return err
	}

	// 2. Update Parent
	queryParent := `UPDATE parents SET father_name = $1, mother_name = $2, phones = $3, email = $4, address = $5, occupation = $6
	                WHERE student_id = $7`
	_, err = tx.Exec(queryParent, parent.FatherName, parent.MotherName, parent.Phones, parent.Email, parent.Address, parent.Occupation, student.ID)
	if err != nil {
		return err
	}

	// 3. Update Student Subjects (Delete and Re-insert)
	queryDeleteSubjects := `DELETE FROM student_subjects WHERE student_id = $1`
	_, err = tx.Exec(queryDeleteSubjects, student.ID)
	if err != nil {
		return err
	}

	if len(subjectIDs) > 0 {
		querySubject := `INSERT INTO student_subjects (student_id, subject_id) VALUES ($1, $2)`
		for _, subjectID := range subjectIDs {
			_, err = tx.Exec(querySubject, student.ID, subjectID)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (r *StudentRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	query := `DELETE FROM students WHERE id = $1 AND user_id = $2`
	_, err := r.db.Exec(query, id, userID)
	return err
}

func (r *StudentRepository) GetAll(userID uuid.UUID) ([]model.StudentResponse, error) {
	var students []model.Student
	query := `SELECT id, user_id, full_name, birth_date, gender, address, school, grade, phone, notes, fee_model, fee_amount, created_at, updated_at 
	          FROM students WHERE user_id = $1 ORDER BY full_name ASC`
	err := r.db.Select(&students, query, userID)
	if err != nil {
		return nil, err
	}

	if len(students) == 0 {
		return []model.StudentResponse{}, nil
	}

	studentIDs := make([]uuid.UUID, len(students))
	studentMap := make(map[uuid.UUID]*model.StudentResponse)
	var responses []model.StudentResponse

	for i, s := range students {
		studentIDs[i] = s.ID
		resp := model.StudentResponse{
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
		responses = append(responses, resp)
	}
	
	for i := range responses {
		studentMap[responses[i].ID] = &responses[i]
	}

	var parents []model.Parent
	queryParents := `SELECT id, student_id, father_name, mother_name, phones, email, address, occupation 
	                 FROM parents WHERE student_id IN (?)`
	queryParents, args, err := sqlx.In(queryParents, studentIDs)
	if err == nil {
		queryParents = r.db.Rebind(queryParents)
		err = r.db.Select(&parents, queryParents, args...)
		if err == nil {
			for _, p := range parents {
				if resp, ok := studentMap[p.StudentID]; ok {
					resp.Parent = &p
				}
			}
		}
	}

	type StudentSubjectRow struct {
		StudentID uuid.UUID `db:"student_id"`
		ID        uuid.UUID `db:"id"`
		Name      string    `db:"name"`
	}
	var ssRows []StudentSubjectRow
	querySubjects := `SELECT ss.student_id, s.id, s.name 
	                  FROM student_subjects ss 
	                  JOIN subjects s ON ss.subject_id = s.id 
	                  WHERE ss.student_id IN (?)`
	querySubjects, args, err = sqlx.In(querySubjects, studentIDs)
	if err == nil {
		querySubjects = r.db.Rebind(querySubjects)
		err = r.db.Select(&ssRows, querySubjects, args...)
		if err == nil {
			for _, row := range ssRows {
				if resp, ok := studentMap[row.StudentID]; ok {
					resp.Subjects = append(resp.Subjects, model.Subject{
						ID:   row.ID,
						Name: row.Name,
					})
				}
			}
		}
	}

	return responses, nil
}

func (r *StudentRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*model.StudentResponse, error) {
	var s model.Student
	query := `SELECT id, user_id, full_name, birth_date, gender, address, school, grade, phone, notes, fee_model, fee_amount, created_at, updated_at 
	          FROM students WHERE id = $1 AND user_id = $2`
	err := r.db.Get(&s, query, id, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

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

	var p model.Parent
	queryParent := `SELECT id, student_id, father_name, mother_name, phones, email, address, occupation 
	                FROM parents WHERE student_id = $1`
	err = r.db.Get(&p, queryParent, s.ID)
	if err == nil {
		resp.Parent = &p
	}

	var subjects []model.Subject
	querySubjects := `SELECT s.id, s.name 
	                  FROM student_subjects ss 
	                  JOIN subjects s ON ss.subject_id = s.id 
	                  WHERE ss.student_id = $1`
	err = r.db.Select(&subjects, querySubjects, s.ID)
	if err == nil {
		resp.Subjects = subjects
	}

	return resp, nil
}

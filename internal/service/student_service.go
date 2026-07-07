package service

import (
	"errors"
	"teaching-management/internal/model"
	"teaching-management/internal/repository"

	"github.com/google/uuid"
)

type StudentService struct {
	studentRepo *repository.StudentRepository
}

func NewStudentService(studentRepo *repository.StudentRepository) *StudentService {
	return &StudentService{studentRepo: studentRepo}
}

func (s *StudentService) CreateStudent(userID uuid.UUID, req *model.StudentRequest) (*model.StudentResponse, error) {
	if req.FullName == "" {
		return nil, errors.New("student full name is required")
	}
	if req.FeeModel != "per_session" && req.FeeModel != "monthly" && req.FeeModel != "per_hour" {
		return nil, errors.New("invalid fee model; must be per_session, monthly, or per_hour")
	}

	student := &model.Student{
		UserID:    userID,
		FullName:  req.FullName,
		BirthDate: req.BirthDate,
		Gender:    req.Gender,
		Address:   req.Address,
		School:    req.School,
		Grade:     req.Grade,
		Phone:     req.Phone,
		Notes:     req.Notes,
		FeeModel:  req.FeeModel,
		FeeAmount: req.FeeAmount,
	}

	parent := &model.Parent{
		FatherName: req.FatherName,
		MotherName: req.MotherName,
		Phones:     req.Phones,
		Email:      req.Email,
		Address:    req.ParentAddr,
		Occupation: req.Occupation,
	}

	err := s.studentRepo.Create(student, parent, req.Subjects)
	if err != nil {
		return nil, err
	}

	return s.studentRepo.GetByID(student.ID, userID)
}

func (s *StudentService) GetStudents(userID uuid.UUID) ([]model.StudentResponse, error) {
	return s.studentRepo.GetAll(userID)
}

func (s *StudentService) GetStudentByID(userID uuid.UUID, id uuid.UUID) (*model.StudentResponse, error) {
	res, err := s.studentRepo.GetByID(id, userID)
	if err != nil {
		return nil, err
	}
	if res == nil {
		return nil, errors.New("student not found")
	}
	return res, nil
}

func (s *StudentService) UpdateStudent(userID uuid.UUID, id uuid.UUID, req *model.StudentRequest) error {
	existing, err := s.studentRepo.GetByID(id, userID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("student not found")
	}

	if req.FullName == "" {
		return errors.New("student full name is required")
	}
	if req.FeeModel != "per_session" && req.FeeModel != "monthly" && req.FeeModel != "per_hour" {
		return errors.New("invalid fee model")
	}

	student := &model.Student{
		ID:        id,
		UserID:    userID,
		FullName:  req.FullName,
		BirthDate: req.BirthDate,
		Gender:    req.Gender,
		Address:   req.Address,
		School:    req.School,
		Grade:     req.Grade,
		Phone:     req.Phone,
		Notes:     req.Notes,
		FeeModel:  req.FeeModel,
		FeeAmount: req.FeeAmount,
	}

	parent := &model.Parent{
		StudentID:  id,
		FatherName: req.FatherName,
		MotherName: req.MotherName,
		Phones:     req.Phones,
		Email:      req.Email,
		Address:    req.ParentAddr,
		Occupation: req.Occupation,
	}

	return s.studentRepo.Update(student, parent, req.Subjects)
}

func (s *StudentService) DeleteStudent(userID uuid.UUID, id uuid.UUID) error {
	existing, err := s.studentRepo.GetByID(id, userID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("student not found")
	}

	return s.studentRepo.Delete(id, userID)
}

package service

import (
	"errors"
	"teaching-management/pkg/model"
	"teaching-management/pkg/repository"

	"github.com/google/uuid"
)

type SubjectService struct {
	subjectRepo *repository.SubjectRepository
}

func NewSubjectService(subjectRepo *repository.SubjectRepository) *SubjectService {
	return &SubjectService{subjectRepo: subjectRepo}
}

func (s *SubjectService) CreateSubject(userID uuid.UUID, name string) (*model.Subject, error) {
	if name == "" {
		return nil, errors.New("subject name cannot be empty")
	}

	subject := &model.Subject{
		UserID: userID,
		Name:   name,
	}

	err := s.subjectRepo.Create(subject)
	if err != nil {
		return nil, err
	}

	return subject, nil
}

func (s *SubjectService) GetSubjects(userID uuid.UUID) ([]model.Subject, error) {
	return s.subjectRepo.GetAll(userID)
}

func (s *SubjectService) UpdateSubject(userID uuid.UUID, id uuid.UUID, name string) error {
	if name == "" {
		return errors.New("subject name cannot be empty")
	}

	// Verify subject belongs to user
	subject, err := s.subjectRepo.GetByID(id)
	if err != nil {
		return err
	}
	if subject == nil {
		return errors.New("subject not found")
	}
	if subject.UserID != userID {
		return errors.New("unauthorized to update this subject")
	}

	subject.Name = name
	return s.subjectRepo.Update(subject)
}

func (s *SubjectService) DeleteSubject(userID uuid.UUID, id uuid.UUID) error {
	subject, err := s.subjectRepo.GetByID(id)
	if err != nil {
		return err
	}
	if subject == nil {
		return errors.New("subject not found")
	}
	if subject.UserID != userID {
		return errors.New("unauthorized to delete this subject")
	}

	return s.subjectRepo.Delete(id, userID)
}

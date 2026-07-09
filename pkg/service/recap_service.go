package service

import (
	"fmt"
	"time"

	"teaching-management/pkg/model"
	"teaching-management/pkg/repository"

	"github.com/google/uuid"
)

type RecapService struct {
	sessionRepo repository.SessionRepository
	studentRepo repository.StudentRepository
}

func NewRecapService(sessionRepo repository.SessionRepository, studentRepo repository.StudentRepository) *RecapService {
	return &RecapService{
		sessionRepo: sessionRepo,
		studentRepo: studentRepo,
	}
}

func (s *RecapService) GetMonthlyRecap(userID uuid.UUID, year, month int) (*model.MonthlyRecapResponse, error) {
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	startDateStr := startDate.Format("2006-01-02")
	endDateStr := endDate.Format("2006-01-02")

	sessions, err := s.sessionRepo.GetAll(userID, startDateStr, endDateStr, nil)
	if err != nil {
		return nil, err
	}

	students, err := s.studentRepo.GetAll(userID)
	if err != nil {
		return nil, err
	}

	recapMap := make(map[uuid.UUID]model.StudentRecap)
	for _, st := range students {
		recapMap[st.ID] = model.StudentRecap{
			StudentID:        st.ID,
			StudentName:      st.FullName,
			FeeModel:         st.FeeModel,
			FeeAmount:        st.FeeAmount,
			CompletedCount:   0,
			CancelledCount:   0,
			RescheduledCount: 0,
			TotalEarnings:    0.0,
		}
	}

	var completed, cancelled, rescheduled int

	for _, se := range sessions {
		r, exists := recapMap[se.StudentID]
		if !exists {
			r = model.StudentRecap{
				StudentID:        se.StudentID,
				StudentName:      se.StudentName,
				CompletedCount:   0,
				CancelledCount:   0,
				RescheduledCount: 0,
				TotalEarnings:    0.0,
			}
		}

		switch se.Status {
		case "completed":
			r.CompletedCount++
			completed++
			r.TotalEarnings += se.FeeCalculated
		case "cancelled":
			r.CancelledCount++
			cancelled++
		case "rescheduled":
			r.RescheduledCount++
			rescheduled++
			r.TotalEarnings += se.FeeCalculated
		}

		recapMap[se.StudentID] = r
	}

	var studentRecaps = []model.StudentRecap{}
	var totalEarnings float64

	for _, r := range recapMap {
		if r.FeeModel == "monthly" {
			totalSessions := r.CompletedCount + r.CancelledCount + r.RescheduledCount
			if totalSessions > 0 {
				r.TotalEarnings = r.FeeAmount
			} else {
				r.TotalEarnings = 0.0
			}
		}
		totalEarnings += r.TotalEarnings
		studentRecaps = append(studentRecaps, r)
	}

	return &model.MonthlyRecapResponse{
		Year:                year,
		Month:               month,
		TotalSessions:       len(sessions),
		CompletedSessions:   completed,
		CancelledSessions:   cancelled,
		RescheduledSessions: rescheduled,
		TotalEarnings:       totalEarnings,
		Students:            studentRecaps,
	}, nil
}

func (s *RecapService) GetMonthlyTrend(userID uuid.UUID, limit int) ([]model.MonthlyTrendItem, error) {
	if limit <= 0 {
		limit = 6
	}

	now := time.Now()
	var trend = []model.MonthlyTrendItem{}

	for i := limit - 1; i >= 0; i-- {
		t := now.AddDate(0, -i, 0)
		year := t.Year()
		month := int(t.Month())

		recap, err := s.GetMonthlyRecap(userID, year, month)
		if err != nil {
			return nil, err
		}

		monthLabels := []string{"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"}
		label := fmt.Sprintf("%s %d", monthLabels[month], year)

		trend = append(trend, model.MonthlyTrendItem{
			Label:    label,
			Earnings: recap.TotalEarnings,
		})
	}

	return trend, nil
}

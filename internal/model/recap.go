package model

import "github.com/google/uuid"

type StudentRecap struct {
	StudentID        uuid.UUID `json:"student_id"`
	StudentName      string    `json:"student_name"`
	CompletedCount   int       `json:"completed_count"`
	CancelledCount   int       `json:"cancelled_count"`
	RescheduledCount int       `json:"rescheduled_count"`
	FeeModel         string    `json:"fee_model"`
	FeeAmount        float64   `json:"fee_amount"`
	TotalEarnings    float64   `json:"total_earnings"`
}

type MonthlyRecapResponse struct {
	Year                int            `json:"year"`
	Month               int            `json:"month"`
	TotalSessions       int            `json:"total_sessions"`
	CompletedSessions   int            `json:"completed_sessions"`
	CancelledSessions   int            `json:"cancelled_sessions"`
	RescheduledSessions int            `json:"rescheduled_sessions"`
	TotalEarnings       float64        `json:"total_earnings"`
	Students            []StudentRecap `json:"students"`
}

type MonthlyTrendItem struct {
	Label    string  `json:"label"` // e.g. "Jul 2026"
	Earnings float64 `json:"earnings"`
}

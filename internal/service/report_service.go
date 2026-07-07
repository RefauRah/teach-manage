package service

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"
	"teaching-management/internal/model"
	"teaching-management/internal/repository"

	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
)

type ReportService struct {
	reportRepo  *repository.ReportRepository
	sessionRepo *repository.SessionRepository
	studentRepo *repository.StudentRepository
}

func NewReportService(
	reportRepo *repository.ReportRepository,
	sessionRepo *repository.SessionRepository,
	studentRepo *repository.StudentRepository,
) *ReportService {
	return &ReportService{
		reportRepo:  reportRepo,
		sessionRepo: sessionRepo,
		studentRepo: studentRepo,
	}
}

func (s *ReportService) CreateReport(userID uuid.UUID, req *model.Report) (*model.ReportResponse, error) {
	// Verify session exists and belongs to user
	session, err := s.sessionRepo.GetByID(req.SessionID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, errors.New("session not found")
	}

	student, err := s.studentRepo.GetByID(session.StudentID, userID)
	if err != nil {
		return nil, err
	}
	if student == nil {
		return nil, errors.New("unauthorized to create report for this session")
	}

	// Verify that a report doesn't already exist for this session
	existing, err := s.reportRepo.GetBySessionID(req.SessionID, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("report already exists for this session")
	}

	report := &model.Report{
		SessionID:          req.SessionID,
		MaterialTaught:     req.MaterialTaught,
		ComprehensionScore: req.ComprehensionScore,
		ComprehensionNotes: req.ComprehensionNotes,
		Homework:           req.Homework,
		BehaviorNotes:      req.BehaviorNotes,
		Recommendations:    req.Recommendations,
		TeacherSignature:   req.TeacherSignature,
		ParentSignature:    req.ParentSignature,
	}

	err = s.reportRepo.Create(report)
	if err != nil {
		return nil, err
	}

	return s.reportRepo.GetByID(report.ID, userID)
}

func (s *ReportService) UpdateReport(userID uuid.UUID, id uuid.UUID, req *model.Report) error {
	existing, err := s.reportRepo.GetByID(id, userID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("report not found")
	}

	report := &model.Report{
		ID:                 id,
		SessionID:          existing.SessionID,
		MaterialTaught:     req.MaterialTaught,
		ComprehensionScore: req.ComprehensionScore,
		ComprehensionNotes: req.ComprehensionNotes,
		Homework:           req.Homework,
		BehaviorNotes:      req.BehaviorNotes,
		Recommendations:    req.Recommendations,
		TeacherSignature:   req.TeacherSignature,
		ParentSignature:    req.ParentSignature,
	}

	return s.reportRepo.Update(report)
}

func (s *ReportService) GetReportBySessionID(userID uuid.UUID, sessionID uuid.UUID) (*model.ReportResponse, error) {
	return s.reportRepo.GetBySessionID(sessionID, userID)
}

func (s *ReportService) GetReportByID(userID uuid.UUID, id uuid.UUID) (*model.ReportResponse, error) {
	return s.reportRepo.GetByID(id, userID)
}

func (s *ReportService) GenerateReportPDF(userID uuid.UUID, id uuid.UUID) ([]byte, error) {
	report, err := s.reportRepo.GetByID(id, userID)
	if err != nil {
		return nil, err
	}
	if report == nil {
		return nil, errors.New("report not found")
	}

	// Create PDF document
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	// Color definition (Indigo #4F46E5)
	primaryR, primaryG, primaryB := 79, 70, 229
	grayR, grayG, grayB := 100, 116, 139

	// Header
	pdf.SetFont("Arial", "B", 18)
	pdf.SetTextColor(primaryR, primaryG, primaryB)
	pdf.CellFormat(0, 10, "LAPORAN HASIL BELAJAR", "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(grayR, grayG, grayB)
	pdf.CellFormat(0, 5, "Bimbingan Belajar Privat", "", 1, "C", false, 0, "")
	
	// Horizontal Divider Line
	pdf.Ln(5)
	pdf.SetDrawColor(primaryR, primaryG, primaryB)
	pdf.SetLineWidth(0.8)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(6)

	// Session & Student Metadata (2 Columns Grid)
	pdf.SetTextColor(50, 50, 50)
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(85, 6, "INFORMASI SISWA", "", 0, "L", false, 0, "")
	pdf.CellFormat(85, 6, "DETAIL SESI", "", 1, "L", false, 0, "")
	
	pdf.SetFont("Arial", "", 10)
	// Row 1
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(25, 6, "Nama Siswa:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 6, report.StudentName, "", 0, "L", false, 0, "")
	
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(25, 6, "Tanggal Sesi:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	dateStr := report.SessionDate.Format("02 Jan 2006")
	pdf.CellFormat(60, 6, dateStr, "", 1, "L", false, 0, "")

	// Row 2
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(25, 6, "Mata Pelajaran:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(60, 6, report.SubjectName, "", 0, "L", false, 0, "")
	
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(25, 6, "Waktu Sesi:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	timeStr := fmt.Sprintf("%s - %s", report.StartTime[:5], report.EndTime[:5])
	pdf.CellFormat(60, 6, timeStr, "", 1, "L", false, 0, "")

	pdf.Ln(4)
	pdf.SetDrawColor(220, 220, 220)
	pdf.SetLineWidth(0.3)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(6)

	// Report Details Section
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(primaryR, primaryG, primaryB)
	pdf.CellFormat(0, 8, "HASIL EVALUASI PEMBELAJARAN", "", 1, "L", false, 0, "")
	pdf.Ln(2)

	// 1. Materi yang Diajarkan
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(50, 50, 50)
	pdf.CellFormat(0, 6, "Materi yang Diajarkan:", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.MultiCell(0, 5, report.MaterialTaught, "", "L", false)
	pdf.Ln(4)

	// 2. Tingkat Pemahaman & Catatan
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(45, 6, "Tingkat Pemahaman:", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	scoreStars := strings.Repeat("* ", report.ComprehensionScore) + strings.Repeat("- ", 5-report.ComprehensionScore)
	pdf.CellFormat(0, 6, fmt.Sprintf("%d / 5   ( %s)", report.ComprehensionScore, scoreStars), "", 1, "L", false, 0, "")
	
	if report.ComprehensionNotes != "" {
		pdf.SetFont("Arial", "I", 10)
		pdf.MultiCell(0, 5, fmt.Sprintf("Catatan pemahaman: %s", report.ComprehensionNotes), "", "L", false)
	}
	pdf.Ln(4)

	// 3. Tugas / Pekerjaan Rumah (PR)
	if report.Homework != "" {
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(0, 6, "Tugas / Pekerjaan Rumah (PR):", "", 1, "L", false, 0, "")
		pdf.SetFont("Arial", "", 10)
		pdf.MultiCell(0, 5, report.Homework, "", "L", false)
		pdf.Ln(4)
	}

	// 4. Catatan Perilaku Siswa
	if report.BehaviorNotes != "" {
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(0, 6, "Catatan Perilaku Siswa:", "", 1, "L", false, 0, "")
		pdf.SetFont("Arial", "", 10)
		pdf.MultiCell(0, 5, report.BehaviorNotes, "", "L", false)
		pdf.Ln(4)
	}

	// 5. Rekomendasi untuk Sesi Berikutnya
	if report.Recommendations != "" {
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(0, 6, "Rekomendasi untuk Sesi Berikutnya:", "", 1, "L", false, 0, "")
		pdf.SetFont("Arial", "", 10)
		pdf.MultiCell(0, 5, report.Recommendations, "", "L", false)
		pdf.Ln(4)
	}

	pdf.Ln(10)

	// Signatures Section (2 columns side by side at y position)
	currentY := pdf.GetY()
	// Ensure we don't overflow the page for signatures
	if currentY > 230 {
		pdf.AddPage()
		currentY = pdf.GetY()
	}

	// Draw lines and texts for signatures
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(100, 100, 100)
	
	pdf.SetXY(20, currentY)
	pdf.CellFormat(70, 5, "Tanda Tangan Guru,", "", 0, "C", false, 0, "")
	pdf.SetXY(110, currentY)
	pdf.CellFormat(70, 5, "Tanda Tangan Orangtua,", "", 1, "C", false, 0, "")

	// Embed Teacher Signature
	if report.TeacherSignature != "" {
		err = s.embedSignature(pdf, report.TeacherSignature, 35, currentY+8, 40, 20)
		if err != nil {
			// fallback if signature rendering fails
			pdf.SetXY(20, currentY+15)
			pdf.CellFormat(70, 5, "(Signed)", "", 0, "C", false, 0, "")
		}
	}

	// Embed Parent Signature
	if report.ParentSignature != nil && *report.ParentSignature != "" {
		err = s.embedSignature(pdf, *report.ParentSignature, 125, currentY+8, 40, 20)
		if err != nil {
			pdf.SetXY(110, currentY+15)
			pdf.CellFormat(70, 5, "(Signed)", "", 0, "C", false, 0, "")
		}
	}

	// Signature names and placeholders at bottom
	pdf.SetXY(20, currentY+30)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(50, 50, 50)
	pdf.CellFormat(70, 5, "Guru Les Privat", "T", 0, "C", false, 0, "")

	pdf.SetXY(110, currentY+30)
	pdf.CellFormat(70, 5, "Orangtua / Wali", "T", 1, "C", false, 0, "")

	// Output PDF to buffer
	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func (s *ReportService) embedSignature(pdf *gofpdf.Fpdf, base64Str string, x, y, w, h float64) error {
	if base64Str == "" {
		return nil
	}

	parts := strings.Split(base64Str, ",")
	actualBase64 := base64Str
	if len(parts) > 1 {
		actualBase64 = parts[1]
	}

	// Base64 padding normalization if needed
	if l := len(actualBase64) % 4; l > 0 {
		actualBase64 += strings.Repeat("=", 4-l)
	}

	data, err := base64.StdEncoding.DecodeString(actualBase64)
	if err != nil {
		return err
	}

	tmpFile, err := os.CreateTemp("", "signature-*.png")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	if _, err := tmpFile.Write(data); err != nil {
		return err
	}

	imageName := tmpFile.Name()
	pdf.ImageOptions(imageName, x, y, w, h, false, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, 0, "")
	return nil
}

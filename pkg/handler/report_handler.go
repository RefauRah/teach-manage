package handler

import (
	"fmt"
	"teaching-management/pkg/model"
	"teaching-management/pkg/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ReportHandler struct {
	reportService *service.ReportService
}

func NewReportHandler(reportService *service.ReportService) *ReportHandler {
	return &ReportHandler{reportService: reportService}
}

func (h *ReportHandler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req model.Report
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot parse JSON"})
	}

	report, err := h.reportService.CreateReport(userID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(report)
}

func (h *ReportHandler) Update(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid report ID"})
	}

	var req model.Report
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot parse JSON"})
	}

	err = h.reportService.UpdateReport(userID, id, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "report updated successfully"})
}

func (h *ReportHandler) GetBySessionID(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	sessionIDStr := c.Params("session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid session ID"})
	}

	report, err := h.reportService.GetReportBySessionID(userID, sessionID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if report == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "report not found for this session"})
	}

	return c.Status(fiber.StatusOK).JSON(report)
}

func (h *ReportHandler) GetByID(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid report ID"})
	}

	report, err := h.reportService.GetReportByID(userID, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if report == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "report not found"})
	}

	return c.Status(fiber.StatusOK).JSON(report)
}

func (h *ReportHandler) DownloadPDF(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid report ID"})
	}

	pdfBytes, err := h.reportService.GenerateReportPDF(userID, id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="report-%s.pdf"`, idStr))
	return c.Send(pdfBytes)
}

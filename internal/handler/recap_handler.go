package handler

import (
	"strconv"
	"time"

	"teaching-management/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type RecapHandler struct {
	recapService *service.RecapService
}

func NewRecapHandler(recapService *service.RecapService) *RecapHandler {
	return &RecapHandler{recapService: recapService}
}

func (h *RecapHandler) GetMonthly(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	now := time.Now()
	yearStr := c.Query("year", strconv.Itoa(now.Year()))
	monthStr := c.Query("month", strconv.Itoa(int(now.Month())))

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid year parameter"})
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid month parameter"})
	}

	recap, err := h.recapService.GetMonthlyRecap(userID, year, month)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(recap)
}

func (h *RecapHandler) GetTrend(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	limitStr := c.Query("months", "6")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid months parameter"})
	}

	trend, err := h.recapService.GetMonthlyTrend(userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(trend)
}

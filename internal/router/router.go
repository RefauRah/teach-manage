package router

import (
	"teaching-management/internal/handler"
	"teaching-management/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(
	app *fiber.App,
	auth *handler.AuthHandler,
	student *handler.StudentHandler,
	subject *handler.SubjectHandler,
	schedule *handler.ScheduleHandler,
	session *handler.SessionHandler,
	report *handler.ReportHandler,
	recap *handler.RecapHandler,
) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	api := app.Group("/api")

	// Public Auth routes
	authGroup := api.Group("/auth")
	authGroup.Post("/register", auth.Register)
	authGroup.Post("/login", auth.Login)
	authGroup.Post("/refresh", auth.Refresh)

	// Protected routes (JWT required)
	protected := api.Group("", middleware.JWTMiddleware())

	// Students CRUD
	studentsGroup := protected.Group("/students")
	studentsGroup.Get("/", student.GetAll)
	studentsGroup.Post("/", student.Create)
	studentsGroup.Get("/:id", student.GetByID)
	studentsGroup.Put("/:id", student.Update)
	studentsGroup.Delete("/:id", student.Delete)

	// Subjects CRUD
	subjectsGroup := protected.Group("/subjects")
	subjectsGroup.Get("/", subject.GetAll)
	subjectsGroup.Post("/", subject.Create)
	subjectsGroup.Put("/:id", subject.Update)
	subjectsGroup.Delete("/:id", subject.Delete)

	// Schedules CRUD
	schedulesGroup := protected.Group("/schedules")
	schedulesGroup.Get("/", schedule.GetAll)
	schedulesGroup.Post("/", schedule.Create)
	schedulesGroup.Put("/:id", schedule.Update)
	schedulesGroup.Delete("/:id", schedule.Delete)

	// Sessions routes
	sessionsGroup := protected.Group("/sessions")
	sessionsGroup.Get("/", session.GetAll)
	sessionsGroup.Post("/", session.Create)
	sessionsGroup.Post("/generate", session.Generate)
	sessionsGroup.Put("/:id", session.Update)
	sessionsGroup.Delete("/:id", session.Delete)

	// Reports routes
	reportsGroup := protected.Group("/reports")
	reportsGroup.Post("/", report.Create)
	reportsGroup.Put("/:id", report.Update)
	reportsGroup.Get("/:id", report.GetByID)
	reportsGroup.Get("/session/:session_id", report.GetBySessionID)
	reportsGroup.Get("/:id/pdf", report.DownloadPDF)

	// Recap routes
	recapGroup := protected.Group("/recap")
	recapGroup.Get("/monthly", recap.GetMonthly)
	recapGroup.Get("/trend", recap.GetTrend)
}

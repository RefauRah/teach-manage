package app

import (
	"teaching-management/pkg/config"
	"teaching-management/pkg/database"
	"teaching-management/pkg/handler"
	"teaching-management/pkg/repository"
	"teaching-management/pkg/router"
	"teaching-management/pkg/service"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func SetupApp() *fiber.App {
	// Initialize config
	config.LoadConfig()

	// Connect to database
	database.ConnectDB()

	// Initialize Repositories
	userRepo := repository.NewUserRepository(database.DB)
	subjectRepo := repository.NewSubjectRepository(database.DB)
	studentRepo := repository.NewStudentRepository(database.DB)
	scheduleRepo := repository.NewScheduleRepository(database.DB)
	sessionRepo := repository.NewSessionRepository(database.DB)
	reportRepo := repository.NewReportRepository(database.DB)

	// Initialize Services
	authService := service.NewAuthService(userRepo)
	subjectService := service.NewSubjectService(subjectRepo)
	studentService := service.NewStudentService(studentRepo)
	scheduleService := service.NewScheduleService(scheduleRepo, studentRepo, subjectRepo)
	sessionService := service.NewSessionService(sessionRepo, studentRepo, scheduleRepo)
	reportService := service.NewReportService(reportRepo, sessionRepo, studentRepo)
	recapService := service.NewRecapService(sessionRepo, studentRepo)

	// Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	subjectHandler := handler.NewSubjectHandler(subjectService)
	studentHandler := handler.NewStudentHandler(studentService)
	scheduleHandler := handler.NewScheduleHandler(scheduleService)
	sessionHandler := handler.NewSessionHandler(sessionService)
	reportHandler := handler.NewReportHandler(reportService)
	recapHandler := handler.NewRecapHandler(recapService)

	app := fiber.New(fiber.Config{
		AppName: "Teaching Management System v1.0",
	})

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	router.SetupRoutes(app, authHandler, studentHandler, subjectHandler, scheduleHandler, sessionHandler, reportHandler, recapHandler)

	return app
}

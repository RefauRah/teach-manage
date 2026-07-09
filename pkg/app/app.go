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

	// Initialize Repositories
	var userRepo repository.UserRepository
	var subjectRepo repository.SubjectRepository
	var studentRepo repository.StudentRepository
	var scheduleRepo repository.ScheduleRepository
	var sessionRepo repository.SessionRepository
	var reportRepo repository.ReportRepository

	if config.AppConfig.DBMode == "supabase" {
		userRepo = repository.NewSupabaseUserRepository(config.AppConfig.SupabaseURL, config.AppConfig.SupabaseAnonKey)
		subjectRepo = repository.NewSupabaseSubjectRepository(config.AppConfig.SupabaseURL, config.AppConfig.SupabaseAnonKey)
		studentRepo = repository.NewSupabaseStudentRepository(config.AppConfig.SupabaseURL, config.AppConfig.SupabaseAnonKey)
		scheduleRepo = repository.NewSupabaseScheduleRepository(config.AppConfig.SupabaseURL, config.AppConfig.SupabaseAnonKey)
		sessionRepo = repository.NewSupabaseSessionRepository(config.AppConfig.SupabaseURL, config.AppConfig.SupabaseAnonKey)
		reportRepo = repository.NewSupabaseReportRepository(config.AppConfig.SupabaseURL, config.AppConfig.SupabaseAnonKey)
	} else {
		// Connect to database
		database.ConnectDB()

		userRepo = repository.NewPostgresUserRepository(database.DB)
		subjectRepo = repository.NewPostgresSubjectRepository(database.DB)
		studentRepo = repository.NewPostgresStudentRepository(database.DB)
		scheduleRepo = repository.NewPostgresScheduleRepository(database.DB)
		sessionRepo = repository.NewPostgresSessionRepository(database.DB)
		reportRepo = repository.NewPostgresReportRepository(database.DB)
	}

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

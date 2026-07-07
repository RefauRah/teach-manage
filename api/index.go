package handler

import (
	"net/http"
	"sync"
	"teaching-management/internal/app"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
)

var (
	fiberApp *fiber.App
	once     sync.Once
)

func Handler(w http.ResponseWriter, r *http.Request) {
	// Initialize the app only once to reuse database connection pools
	once.Do(func() {
		fiberApp = app.SetupApp()
	})

	// Adapt Fiber app routing to standard HTTP handler expected by Vercel
	adaptor.FiberApp(fiberApp).ServeHTTP(w, r)
}

FROM golang:alpine AS builder

WORKDIR /app

# Copy dependency files first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build a statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server cmd/server/main.go

# Stage 2: Runtime image
FROM alpine:latest

# Install certificates and timezone data
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy the binary and necessary runtime assets
COPY --from=builder /app/server .
COPY --from=builder /app/web ./web
COPY --from=builder /app/pkg/database/migrations ./pkg/database/migrations

# Expose port
EXPOSE 3000

# Set entry point
CMD ["./server"]

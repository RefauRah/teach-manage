package service

import (
	"errors"
	"time"

	"teaching-management/pkg/config"
	"teaching-management/pkg/model"
	"teaching-management/pkg/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo *repository.UserRepository
}

func NewAuthService(userRepo *repository.UserRepository) *AuthService {
	return &AuthService{userRepo: userRepo}
}

func (s *AuthService) Register(req *model.RegisterRequest) (*model.AuthResponse, error) {
	// Check if user already exists
	existingUser, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Generate tokens
	token, refreshToken, err := s.GenerateTokens(user.ID)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         *user,
	}, nil
}

func (s *AuthService) Login(req *model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	// Compare passwords
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate tokens
	token, refreshToken, err := s.GenerateTokens(user.ID)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         *user,
	}, nil
}

func (s *AuthService) RefreshToken(tokenStr string) (string, string, error) {
	// Parse refresh token
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(config.AppConfig.JWTRefreshSecret), nil
	})

	if err != nil || !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}

	sub, ok := claims["sub"].(string)
	if !ok {
		return "", "", errors.New("invalid token subject")
	}

	userID, err := uuid.Parse(sub)
	if err != nil {
		return "", "", errors.New("invalid user ID in token")
	}

	// Re-generate both tokens
	return s.GenerateTokens(userID)
}

func (s *AuthService) GenerateTokens(userID uuid.UUID) (string, string, error) {
	cfg := config.AppConfig

	// Access Token
	accessClaims := jwt.MapClaims{
		"sub": userID.String(),
		"exp": time.Now().Add(time.Duration(cfg.JWTAccessExpiryMin) * time.Minute).Unix(),
		"iat": time.Now().Unix(),
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenStr, err := accessToken.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return "", "", err
	}

	// Refresh Token
	refreshClaims := jwt.MapClaims{
		"sub": userID.String(),
		"exp": time.Now().Add(time.Duration(cfg.JWTRefreshExpiryDays) * 24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenStr, err := refreshToken.SignedString([]byte(cfg.JWTRefreshSecret))
	if err != nil {
		return "", "", err
	}

	return accessTokenStr, refreshTokenStr, nil
}

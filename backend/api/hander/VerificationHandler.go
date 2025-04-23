package handler

import (
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/service"

	"github.com/gin-gonic/gin"
)

type VerificationHandler struct {
	verificationService *service.VerificationService
}

func NewVerificationHandler(verificationService *service.VerificationService) *VerificationHandler {
	return &VerificationHandler{verificationService: verificationService}
}

func (h *VerificationHandler) SendVerifyCode(c *gin.Context) {
	var req struct {
		CodeMode models.CodeMode `json:"code_mode" binding:"required"`
		Email    string          `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	err := h.verificationService.SendVerifyCode(models.CodeData{CodeMode: req.CodeMode, Email: req.Email})
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to send verification code"})
		return
	}

	c.JSON(200, gin.H{"message": "Verification code sent"})
}

func (h *VerificationHandler) VerifyCode(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	verify := h.verificationService.VerifyCode(req.Code, req.Email)
	if !verify {
		c.JSON(500, gin.H{"error": verify})
		return
	}

	c.JSON(200, gin.H{"message": "Verification successful"})
}

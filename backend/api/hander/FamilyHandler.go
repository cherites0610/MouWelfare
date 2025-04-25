package handler

import (
	"Mou-Welfare/api/dto"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/repository"
	"Mou-Welfare/internal/service"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type FamilyHandler struct {
	FamilyService       *service.FamilyService
	UserRepo            *repository.UserRerpository
	VerificationService *service.VerificationService
	cfg                 *config.Config
}

func NewFamilyHandler(familyService *service.FamilyService, userRepo *repository.UserRerpository, VerificationService *service.VerificationService, cfg *config.Config) *FamilyHandler {
	return &FamilyHandler{
		FamilyService:       familyService,
		UserRepo:            userRepo,
		VerificationService: VerificationService,
		cfg:                 cfg,
	}
}

func (h *FamilyHandler) CreateFamily(c *gin.Context) {
	var req dto.CreateFamilyRequest

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	family, err := h.FamilyService.CreateFamily(req.Name, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, family)
}

func (h *FamilyHandler) DeleteFamily(c *gin.Context) {
	id := c.Param("id")

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	parsedID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無效的家庭 ID"})
		return
	}

	err = h.FamilyService.DeleteFamily(uint(parsedID), userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "家庭刪除成功"})
}

func (h *FamilyHandler) GetFamily(c *gin.Context) {
	id := c.Param("id")
	parsedID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無效的家庭 ID"})
		return
	}

	family, err := h.FamilyService.GetFamily(uint(parsedID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, h.ToFamilyResponse(family, h.UserRepo))
}

func (h *FamilyHandler) JoinFamily(c *gin.Context) {
	id := c.Param("id")
	parsedID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無效的家庭 ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	err = h.FamilyService.JoinFamily(userID.(uint), uint(parsedID), 3) // 3 是代表成員
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "成功加入家庭"})
}

func (h *FamilyHandler) ExitFamily(c *gin.Context) {
	id := c.Param("id")
	parsedID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無效的家庭 ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	err = h.FamilyService.ExitFamily(userID.(uint), uint(parsedID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "成功退出家庭"})
}

func (h *FamilyHandler) GetUserFamily(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	families, err := h.FamilyService.GetFamilyByUser(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	familyResponses := make([]dto.FamilyResponse, 0)
	for _, family := range families {
		familyResponses = append(familyResponses, h.ToFamilyResponse(&family, h.UserRepo))
	}

	c.JSON(http.StatusOK, familyResponses)
}

func (h *FamilyHandler) UpdateFamily(c *gin.Context) {
	id := c.Param("id")
	parsedID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無效的家庭 ID"})
		return
	}

	var req dto.UpdateFamilyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	err = h.FamilyService.UpdateFamilyName(uint(parsedID), userID.(uint), req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "家庭名稱更新成功"})
}

func (h *FamilyHandler) UpdataMember(c *gin.Context) {
	id := c.Param("id")
	parsedID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無效的家庭 ID"})
		return
	}

	var req dto.UpdateFamilyMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	err = h.FamilyService.UpdataMemberRole(userID.(uint), req.UserID, uint(parsedID), req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "成員權限更新成功"})
}

func (h *FamilyHandler) GetFamilyCode(c *gin.Context) {
	id := c.Param("id")
	parsedID, _ := strconv.ParseUint(id, 10, 32)
	code := h.VerificationService.GenerateCode(models.CodeData{
		CodeMode: 2,
		FmailyID: func(id uint) *uint { return &id }(uint(parsedID)),
		UserID:   nil,
		Email:    "",
	})

	c.JSON(http.StatusOK, code)
}

func (h *FamilyHandler) JoinFamilyByCode(c *gin.Context) {
	code := c.Param("code")
	userID, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	verify, data := h.VerificationService.VerifyCode(code, "")
	if !verify {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "驗證碼錯誤"})
		return
	}

	err := h.FamilyService.JoinFamily(userID.(uint), *data.FmailyID, 3) // 3 是代表成員
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "成功加入家庭"})
}

func (h *FamilyHandler) ToFamilyResponse(family *models.Family, userRepo *repository.UserRerpository) dto.FamilyResponse {
	response := dto.FamilyResponse{
		ID:   family.ID,
		Name: family.Name,
	}

	for _, member := range family.Members {
		user, err := userRepo.FindByID(member.UserID)
		if err != nil {
			// 處理錯誤，例如用戶不存在
			continue
		}

		if user.Name == nil {
			user.Name = &user.Account // 如果用戶名稱為空，則使用賬號作為名稱
		}

		var avatarURL *string
		if user.AvatarURL != nil {
			url := fmt.Sprintf("%s%s", h.cfg.DOMAIN, *user.AvatarURL)
			avatarURL = &url
		} else {
			url := fmt.Sprintf("%s%s", h.cfg.DOMAIN, "/uploads/default_avatar.png")
			avatarURL = &url
		}

		response.Members = append(response.Members, dto.UserFamilyResponse{
			ID:        member.UserID,
			NickName:  *user.Name,
			Role:      member.Role,
			AvatarURL: *avatarURL,
		})
	}

	return response
}

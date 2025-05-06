package handler

import (
	"Mou-Welfare/api/dto"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/service"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type WelfareHandler struct {
	WelfareService *service.WelfareService
	FamilyService  *service.FamilyService
	UserService    *service.UserService
	cfg            *config.Config
}

func NewWelfareHandler(welfareService *service.WelfareService, familyService *service.FamilyService, userService *service.UserService, cfg *config.Config) *WelfareHandler {
	return &WelfareHandler{WelfareService: welfareService, FamilyService: familyService, UserService: userService, cfg: cfg}
}

func (h *WelfareHandler) GetAllWelfares(c *gin.Context) {
	// 從查詢參數獲取 page 和 pageSize，設置預設值
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "20")
	locationsStr := c.Query("locations")
	identitiesStr := c.Query("identities")
	familiesStr := c.Query("families")
	categoriesStr := c.Query("categories")
	searchStr := c.DefaultQuery("search", "")
	locations := strings.Split(locationsStr, ",")
	identities := strings.Split(identitiesStr, ",")
	categories := strings.Split(categoriesStr, ",")

	// 轉換為整數
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid page number"})
		return
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid page size"})
		return
	}

	// 調用 Service 獲取分頁數據
	welfares, total, err := h.WelfareService.GetWelfareAll(page, pageSize, locations, identities, categories, searchStr)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"error": "Failed to fetch welfares"})
		return
	}

	// 轉換為 DTO
	resp := make([]dto.WelfareResp, 0, len(welfares))
	var familyID *uint
	if familiesStr != "" {
		parsedFamilyID, err := strconv.ParseUint(familiesStr, 10, 32)
		if err == nil {
			WelfareID := uint(parsedFamilyID)
			familyID = &WelfareID
		}
	}

	for _, welfare := range welfares {
		welfareResp := h.ToWelfareResp(welfare, []uint{}, familyID)
		resp = append(resp, welfareResp)
	}

	// 計算總頁數
	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))

	// 構建分頁響應
	paginatedResp := dto.WelfarePaginatedResp{
		Data: resp,
		Pagination: dto.Pagination{
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}

	c.JSON(http.StatusOK, paginatedResp)
}

func (h *WelfareHandler) GetWelfareByID(c *gin.Context) {
	id := c.Param("id")
	WelfareID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid ID format"})
		return
	}
	welfare, err := h.WelfareService.GetWelfareByID(uint(WelfareID))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch welfare"})
		return
	}

	welfareResp := h.ToWelfareResp(*welfare, []uint{}, nil)
	c.JSON(200, welfareResp)
}

func (h *WelfareHandler) AddFavorite(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	id := c.Param("id")
	welfareID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid ID format"})
		return
	}

	userIDUint, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
		return
	}

	err = h.WelfareService.AddFavorite(userIDUint, uint(welfareID))
	if err != nil {
		c.JSON(200, dto.DTO{StatusCode: 500, Message: "添加失敗", Data: nil})
		return
	}

	c.JSON(200, dto.DTO{StatusCode: 200, Message: "添加成功", Data: nil})
}

func (h *WelfareHandler) DeleteFavorite(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	id := c.Param("id")
	welfareID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid ID format"})
		return
	}

	userIDUint, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
		return
	}

	err = h.WelfareService.DeleteFavorite(userIDUint, uint(welfareID))
	if err != nil {
		c.JSON(200, dto.DTO{StatusCode: 500, Message: "刪除失敗", Data: nil})
		return
	}

	c.JSON(200, dto.DTO{StatusCode: 200, Message: "刪除成功", Data: nil})
}

func (h *WelfareHandler) FindFavoritesByUserID(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	userIDUint, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
		return
	}

	welfares, err := h.WelfareService.FindFavoritesByUserID(userIDUint)

	resp := make([]dto.WelfareResp, 0, len(welfares))
	for _, welfare := range welfares {
		welfareResp := h.ToWelfareResp(welfare, []uint{}, nil)
		resp = append(resp, welfareResp)
	}
	if err != nil {
		c.JSON(200, dto.DTO{StatusCode: 500, Message: "取得失敗", Data: nil})
		return
	}

	c.JSON(200, dto.DTO{StatusCode: 200, Message: "取得成功", Data: resp})
}

func (h *WelfareHandler) ToWelfareResp(welfare models.Welfare, identities []uint, familyID *uint) dto.WelfareResp {
	// 解析發佈日期，錯誤時返回零值
	pubDate, _ := time.Parse(time.RFC3339, welfare.PublicationDate)

	// 初始化響應結構
	welfareResp := dto.WelfareResp{
		ID:              welfare.ID,
		Title:           welfare.Title,
		Url:             welfare.Url,
		Details:         welfare.Details,
		Status:          welfare.Status,
		PublicationDate: pubDate.Format("2006-01-02"),
		Location:        welfare.Location.Name,
		LightStatus:     h.WelfareService.GetWelfareLightStatus(welfare.ID, identities),
		Identities:      make([]string, 0, len(welfare.Identities)),
		Categories:      make([]string, 0, len(welfare.Categories)),
		Forward:         strings.Fields(strings.ReplaceAll(welfare.Forward, ",", " ")),
		FamilyMembers:   []dto.FamilyMemberWelfareResp{},
	}

	// 填充 Identities
	for _, identity := range welfare.Identities {
		welfareResp.Identities = append(welfareResp.Identities, identity.Name)
	}

	// 填充 Categories
	for _, category := range welfare.Categories {
		welfareResp.Categories = append(welfareResp.Categories, category.Name)
	}

	// 處理家庭成員
	if familyID != nil {
		family, err := h.FamilyService.GetFamily(*familyID)
		if err == nil && family != nil {
			welfareResp.FamilyMembers = make([]dto.FamilyMemberWelfareResp, 0, len(family.Members))
			for _, member := range family.Members {
				user, err := h.UserService.GetUserByEmailORUserIDORAccount(&member.UserID, nil, nil)
				if err != nil {
					continue // 跳過無效用戶
				}

				// 提取用戶身份 ID
				identities := make([]uint, 0, len(*user.Identities))
				for _, identity := range *user.Identities {
					identities = append(identities, identity.ID)
				}

				// 計算 LightStatus
				lightStatus := h.WelfareService.GetWelfareLightStatus(welfare.ID, identities)
				if lightStatus != 1 {
					continue
				}

				var avatarURL *string
				// 處理 AvatarURL
				if user.AvatarURL != nil {
					url := fmt.Sprintf("%s/%s/%s", h.cfg.DOMAIN, "avatar", *user.AvatarURL)
					avatarURL = &url
				} else {
					url := fmt.Sprintf("%s/%s/%s", h.cfg.DOMAIN, "avatar", "default_avatar.png")
					avatarURL = &url
				}

				welfareResp.FamilyMembers = append(welfareResp.FamilyMembers, dto.FamilyMemberWelfareResp{
					AvatarUrl:   *avatarURL,
					LightStatus: lightStatus,
					Name:        *user.Name,
				})
			}
		}
	}

	return welfareResp

}

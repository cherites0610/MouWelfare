package handler

import (
	"Mou-Welfare/api/dto"
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/service"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type WelfareHandler struct {
	WelfareService *service.WelfareService
}

func NewWelfareHandler(welfareService *service.WelfareService) *WelfareHandler {
	return &WelfareHandler{WelfareService: welfareService}
}

func (h *WelfareHandler) GetAllWelfares(c *gin.Context) {
	welfares, err := h.WelfareService.GetWelfareAll()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch welfares"})
		return
	}

	resp := make([]dto.WelfareResp, 0, len(welfares))
	for _, welfare := range welfares {
		welfareResp := ToWelfareResp(welfare)
		resp = append(resp, welfareResp)
	}
	c.JSON(200, resp)
}

func (h *WelfareHandler) GetWelfareByID(c *gin.Context) {
	id := c.Param("id")
	parsedID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid ID format"})
		return
	}
	welfare, err := h.WelfareService.GetWelfareByID(uint(parsedID))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch welfare"})
		return
	}

	welfareResp := ToWelfareResp(*welfare)
	c.JSON(200, welfareResp)
}

func ToWelfareResp(welfare models.Welfare) dto.WelfareResp {

	pubDate, err := time.Parse(time.RFC3339, welfare.PublicationDate)
	if err != nil {
		// 處理錯誤，例如設置默認值或記錄錯誤
		pubDate = time.Time{} // 零值
	}

	welfareResp := dto.WelfareResp{
		ID:              welfare.ID,
		Title:           welfare.Title,
		Url:             welfare.Url,
		Details:         welfare.Details,
		Status:          welfare.Status,
		PublicationDate: pubDate.Format("2006-01-02"),
		Location:        welfare.Location.Name,
		LightStatus:     uint(rand.Intn(3)), // 隨機生成 0 或 1
	}

	for _, identity := range welfare.Identities {
		welfareResp.Identities = append(welfareResp.Identities, identity.Name)
	}
	for _, category := range welfare.Categories {
		welfareResp.Categories = append(welfareResp.Categories, category.Name)
	}

	forward := strings.Split(welfare.Forward, ",")
	for i, item := range forward {
		forward[i] = strings.TrimSpace(item)
	}

	welfareResp.Forward = forward
	return welfareResp
}

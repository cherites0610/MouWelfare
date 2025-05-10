package handler

import (
	"Mou-Welfare/api/dto"
	"Mou-Welfare/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ConstantsHandelr struct {
	ConstantsService *service.ConstantsService
}

func NewConstantsHandelr(constantsService *service.ConstantsService) *ConstantsHandelr {
	return &ConstantsHandelr{ConstantsService: constantsService}
}

func (h *ConstantsHandelr) RefreshConstants(ctx *gin.Context) {
	err := h.ConstantsService.RefreshConstants()
	if err != nil {
		ctx.JSON(http.StatusOK, dto.DTO{StatusCode: 500, Message: "刷新失敗", Data: err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, dto.DTO{StatusCode: 200, Message: "刷新成功", Data: h.ConstantsService.GetConstants()})
}

func (h *ConstantsHandelr) GetConstants(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, dto.DTO{StatusCode: 200, Message: "取得成功", Data: h.ConstantsService.GetConstants()})
}

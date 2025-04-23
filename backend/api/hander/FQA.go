package handler

import (
	"Mou-Welfare/api/dto"
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func GetFQAHandler(c *gin.Context) {
	fileData, _ := os.ReadFile("../../QA.json")
	jsonStr := string(fileData)

	var fqaResp []dto.FQAResp
	err := json.Unmarshal([]byte(jsonStr), &fqaResp)

	if err != nil {
		c.IndentedJSON(http.StatusBadGateway, gin.H{"error": err})
		return
	}

	c.IndentedJSON(http.StatusOK, fqaResp)
}

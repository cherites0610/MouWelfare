package handler

import (
	"Mou-Welfare/api/dto"
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/service"
	constants "Mou-Welfare/pkg/constans"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserHandler struct {
	userService service.UserService
	authService service.AuthService
}

func NewUserHandler(userService service.UserService, authService *service.AuthService) *UserHandler {
	return &UserHandler{
		userService: userService,
		authService: *authService,
	}
}

func (h *UserHandler) Register(c *gin.Context) {
	var req dto.UserRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	User, err := h.userService.Register(req.Account, req.Password, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, User)
}

func (h *UserHandler) Login(c *gin.Context) {
	var req dto.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, token, err := h.userService.Login(req.Account, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": ToUserResp(user), "token": token})
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var req dto.UserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.UpdateProfile(req.UserID, req.Name, req.Birthday, req.Female, req.IsSubscribe)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ToUserResp(user))
}

func (h *UserHandler) GetUserProfile(c *gin.Context) {
	// 從上下文獲取用戶 ID（由 JWT 中間件設置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	// 查詢用戶
	user, err := h.userService.UserRepo.FindByID(userID.(uint))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "用戶不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查詢用戶失敗"})
		return
	}

	token, err := h.authService.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成 token 失敗"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": ToUserResp(user), "token": token})
}

func (h *UserHandler) GetLineLoginUrl(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	baseUrl := "https://access.line.me/oauth2/v2.1/authorize"
	clientID := "2007306117"
	redirect_uri := "https://9845-118-169-236-110.ngrok-free.app/api/LineLoginCallback"
	state := userID // 隨機生成的狀態字符串
	scope := "profile openid"
	nonce := userID // 隨機生成的 nonce 字符串
	bot_prompt := "aggressive"

	urlParams := url.Values{}
	urlParams.Set("response_type", "code")
	urlParams.Set("client_id", clientID)
	urlParams.Set("redirect_uri", redirect_uri)
	urlParams.Set("state", fmt.Sprintf("%v", state))
	urlParams.Set("scope", scope)
	urlParams.Set("nonce", fmt.Sprintf("%v", nonce))
	urlParams.Set("bot_prompt", bot_prompt)

	c.JSON(http.StatusOK, fmt.Sprintf("%s?%s", baseUrl, urlParams.Encode()))

}

func (h *UserHandler) LineLoginCallback(c *gin.Context) {
	accessToken := c.Query("code")
	state := c.Query("state")

	token, err := h.userService.GetLineAccessTokenByAuthCode(accessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	LineUserID, err := h.userService.GetLineProfileByAccessToken(token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	id, err := strconv.ParseUint(state, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state value"})
		return
	}

	user, err := h.userService.UserRepo.FindByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	user.LineID = &LineUserID
	h.userService.UserRepo.Save(user)

	c.JSON(http.StatusOK, gin.H{"message": "Line綁定成功，請返回app"})

}

func ToUserResp(user *models.User) dto.UserResp {
	identityID := []uint{}
	if user.Identities == nil {
		user.Identities = &[]models.Identity{}
	}
	for _, identity := range *user.Identities {
		identityID = append(identityID, identity.ID)
	}

	return dto.UserResp{
		ID:          user.ID,
		Name:        *user.Name,
		Account:     user.Account,
		Gender:      constants.GenderToString(*user.Female),
		IsSubscribe: user.IsSubscribe,
		Birthday:    *user.Birthday,
		Location:    constants.LocationToString(*user.LocationID),
		Identity:    constants.IdentityToString(identityID),
		LineID:      user.LineID,
	}
}

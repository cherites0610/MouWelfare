package handler

import (
	"Mou-Welfare/api/dto"
	"Mou-Welfare/internal/config"
	"Mou-Welfare/internal/models"
	"Mou-Welfare/internal/service"
	constants "Mou-Welfare/pkg/constans"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserHandler struct {
	userService         *service.UserService
	authService         *service.AuthService
	verificationService *service.VerificationService
	cfg                 *config.Config
}

func NewUserHandler(userService *service.UserService, authService *service.AuthService, verificationService *service.VerificationService, cfg *config.Config) *UserHandler {
	return &UserHandler{
		userService:         userService,
		authService:         authService,
		verificationService: verificationService,
		cfg:                 cfg,
	}
}

func (h *UserHandler) Register(c *gin.Context) {
	var req dto.UserRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 400, Message: "請求參數錯誤", Data: err.Error(),
		})
		return
	}

	User, err := h.userService.Register(req.Account, req.Password, req.Email)
	if err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 400, Message: err.Error(), Data: err.Error(),
		})
		return
	}

	resp := dto.DTO{
		StatusCode: 200,
		Message:    "註冊成功",
		Data:       User,
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *UserHandler) VerifyEmail(c *gin.Context) {
	var req dto.UserVerifyEMailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 400, Message: "驗證碼不能為空", Data: err.Error(),
		})
		return
	}

	verify, _ := h.verificationService.VerifyCode(req.Code, req.Email)

	if !verify {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 500, Message: "驗證碼錯誤", Data: verify,
		})
		return
	}

	user, _ := h.userService.UserRepo.FindByEmail(req.Email)
	user.IsVerified = true
	h.userService.UserRepo.Save(user)

	c.JSON(http.StatusOK, dto.DTO{
		StatusCode: 200, Message: "驗證成功", Data: verify})
}

func (h *UserHandler) SendVerifyEmail(c *gin.Context) {
	email := c.Param("email")
	_, err := h.userService.SendVerifyEmailCode(email)
	if err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 500, Message: "發送驗證碼失敗", Data: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, dto.DTO{
		StatusCode: 200, Message: "驗證碼發送成功", Data: nil,
	})
}

func (h *UserHandler) Login(c *gin.Context) {
	var req dto.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, token, err := h.userService.Login(req.Account, req.Password)
	if err != nil {
		if err.Error() == "該賬號還未驗證" {
			c.JSON(http.StatusOK, dto.DTO{
				StatusCode: 401, Message: "該賬號還未驗證", Data: user.Email,
			})
			return
		} else {
			c.JSON(http.StatusOK, dto.DTO{
				StatusCode: 400, Message: err.Error(), Data: err.Error(),
			})
			return
		}
	}

	resp := dto.DTO{
		StatusCode: 200,
		Message:    "登入成功",
		Data:       map[string]interface{}{"token": token, "user": h.ToUserResp(user)},
	}

	c.JSON(http.StatusOK, resp)
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

	c.JSON(http.StatusOK, h.ToUserResp(user))
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

	c.JSON(http.StatusOK, gin.H{"user": h.ToUserResp(user), "token": token})
}

func (h *UserHandler) UploadAvatar(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 401, Message: "無法獲取用戶 ID", Data: nil,
		})
		return
	}
	// 獲取上傳的文件
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 400, Message: "請求參數錯誤", Data: err.Error(),
		})
		return
	}

	// 檢查文件類型（僅允許圖片）
	ext := filepath.Ext(file.Filename)
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 400, Message: "僅允許上傳 jpg、jpeg 或 png 格式的圖片", Data: nil,
		})
		return
	}

	file.Filename = fmt.Sprintf("%v_%s_%s", userID, file.Filename, time.Now().Format("20060102150405")) + ext

	// 儲存文件
	filePath := filepath.Join("uploads", fmt.Sprintf("%v_%s", userID, file.Filename))
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 500, Message: "文件上傳失敗", Data: err.Error(),
		})
		return
	}

	// 更新用戶資料庫中的圖片路徑
	user, err := h.userService.UserRepo.FindByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 404, Message: "用戶不存在", Data: err.Error(),
		})
		return
	}

	// 刪除舊的頭像文件（如果存在）
	if user.AvatarURL != nil {
		oldAvatarPath := filepath.Join("uploads", *user.AvatarURL)
		if err := os.Remove(oldAvatarPath); err != nil {
			c.JSON(http.StatusOK, dto.DTO{
				StatusCode: 500, Message: "刪除舊頭像失敗", Data: err.Error(),
			})
			return
		}
	}

	avatarURL := fmt.Sprintf("/uploads/%v_%s", userID, file.Filename)
	user.AvatarURL = &avatarURL
	if err := h.userService.UserRepo.Save(user); err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 500, Message: "更新用戶資料失敗", Data: err.Error(),
		})
		return
	}

	respUrl := fmt.Sprintf("%s/uploads/%v_%s", "http://172.20.10.2:8080", userID, file.Filename)

	c.JSON(http.StatusOK, dto.DTO{
		StatusCode: 200, Message: "頭像上傳成功", Data: respUrl,
	})
}

func (h *UserHandler) GetAvatar(c *gin.Context) {
	userID := c.Param("id")
	parsedUserID, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.userService.UserRepo.FindByID(uint(parsedUserID))
	if err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 404, Message: "用戶不存在", Data: fmt.Sprintf("%s%s", h.cfg.DOMAIN, "/uploads/default_avatar.png"),
		})
		return
	}

	if user.AvatarURL == nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 200, Message: "頭像不存在", Data: fmt.Sprintf("%s%s", h.cfg.DOMAIN, "/uploads/default_avatar.png"),
		})
		return
	}

	c.JSON(http.StatusOK, dto.DTO{
		StatusCode: 200, Message: "頭像獲取成功", Data: fmt.Sprintf("%s%s", h.cfg.DOMAIN, *user.AvatarURL)},
	)
}

func (h *UserHandler) GetLineLoginUrl(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	baseUrl := h.cfg.LINE_AUTHORIZATION_APIURL
	clientID := h.cfg.LINE_CLIENT_ID
	redirect_uri := fmt.Sprintf("%s/api/LineLoginCallback", h.cfg.DOMAIN)
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

func (h *UserHandler) ToUserResp(user *models.User) dto.UserResp {
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
		AvatarURL:   func() *string { url := fmt.Sprintf("%s%s", h.cfg.DOMAIN, *user.AvatarURL); return &url }(),
	}
}

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
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserHandler struct {
	userService         *service.UserService
	authService         *service.AuthService
	verificationService *service.VerificationService
	cfg                 *config.Config
	constantsService    *service.ConstantsService
}

func NewUserHandler(userService *service.UserService, authService *service.AuthService, verificationService *service.VerificationService, cfg *config.Config, constantsService *service.ConstantsService) *UserHandler {
	return &UserHandler{
		userService:         userService,
		authService:         authService,
		verificationService: verificationService,
		cfg:                 cfg,
		constantsService:    constantsService,
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
	var req dto.UserVerifyEmailRequest
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

	if req.Mode == 1 {
		user, _ := h.userService.GetUserByEmailORUserIDORAccount(nil, &req.Email, nil)
		user.IsVerified = true
		h.userService.Save(user)
	}

	if req.Mode == 2 {
		if err := h.userService.Verify(req.Email); err != nil {
			c.JSON(http.StatusOK, dto.DTO{StatusCode: 500, Message: "驗證失敗", Data: nil})
			return
		}
	}

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

	user.Password = ""

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
		fmt.Println(err.Error())
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	userIdentitiesID := []uint{}
	for _, item := range req.Identities {
		id, _ := h.constantsService.GetIdentityIDByName(item)
		userIdentitiesID = append(userIdentitiesID, id)
	}

	locationID, err := h.constantsService.GetLocationIDByName(req.Location)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}
	user, err := h.userService.UpdateProfile(userID.(uint), req.Name, req.Birthday, constants.StringToGender(req.Female), locationID, userIdentitiesID, req.IsSubscribe)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.DTO{StatusCode: 200, Data: h.ToUserResp(user), Message: "更改成功"})
}

func (h *UserHandler) GetUserProfile(c *gin.Context) {
	// 從上下文獲取用戶 ID（由 JWT 中間件設置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無法獲取用戶 ID"})
		return
	}

	// 查詢用戶
	uid := userID.(uint)
	user, err := h.userService.GetUserByEmailORUserIDORAccount(&uid, nil, nil)
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

	file.Filename = fmt.Sprintf("%v_%s", userID, time.Now().Format("20060102150405")) + ext

	// 儲存文件
	filePath := filepath.Join("../../avatar", file.Filename)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 500, Message: "文件上傳失敗", Data: err.Error(),
		})
		return
	}

	// 更新用戶資料庫中的圖片路徑
	uid := userID.(uint)
	user, err := h.userService.GetUserByEmailORUserIDORAccount(&uid, nil, nil)
	if err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 404, Message: "用戶不存在", Data: err.Error(),
		})
		return
	}

	// 刪除舊的頭像文件（如果存在）
	if user.AvatarURL != nil {
		oldAvatarPath := filepath.Join("../../avatar", *user.AvatarURL)
		if err := os.Remove(oldAvatarPath); err != nil {
			fmt.Println("刪除舊頭像失敗:", err)
			// c.JSON(http.StatusOK, dto.DTO{
			// 	StatusCode: 500, Message: "刪除舊頭像失敗", Data: err.Error(),
			// })
			// return
		}
	}

	user.AvatarURL = &file.Filename
	if err := h.userService.Save(user); err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 500, Message: "更新用戶資料失敗", Data: err.Error(),
		})
		return
	}

	respUrl := fmt.Sprintf("%s/%s/%s", h.cfg.DOMAIN, "avatar", file.Filename)

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

	convertedUserID := uint(parsedUserID)
	user, err := h.userService.GetUserByEmailORUserIDORAccount(&convertedUserID, nil, nil)
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
		StatusCode: 200, Message: "頭像獲取成功", Data: fmt.Sprintf("%s/%s", h.cfg.DOMAIN, *user.AvatarURL)},
	)
}

func (h *UserHandler) UpdataPassword(c *gin.Context) {
	var req dto.UpdatePasswordRequest

	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 400, Message: "系統繁忙", Data: nil,
		})
	}

	if err := h.userService.UpdataPassword(req.Email, req.Password); err != nil {
		c.JSON(http.StatusOK, dto.DTO{
			StatusCode: 400, Message: err.Error(), Data: nil,
		})
		return
	}

	c.JSON(http.StatusOK, dto.DTO{StatusCode: 200, Message: "更改成功", Data: nil})
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

	userID := uint(id)
	user, err := h.userService.GetUserByEmailORUserIDORAccount(&userID, nil, nil)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	user.LineID = &LineUserID
	h.userService.Save(user)

	c.JSON(http.StatusOK, gin.H{"message": "Line綁定成功，請返回app"})

}

func (h *UserHandler) ToUserResp(user *models.User) dto.UserResp {
	// 預設值
	var name, birthday, gender, location string
	var lineID, avatarURL *string
	identities := []string{}

	// 處理 Name
	if user.Name != nil {
		name = *user.Name
	} else {
		name = user.Account // 如果沒有名稱，則使用帳號作為名稱
	}

	// 處理 Birthday
	if user.Birthday != nil {
		parts := strings.Split(*user.Birthday, "T")
		// 日期部分已經是 YYYY-MM-DD 格式
		birthday = parts[0]
	}

	// 處理 Female (Gender)
	if user.Female != nil {
		gender = constants.GenderToString(*user.Female)
	} else {
		gender = constants.GenderToString(0) // 假設 0 表示未設定
	}

	// 處理 LocationID
	if user.LocationID != nil {
		location, _ = h.constantsService.GetLocationNameByID(*user.LocationID)
	} else {
		location = "未設定"
	}

	// 處理 Identities
	if user.Identities != nil {
		for _, identity := range *user.Identities {
			identityName, _ := h.constantsService.GetIdentityNameByID(identity.ID)
			identities = append(identities, identityName)
		}
	}

	// 處理 LineID
	lineID = user.LineID

	// 處理 AvatarURL
	if user.AvatarURL != nil {
		url := fmt.Sprintf("%s/%s/%s", h.cfg.DOMAIN, "avatar", *user.AvatarURL)
		avatarURL = &url
	} else {
		url := fmt.Sprintf("%s/%s/%s", h.cfg.DOMAIN, "avatar", "default_avatar.png")
		avatarURL = &url
	}

	return dto.UserResp{
		ID:          user.ID,
		Account:     user.Account,
		Name:        name,
		Gender:      gender,
		Location:    location,
		Birthday:    birthday,
		Identity:    identities,
		IsSubscribe: user.IsSubscribe,
		LineID:      lineID,
		AvatarURL:   avatarURL,
		Email:       user.Email,
	}
}

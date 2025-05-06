package dto

type UserResp struct {
	ID          uint     `json:"id"`
	Account     string   `json:"account"`
	Name        string   `json:"name"`
	Gender      string   `json:"gender"` // 轉換後的性別：男/女
	Location    string   `json:"location"`
	Birthday    string   `json:"birthday"`
	Identity    []string `json:"identities"`
	IsSubscribe bool     `json:"subscribe"`
	LineID      *string  `json:"line_id"` // LINE ID
	AvatarURL   *string  `json:"avatar_url"`
	Email       string   `json:"email"`
}

// UserRegisterRequest 註冊請求體
type UserRegisterRequest struct {
	Account  string `json:"account" binding:"required,min=3"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// UserLoginRequest 登錄請求體
type UserLoginRequest struct {
	Account  string `json:"account" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserUpdateRequest 更新資料請求體
type UserUpdateRequest struct {
	Name        string   `json:"name" binding:"required"`
	Birthday    string   `json:"birthday" binding:"required"`
	Female      string   `json:"gender" binding:"required"`
	Location    string   `json:"location" binding:"required"`
	Identities  []string `json:"identities" binding:"required"`
	IsSubscribe bool     `json:"subscribe"`
}

type UserVerifyEmailRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required"`
	Mode  uint   `json:"mode" binding:"required"`
}

type UpdatePasswordRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

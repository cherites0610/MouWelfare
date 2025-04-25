package dto

type FamilyResponse struct {
	ID      uint                 `json:"id"`
	Name    string               `json:"name"`
	Members []UserFamilyResponse `json:"members"`
}

type UserFamilyResponse struct {
	ID        uint   `json:"userId"`
	NickName  string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Role      uint   `json:"role"`
}

type CreateFamilyRequest struct {
	Name string `json:"name" binding:"required"`
}

type UpdateFamilyRequest struct {
	Name string `json:"name" binding:"required"`
}

type UpdateFamilyMemberRequest struct {
	UserID uint `json:"target_user_id" binding:"required"`
	Role   uint `json:"role" binding:"required"`
}

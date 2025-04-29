package dto

type Pagination struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"pageSize"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
}

type WelfarePaginatedResp struct {
	Data       []WelfareResp `json:"data"`
	Pagination Pagination    `json:"pagination"`
}

type FamilyMemberWelfareResp struct {
	AvatarUrl   string `json:"avatar_url"`
	LightStatus uint   `json:"light_status"`
	Name        string `json:"name"`
}

type WelfareResp struct {
	ID              uint                      `json:"id"`
	Location        string                    `json:"location"`
	Title           string                    `json:"title"`
	Details         string                    `json:"detail"`
	Url             string                    `json:"url"`
	PublicationDate string                    `json:"publication_date"`
	Status          bool                      `json:"status"`
	Identities      []string                  `json:"identities"`
	Categories      []string                  `json:"categories"`
	Forward         []string                  `json:"forward"`
	LightStatus     uint                      `json:"light_status"`
	FamilyMembers   []FamilyMemberWelfareResp `json:"family_member"`
}

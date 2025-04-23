package dto

type WelfareResp struct {
	ID              uint     `json:"id"`
	Location        string   `json:"location"`
	Title           string   `json:"title"`
	Details         string   `json:"detail"`
	Url             string   `json:"url"`
	PublicationDate string   `json:"publication_date"`
	Status          bool     `json:"status"`
	Identities      []string `json:"identities"`
	Categories      []string `json:"categories"`
	Forward         []string `json:"forward"`
	LightStatus     uint     `json:"light_status"`
}

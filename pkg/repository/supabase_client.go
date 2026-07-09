package repository

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type SupabaseClient struct {
	URL        string
	AnonKey    string
	HTTPClient *http.Client
}

func NewSupabaseClient(urlStr, anonKey string) *SupabaseClient {
	return &SupabaseClient{
		URL:     urlStr,
		AnonKey: anonKey,
		HTTPClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *SupabaseClient) Request(method, path string, queryParams map[string]string, body interface{}, prefer string) ([]byte, error) {
	reqURL, err := url.Parse(c.URL + "/rest/v1" + path)
	if err != nil {
		return nil, err
	}

	q := reqURL.Query()
	for k, v := range queryParams {
		q.Add(k, v)
	}
	reqURL.RawQuery = q.Encode()

	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequest(method, reqURL.String(), bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", c.AnonKey)
	req.Header.Set("Authorization", "Bearer "+c.AnonKey)
	req.Header.Set("Content-Type", "application/json")
	if prefer != "" {
		req.Header.Set("Prefer", prefer)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("supabase error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

#[tauri::command]
pub async fn check_latest_version() -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get("https://networkspy.app/latest")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch latest version: {e}"))?;
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;
    body.get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Version not found in response".to_string())
}

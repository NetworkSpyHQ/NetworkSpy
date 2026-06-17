use crate::*;
use tauri::{AppHandle, Manager, Emitter};
use std::sync::Arc;
use std::collections::HashMap;
use crate::scripting::ScriptManager;
use crate::map_local::MapLocalManager;
use crate::map_remote::MapRemoteManager;
use crate::traffic::db::{TrafficDb, TrafficEvent};
use crate::traffic::har_util::{create_har_log, HarLog};
use base64::{Engine as _, engine::general_purpose};
use std::fs;
use rusqlite::params;
use std::sync::atomic::Ordering;
use arboard::Clipboard;
use serde::{Serialize, Deserialize};

#[tauri::command]
pub fn write_to_clipboard(text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_proxy_settings(state: tauri::State<'_, ManagedProxySettings>) -> Result<ProxySettings, String> {
    let settings = state.0.read().map_err(|e| e.to_string())?;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn update_proxy_settings(
    state: tauri::State<'_, ManagedProxySettings>,
    config: tauri::State<'_, Arc<crate::config::ConfigManager>>,
    new_settings: ProxySettings,
) -> Result<(), String> {
    let mut settings = state.0.write().map_err(|e| e.to_string())?;
    *settings = new_settings.clone();
    
    config.set_proxy_settings(new_settings).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub async fn set_breakpoint_enabled(state: tauri::State<'_, Arc<BreakpointManager>>, enabled: bool) -> Result<(), String> {
    state.is_enabled.store(enabled, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn get_breakpoint_enabled(state: tauri::State<'_, Arc<BreakpointManager>>) -> Result<bool, String> {
    Ok(state.is_enabled.load(Ordering::SeqCst))
}

#[tauri::command]
pub async fn set_script_enabled(state: tauri::State<'_, Arc<ScriptManager>>, enabled: bool) -> Result<(), String> {
    state.is_enabled.store(enabled, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn get_script_enabled(state: tauri::State<'_, Arc<ScriptManager>>) -> Result<bool, String> {
    Ok(state.is_enabled.load(Ordering::SeqCst))
}

#[tauri::command]
pub async fn set_map_local_enabled(state: tauri::State<'_, Arc<MapLocalManager>>, enabled: bool) -> Result<(), String> {
    state.is_enabled.store(enabled, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn get_map_local_enabled(state: tauri::State<'_, Arc<MapLocalManager>>) -> Result<bool, String> {
    Ok(state.is_enabled.load(Ordering::SeqCst))
}

#[tauri::command]
pub async fn set_map_remote_enabled(state: tauri::State<'_, Arc<MapRemoteManager>>, enabled: bool) -> Result<(), String> {
    state.is_enabled.store(enabled, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn get_map_remote_enabled(state: tauri::State<'_, Arc<MapRemoteManager>>) -> Result<bool, String> {
    Ok(state.is_enabled.load(Ordering::SeqCst))
}

#[tauri::command]
pub async fn resume_breakpoint(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<BreakpointManager>>, 
    traffic_id: String,
    modified_data: Option<BreakpointData>
) -> Result<(), String> {
    let mut tasks = state.paused_tasks.write().await;
    if let Some(task) = tasks.remove(&traffic_id) {
        let _ = task.sender.send(modified_data);
        let _ = app.emit("breakpoint_resumed", traffic_id);
    }
    Ok(())
}

#[tauri::command]
pub async fn get_paused_data(
    state: tauri::State<'_, Arc<BreakpointManager>>,
    id: String
) -> Result<BreakpointData, String> {
    let tasks = state.paused_tasks.read().await;
    if let Some(task) = tasks.get(&id) {
        Ok(task.data.clone())
    } else {
        Err("Breakpoint data not found or already resumed".to_string())
    }
}

#[tauri::command]
pub async fn get_paused_breakpoints(state: tauri::State<'_, Arc<BreakpointManager>>) -> Result<Vec<BreakpointHit>, String> {
    let tasks = state.paused_tasks.read().await;
    Ok(tasks.iter().map(|(id, task)| BreakpointHit { 
        id: id.clone(), 
        name: task.name.clone() 
    }).collect())
}

#[tauri::command]
pub fn get_breakpoints(config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<Vec<traffic::db::BreakpointRule>, String> {
    Ok(config.get_breakpoints())
}

#[tauri::command]
pub fn save_breakpoint(rule: traffic::db::BreakpointRule, config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<(), String> {
    config.save_breakpoint(rule).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_breakpoint(id: String, config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<(), String> {
    config.delete_breakpoint(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_scripts(config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<Vec<traffic::db::ScriptRule>, String> {
    Ok(config.get_scripts())
}

#[tauri::command]
pub fn save_script(rule: traffic::db::ScriptRule, config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<(), String> {
    config.save_script(rule).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_script(id: String, config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<(), String> {
    config.delete_script(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_map_local_rules(config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<Vec<crate::traffic::db::MapLocalRule>, String> {
    Ok(config.get_map_local_rules())
}

#[tauri::command]
pub async fn save_map_local_rule(config: tauri::State<'_, Arc<crate::config::ConfigManager>>, rule: crate::traffic::db::MapLocalRule) -> Result<(), String> {
    config.save_map_local_rule(rule).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_map_local_rule(config: tauri::State<'_, Arc<crate::config::ConfigManager>>, id: String) -> Result<(), String> {
    config.delete_map_local_rule(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_map_remote_rules(config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<Vec<crate::traffic::schema::map_remote::MapRemoteRule>, String> {
    Ok(config.get_map_remote_rules())
}

#[tauri::command]
pub async fn save_map_remote_rule(config: tauri::State<'_, Arc<crate::config::ConfigManager>>, rule: crate::traffic::schema::map_remote::MapRemoteRule) -> Result<(), String> {
    config.save_map_remote_rule(rule).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_map_remote_rule(config: tauri::State<'_, Arc<crate::config::ConfigManager>>, id: i64) -> Result<(), String> {
    config.delete_map_remote_rule(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_proxy_rules(config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<Vec<traffic::db::ProxyRule>, String> {
    Ok(config.get_proxy_rules())
}

#[tauri::command]
pub async fn save_proxy_rule(
    rule: traffic::db::ProxyRule, 
    config: tauri::State<'_, Arc<crate::config::ConfigManager>>,
    state: tauri::State<'_, InterceptAllowList>,
    tunnel_state: tauri::State<'_, ManagedTunnelCloseMap>,
) -> Result<(), String> {
    config.save_proxy_rule(rule.clone()).map_err(|e| e.to_string())?;
    refresh_active_proxy_intercept_list(&state, &config).await?;

    close_tunnels_for_host(&tunnel_state, &rule.pattern);

    Ok(())
}

#[tauri::command]
pub async fn delete_proxy_rule(
    id: String, 
    config: tauri::State<'_, Arc<crate::config::ConfigManager>>,
    state: tauri::State<'_, InterceptAllowList>,
    tunnel_state: tauri::State<'_, ManagedTunnelCloseMap>,
) -> Result<(), String> {
    let rules = config.get_proxy_rules();
    if let Some(rule) = rules.iter().find(|r| r.id == id) {
        close_tunnels_for_host(&tunnel_state, &rule.pattern);
    }
    config.delete_proxy_rule(id).map_err(|e| e.to_string())?;
    refresh_active_proxy_intercept_list(&state, &config).await?;
    Ok(())
}

async fn refresh_active_proxy_intercept_list(
    state: &InterceptAllowList,
    config: &crate::config::ConfigManager,
) -> Result<(), String> {
    let rules = config.get_proxy_rules();
    let mut new_list = Vec::new();
    for rule in &rules {
        if rule.enabled {
            // Map traffic::db::ProxyRule to network_spy_proxy::ProxyRule
            new_list.push(network_spy_proxy::ProxyRule {
                pattern: rule.pattern.clone(),
                client: rule.client.clone(),
                action: rule.action.clone(),
            });
        }
    }
    let mut list = state.0.write().await;
    *list = new_list;
    Ok(())
}

pub static PROXY_TOGGLE: OnceCell<ProxyToggle> = OnceCell::new();
pub static CERTIFICATE_INSTALLER: OnceCell<CertificateInstaller> = OnceCell::new();

#[tauri::command]
pub fn turn_on_proxy(app: tauri::AppHandle) -> u16 {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);
    PROXY_TOGGLE.get().unwrap().turn_on(port as u64);
    let _ = app.emit("proxy-status", true);
    port
}

#[tauri::command]
pub fn turn_off_proxy(app: tauri::AppHandle) {
    PROXY_TOGGLE.get().unwrap().turn_off();
    let _ = app.emit("proxy-status", false);
}


#[tauri::command]
pub fn change_proxy_port(port: u16) -> u16 {
    let actual_port = (port..65535)
        .find(|p| std::net::TcpListener::bind(("127.0.0.1", *p)).is_ok())
        .unwrap_or(port);

    ACTUAL_PORT.store(actual_port, Ordering::SeqCst);
    
    // Signal restart if tx is initialized
    if let Some(tx) = RESTART_TX.get() {
        let _ = tx.send(actual_port);
    }

    actual_port
}

#[tauri::command]
pub fn get_app_data_dir() -> std::path::PathBuf {
    use std::env;
    let home = env::var("HOME").or_else(|_| env::var("USERPROFILE")).unwrap_or_else(|_| ".".to_string());
    std::path::PathBuf::from(home).join(".network-spy")
}

#[tauri::command]
pub fn install_certificate(app: tauri::AppHandle, state: tauri::State<'_, ManagedProxySettings>, cert_path: String) -> Result<String, String> {
    println!("INSTALL CERTIFICATE");
    let stream_logs = state.0.read()
        .map(|s| s.stream_certificate_logs)
        .unwrap_or(false);
    CERTIFICATE_INSTALLER.get().unwrap().install(Some(app), stream_logs, cert_path)
}

#[tauri::command]
pub fn auto_install_certificate(app: tauri::AppHandle, state: tauri::State<'_, ManagedProxySettings>) -> Result<String, String> {
    let app_data_dir = get_app_data_dir();
    let cert_path = app_data_dir.join("ca").join("network-spy.crt");
    
    if !cert_path.exists() {
        return Err(format!("Certificate file not found at: {}. Please restart the application.", cert_path.display()));
    }

    let cert_content = std::fs::read_to_string(cert_path).map_err(|e| e.to_string())?;
    let stream_logs = state.0.read()
        .map(|s| s.stream_certificate_logs)
        .unwrap_or(false);
    CERTIFICATE_INSTALLER.get().unwrap().install_from_content(Some(app), stream_logs, &cert_content)
}

#[tauri::command]
pub fn uninstall_certificate(app: tauri::AppHandle, state: tauri::State<'_, ManagedProxySettings>) -> Result<String, String> {
    let stream_logs = state.0.read()
        .map(|s| s.stream_certificate_logs)
        .unwrap_or(false);
    CERTIFICATE_INSTALLER.get().unwrap().uninstall(Some(app), stream_logs)
}

pub fn open_new_window_internal(app_handle: &tauri::AppHandle, context: String, title: String) {
    let label = context.split('?').next().unwrap_or(&context).to_string();

    // If window already exists, focus it instead of creating a duplicate
    if let Some(window) = app_handle.get_webview_window(&label) {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    // Build path relative to frontend dist (no leading slash - resolved by Tauri)
    let url_path = std::path::PathBuf::from(&context);

    match tauri::WebviewWindowBuilder::new(
        app_handle,
        label,
        tauri::WebviewUrl::App(url_path),
    )
        .title(title.clone())
    .inner_size(1500.0, 700.0)
    .resizable(true)
    .build()
    {
        Ok(window) => {
            let _ = window.show();
            let _ = window.set_focus();
            println!("[open_new_window] Created '{}' window for '{}'", title, context);
        }
        Err(e) => {
            eprintln!("[open_new_window] Failed to create window '{}': {}", title, e);
        }
    }
}

#[tauri::command]
pub async fn open_new_window(app_handle: tauri::AppHandle, context: String, title: String) {
    // Must be async to avoid WebView2 deadlock on Windows (WebView2 creation requires the main thread event loop).
    open_new_window_internal(&app_handle, context, title);
}

#[tauri::command]
pub async fn trigger_menu_action(app_handle: tauri::AppHandle, action: String) {
    match action.as_str() {
        "install_cert" | "cert-installer" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "certificate-installer".into(), "Certificate Installer".into());
            });
        }
        "saved_sessions" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "sessions".into(), "Saved Sessions".into());
            });
        }
        "traffic_filters" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "filters".into(), "Traffic Filters".into());
            });
        }
        "tools_tag" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "tag".into(), "Tag Tools".into());
            });
        }
        "proxylist" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "proxylist".into(), "Proxy Intercept Rules".into());
            });
        }
        "breakpoints" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "breakpoint".into(), "Traffic Breakpoints".into());
            });
        }
        "map_local" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "map-local".into(), "Map Local Rules".into());
            });
        }
        "map_remote" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "map-remote".into(), "Map Remote Rules".into());
            });
        }
        "scripting" => {
            let h = app_handle.clone(); tauri::async_runtime::spawn(async move {
                open_new_window_internal(&h, "scripting".into(), "Custom Scripting".into());
            });
        }
        "check_updates" => {
            let _ = app_handle.emit("check-for-updates", ());
        }
        "toggle_capture" => {
            if let Some(toggle) = PROXY_TOGGLE.get() {
                if toggle.is_on() {
                    toggle.turn_off();
                    let _ = app_handle.emit("proxy-status", false);
                } else {
                    let port = ACTUAL_PORT.load(Ordering::SeqCst) as u64;
                    toggle.turn_on(port);
                    let _ = app_handle.emit("proxy-status", true);
                }
            }
        }
        "clear_traffic" => {
            let _ = app_handle.emit("menu-clear-traffic", ());
        }
        "save_capture" => {
            let _ = app_handle.emit("menu-save-capture", ());
        }
        "show" => {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "reload" => {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.eval("window.location.reload()");
            }
        }
        "quit" => {
            if let Some(toggle) = PROXY_TOGGLE.get() {
                toggle.turn_off();
            }
            app_handle.exit(0);
        }
        _ => {}
    }
}

#[tauri::command]
pub fn get_recent_traffic(
    db: tauri::State<'_, Arc<TrafficDb>>,
    limit: usize,
) -> Vec<traffic::db::TrafficMetadata> {
    db.get_recent_traffic(limit)
}

#[tauri::command]
pub fn get_all_metadata(
    db: tauri::State<'_, Arc<TrafficDb>>,
    limit: Option<usize>,
) -> Vec<traffic::db::TrafficMetadata> {
    db.get_all_metadata(limit.unwrap_or(10)).unwrap_or_default()
}

#[tauri::command]
pub fn get_filter_presets(config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<Vec<traffic::db::FilterPreset>, String> {
    Ok(config.get_filter_presets())
}

#[tauri::command]
pub fn add_filter_preset(preset: traffic::db::FilterPreset, config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<(), String> {
    config.add_filter_preset(preset).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_filter_preset(
    id: String, 
    name: Option<String>, 
    description: Option<String>, 
    filters: Option<String>, 
    config: tauri::State<'_, Arc<crate::config::ConfigManager>>
) -> Result<(), String> {
    config.update_filter_preset(id, name, description, filters).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_filter_preset(id: String, config: tauri::State<'_, Arc<crate::config::ConfigManager>>) -> Result<(), String> {
    config.delete_filter_preset(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_session(path: String, db: tauri::State<'_, Arc<TrafficDb>>) -> Result<(), String> {
    let data = db.get_all_traffic_with_bodies().map_err(|e: rusqlite::Error| e.to_string())?;
    let har = create_har_log(data);
    let json = serde_json::to_string_pretty(&har).map_err(|e: serde_json::Error| e.to_string())?;
    fs::write(path, json).map_err(|e: std::io::Error| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn export_selected_to_har(path: String, ids: Vec<String>, db: tauri::State<'_, Arc<TrafficDb>>) -> Result<(), String> {
    let data = db.get_traffic_with_bodies_by_ids(ids).map_err(|e: rusqlite::Error| e.to_string())?;
    let har = create_har_log(data);
    let json = serde_json::to_string_pretty(&har).map_err(|e: serde_json::Error| e.to_string())?;
    fs::write(path, json).map_err(|e: std::io::Error| e.to_string())?;
    Ok(())
}

pub fn handle_tray_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id.as_ref() {
        "quit" => {
            if let Some(toggle) = PROXY_TOGGLE.get() {
                toggle.turn_off();
            }
            app.exit(0);
        }
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "reset_proxy" => {
            if let Some(toggle) = PROXY_TOGGLE.get() {
                toggle.turn_off();
            }
        }
        _ => {}
    }
}

#[tauri::command]
pub async fn export_selected_to_csv(path: String, ids: Vec<String>, db: tauri::State<'_, Arc<TrafficDb>>) -> Result<(), String> {
    let data = db.get_traffic_with_bodies_by_ids(ids).map_err(|e: rusqlite::Error| e.to_string())?;
    let mut csv_content = String::from("ID,Timestamp,Method,URI,Status,Client,RequestBody,ResponseBody\n");
    
    for (meta, req_body, res_body, req_ct, _, res_ct, _) in data {
        let uri = meta.uri.unwrap_or_default().replace('\"', "\"\"");
        let client = meta.client.unwrap_or_default().replace('\"', "\"\"");
        let req_s = body_to_string(&req_body, &req_ct).replace('\"', "\"\"");
        let res_s = body_to_string(&res_body, &res_ct).replace('\"', "\"\"");
        
        let line = format!(
            "{},\"{}\",{},\"{}\",{},\"{}\",\"{}\",\"{}\"\n",
            meta.id,
            meta.timestamp,
            meta.method.unwrap_or_default(),
            uri,
            meta.status_code.unwrap_or(0),
            client,
            req_s,
            res_s
        );
        csv_content.push_str(&line);
    }
    
    fs::write(path, csv_content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn repeat_request(
    db: tauri::State<'_, Arc<TrafficDb>>,
    traffic_id: String,
) -> Result<(), String> {
    let req_data = db.get_request_data(&traffic_id).ok_or("Request data not found")?;
    let meta = db.get_traffic_metadata(traffic_id).map_err(|e| e.to_string())?.ok_or("Metadata not found")?;

    let client = reqwest::Client::new();
    let method = match meta.method.as_deref() {
        Some("GET") => reqwest::Method::GET,
        Some("POST") => reqwest::Method::POST,
        Some("PUT") => reqwest::Method::PUT,
        Some("DELETE") => reqwest::Method::DELETE,
        Some("PATCH") => reqwest::Method::PATCH,
        Some("HEAD") => reqwest::Method::HEAD,
        Some("OPTIONS") => reqwest::Method::OPTIONS,
        _ => reqwest::Method::GET,
    };

    let mut request_builder = client.request(method, meta.uri.ok_or("URI not found")?);

    for (key, value) in req_data.headers {
        let key_lower = key.to_lowercase();
        if key_lower == "content-length" || key_lower == "host" || key_lower == "connection" {
            continue;
        }
        request_builder = request_builder.header(key, value);
    }

    if !req_data.body.is_empty() {
        request_builder = request_builder.body(req_data.body);
    }

    tokio::spawn(async move {
        let _ = request_builder.send().await;
    });

    Ok(())
}

#[tauri::command]
pub async fn repeat_request_with_data(
    data: BreakpointData,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let method = match data.method.as_deref() {
        Some("GET") => reqwest::Method::GET,
        Some("POST") => reqwest::Method::POST,
        Some("PUT") => reqwest::Method::PUT,
        Some("DELETE") => reqwest::Method::DELETE,
        Some("PATCH") => reqwest::Method::PATCH,
        Some("HEAD") => reqwest::Method::HEAD,
        Some("OPTIONS") => reqwest::Method::OPTIONS,
        _ => reqwest::Method::GET,
    };

    let mut request_builder = client.request(method, data.uri.ok_or("URI not found")?);

    for (key, value) in data.headers {
        let key_lower = key.to_lowercase();
        if key_lower == "content-length" || key_lower == "host" || key_lower == "connection" {
            continue;
        }
        request_builder = request_builder.header(key, value);
    }

    if !data.body.is_empty() {
        request_builder = request_builder.body(data.body);
    }

    tokio::spawn(async move {
        let _ = request_builder.send().await;
    });

    Ok(())
}

#[tauri::command]
pub async fn export_selected_to_sqlite(path: String, ids: Vec<String>, db: tauri::State<'_, Arc<TrafficDb>>) -> Result<(), String> {
    let data = db.get_traffic_with_bodies_by_ids(ids).map_err(|e: rusqlite::Error| e.to_string())?;
    
    let conn = rusqlite::Connection::open(&path).map_err(|e| e.to_string())?;
    
    conn.execute_batch(
        "CREATE TABLE traffic (
            id TEXT PRIMARY KEY,
            uri TEXT,
            method TEXT,
            version TEXT,
            client TEXT,
            req_headers TEXT,
            res_headers TEXT,
            status_code INTEGER,
            intercepted INTEGER,
            timestamp DATETIME
        );
        CREATE TABLE body (
            traffic_id TEXT PRIMARY KEY,
            req_body BLOB,
            res_body BLOB,
            req_body_text TEXT,
            res_body_text TEXT,
            req_content_type TEXT,
            res_content_type TEXT
        );"
    ).map_err(|e| e.to_string())?;
    
    {
        let mut ins_traffic = conn.prepare("INSERT INTO traffic (id, uri, method, version, client, req_headers, res_headers, status_code, intercepted, timestamp) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)").map_err(|e| e.to_string())?;
        let mut ins_body = conn.prepare("INSERT INTO body (traffic_id, req_body, res_body, req_body_text, res_body_text, req_content_type, res_content_type) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)").map_err(|e| e.to_string())?;
        
        for (meta, req_body, res_body, req_ct, _, res_ct, _) in data {
            ins_traffic.execute(params![
                meta.id, meta.uri, meta.method, meta.version, meta.client, meta.req_headers, meta.res_headers, meta.status_code, if meta.intercepted { 1 } else { 0 }, meta.timestamp
            ]).map_err(|e| e.to_string())?;
            
            let req_text = if is_text_content_type(&req_ct) { Some(body_to_string(&req_body, &req_ct)) } else { None };
            let res_text = if is_text_content_type(&res_ct) { Some(body_to_string(&res_body, &res_ct)) } else { None };

            ins_body.execute(params![
                meta.id, req_body, res_body, req_text, res_text, req_ct, res_ct
            ]).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn load_session(path: String, db: tauri::State<'_, Arc<TrafficDb>>, app_handle: AppHandle) -> Result<(), String> {
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let har: HarLog = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    db.clear_all().map_err(|e: rusqlite::Error| e.to_string())?;
    app_handle.emit("traffic_cleared", ()).map_err(|e| e.to_string())?;
    std::thread::sleep(std::time::Duration::from_millis(100));
    
    let entries_count = har.log.entries.len();
    println!("Importing {} entries from HAR", entries_count);

    for (i, entry) in har.log.entries.into_iter().enumerate() {
        if i % 10 == 0 {
            std::thread::sleep(std::time::Duration::from_millis(1));
        }
        let timestamp = entry.started_date_time.clone();
        let id = format!("har_{}_{}", timestamp, i);
        
        // Request
        let mut req_headers = HashMap::new();
        for h in entry.request.headers {
            req_headers.insert(h.name.clone(), h.value);
        }

        let method = entry.request.method.clone();
        let url = entry.request.url.clone();
        let version = entry.request.http_version.clone();
        let body_size = entry.request.body_size as usize;

        let req_body = if let Some(post) = entry.request.post_data {
            post.text.into_bytes()
        } else {
            vec![]
        };

        let content_type = req_headers.get("content-type").or_else(|| req_headers.get("Content-Type")).cloned();
        let content_encoding = req_headers.get("content-encoding").or_else(|| req_headers.get("Content-Encoding")).cloned();

        db.insert_request(TrafficEvent::Request {
            id: id.clone(),
            uri: url.clone(),
            method: method.clone(),
            version: version.clone(),
            headers: req_headers.clone(),
            body: req_body,
            content_type,
            content_encoding,
            intercepted: true,
            client: "HAR Import".to_string(),
            tags: vec![],
        });

        let _ = app_handle.emit("traffic_event", Payload {
            id: id.clone(),
            is_request: true,
            data: PayloadTraffic {
                uri: Some(url),
                version: Some(version.clone()),
                method: Some(method),
                headers: req_headers,
                body_size,
                intercepted: true,
                status_code: None,
                client: Some("HAR Import".to_string()),
                tags: vec![],
            }
        });

        // Response
        let mut res_headers = HashMap::new();
        for h in entry.response.headers {
            res_headers.insert(h.name.clone(), h.value);
        }

        let res_body = if let Some(text) = entry.response.content.text {
            if entry.response.content.encoding.as_deref() == Some("base64") {
                general_purpose::STANDARD.decode(text).unwrap_or_default()
            } else {
                text.into_bytes()
            }
        } else {
            vec![]
        };

        let status_code = entry.response.status;
        let res_body_size = entry.response.content.size;

        let content_type = res_headers.get("content-type").or_else(|| res_headers.get("Content-Type")).cloned();
        let content_encoding = res_headers.get("content-encoding").or_else(|| res_headers.get("Content-Encoding")).cloned();

        db.insert_response(TrafficEvent::Response {
            id: id.clone(),
            headers: res_headers.clone(),
            body: res_body,
            content_type,
            content_encoding,
            status_code,
        });

        let _ = app_handle.emit("traffic_event", Payload {
            id: id.clone(),
            is_request: false,
            data: PayloadTraffic {
                uri: None,
                version: Some(entry.response.http_version.clone()),
                method: None,
                headers: res_headers,
                body_size: res_body_size,
                intercepted: true,
                status_code: Some(status_code),
                client: Some("HAR Import".to_string()),
                tags: vec![],
            }
        });
    }
    
    Ok(())
}

#[tauri::command]
pub fn validate_filter_preset_command(preset: serde_json::Value) -> Result<(), String> {
    crate::mcp::validator::validate_filter_preset(&preset)
}

#[tauri::command]
pub async fn select_workspace_dir(
    app_handle: tauri::AppHandle,
    config_manager: tauri::State<'_, Arc<crate::config::ConfigManager>>,
    session_manager: tauri::State<'_, Arc<crate::traffic::sessions::SessionManager>>,
    proxy_settings_state: tauri::State<'_, ManagedProxySettings>,
    intercept_list_state: tauri::State<'_, InterceptAllowList>,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let (tx, rx) = std::sync::mpsc::channel();
    
    app_handle.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder);
    });
    
    let folder = rx.recv().map_err(|e| e.to_string())?;
    
    if let Some(path) = folder {
        let path_buf = match path {
            tauri_plugin_dialog::FilePath::Path(p) => p,
            tauri_plugin_dialog::FilePath::Url(u) => u.to_file_path().map_err(|_| "Invalid file URL".to_string())?,
        };
        
        // Update ConfigManager (reloads YAML)
        config_manager.set_base_dir(path_buf.clone()).map_err(|e| e.to_string())?;
        
        // Refresh proxy settings from new config
        let new_settings = config_manager.get_proxy_settings();
        if let Ok(mut settings) = proxy_settings_state.0.write() {
            *settings = new_settings;
        }
        
        // Refresh intercept list from new config
        refresh_active_proxy_intercept_list(&intercept_list_state, &config_manager).await?;
        
        // Update SessionManager
        session_manager.set_sessions_dir(path_buf.join("sessions"));
        
        // Save Workspace State
        let mut state = crate::workspace::load_workspace_state();
        state.current_workspace_path = Some(path_buf.clone());
        crate::workspace::save_workspace_state(&state).map_err(|e| e.to_string())?;
        
        Ok(path_buf.to_string_lossy().to_string())
    } else {
        Err("No folder selected".to_string())
    }
}

#[tauri::command]
pub fn get_current_workspace() -> Option<String> {
    let state = crate::workspace::load_workspace_state();
    state.current_workspace_path.map(|p| p.to_string_lossy().to_string())
}

#[derive(Debug, Clone, Serialize)]
pub struct BrowserInfo {
    pub name: String,
    pub path: String,
    pub running: bool,
}

fn is_browser_running(name: &str) -> bool {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("osascript")
            .args(["-e", &format!("application \"{}\" is running", name)])
            .output();
        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            return stdout.trim() == "true";
        }
    }

    #[cfg(target_os = "windows")]
    {
        let exe_name = format!("{}.exe", name.to_lowercase().replace(' ', ""));
        let output = std::process::Command::new("tasklist")
            .args(["/fi", &format!("IMAGENAME eq {}", exe_name), "/nh"])
            .output();
        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            return stdout.contains(&exe_name);
        }
    }

    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("pgrep")
            .args(["-f", name])
            .output();
        if let Ok(out) = output {
            return out.status.success();
        }
    }

    false
}

fn kill_browser_process(name: &str) {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("osascript")
            .args(["-e", &format!("quit app \"{}\"", name)])
            .output();
    }

    #[cfg(target_os = "windows")]
    {
        let exe_name = format!("{}.exe", name.to_lowercase().replace(' ', ""));
        let _ = std::process::Command::new("taskkill")
            .args(["/f", "/im", &exe_name])
            .output();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-f", name])
            .output();
    }
}

fn open_browser(path: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch browser: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("start")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch browser: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch browser: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn launch_browser(name: String, path: String) -> Result<(), String> {
    open_browser(&path)
}

#[tauri::command]
pub fn relaunch_browser(name: String, path: String) -> Result<(), String> {
    kill_browser_process(&name);
    std::thread::sleep(std::time::Duration::from_millis(500));
    open_browser(&path)
}

#[derive(Debug, Deserialize)]
struct BrowserEntry {
    name: String,
    path: String,
}

#[derive(Debug, Deserialize)]
struct BrowserConfig {
    macos: Vec<BrowserEntry>,
    windows: Vec<BrowserEntry>,
    linux: Vec<BrowserEntry>,
}

#[tauri::command]
pub fn get_installed_browsers() -> Vec<BrowserInfo> {
    let config: BrowserConfig = match serde_json::from_str(include_str!("../browsers.json")) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let entries: &[BrowserEntry] = {
        #[cfg(target_os = "macos")] { &config.macos }
        #[cfg(target_os = "windows")] { &config.windows }
        #[cfg(target_os = "linux")] { &config.linux }
    };

    let mut browsers = Vec::new();

    for entry in entries {
        #[cfg(not(target_os = "linux"))]
        if std::path::Path::new(&entry.path).exists() {
            browsers.push(BrowserInfo {
                name: entry.name.clone(),
                path: entry.path.clone(),
                running: is_browser_running(&entry.name),
            });
        }

        #[cfg(target_os = "linux")]
        if let Ok(path) = std::process::Command::new("which").arg(&entry.path).output() {
            if path.status.success() {
                let path_str = String::from_utf8_lossy(&path.stdout).trim().to_string();
                if !path_str.is_empty() {
                    browsers.push(BrowserInfo {
                        name: entry.name.clone(),
                        path: path_str,
                        running: is_browser_running(&entry.name),
                    });
                }
            }
        }
    }

    browsers
}

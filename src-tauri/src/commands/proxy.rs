use crate::*;
use crate::settings::{ProxySettings, ManagedProxySettings};
use crate::commands::PROXY_TOGGLE;
use tauri::Emitter;
use std::sync::atomic::Ordering;
use std::sync::Arc;
#[cfg(target_os = "macos")]
use crate::proxy_helper::ProxyHelper;

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

    if let Some(tx) = RESTART_TX.get() {
        let _ = tx.send(actual_port);
    }

    actual_port
}

#[tauri::command]
pub fn is_helper_installed() -> bool {
    #[cfg(target_os = "macos")]
    {
        let helper = ProxyHelper::new();
        helper.get_status().is_ok()
    }
    #[cfg(not(target_os = "macos"))]
    false
}

#[tauri::command]
pub fn install_proxy_helper() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        crate::proxy_helper::install_helper()
    }
    #[cfg(not(target_os = "macos"))]
    Err("not supported on this platform".into())
}

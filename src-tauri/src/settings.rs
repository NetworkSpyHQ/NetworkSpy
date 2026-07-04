use std::sync::Arc;
use tokio::sync::RwLock as AsyncRwLock;
use std::sync::RwLock as StdRwLock;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ProxySettings {
    #[serde(default)]
    pub stream_certificate_logs: bool,
    #[serde(default)]
    pub mcp_stdio_enabled: bool,
    #[serde(default)]
    pub mcp_http_enabled: bool,
    #[serde(default = "default_port")]
    pub mcp_http_port: u16,
    #[serde(default)]
    pub device_id: String,
    #[serde(default = "default_autosave")]
    pub autosave: bool,
    #[serde(default)]
    pub pinned_bottom_pane_modes: Vec<String>,
    #[serde(default)]
    pub pinned_command_palette_items: Vec<String>,
    #[serde(default = "default_true")]
    pub pane_left_visible: bool,
    #[serde(default = "default_true")]
    pub pane_bottom_visible: bool,
    #[serde(default)]
    pub pane_right_visible: bool,
    #[serde(default = "default_center_layout")]
    pub pane_center_layout: String,
    #[serde(default = "default_window_sizes")]
    pub main_window_sizes: Vec<String>,
}

fn default_port() -> u16 { 3001 }
fn default_autosave() -> bool { true }
fn default_true() -> bool { true }
fn default_center_layout() -> String { "vertical".to_string() }
fn default_window_sizes() -> Vec<String> { vec!["70%".to_string(), "0%".to_string()] }

impl Default for ProxySettings {
    fn default() -> Self {
        Self {
            stream_certificate_logs: false,
            mcp_stdio_enabled: false,
            mcp_http_enabled: false,
            mcp_http_port: 3001,
            device_id: "".to_string(),
            autosave: true,
            pinned_bottom_pane_modes: vec![],
            pinned_command_palette_items: vec![],
            pane_left_visible: true,
            pane_bottom_visible: true,
            pane_right_visible: false,
            pane_center_layout: "vertical".to_string(),
            main_window_sizes: vec!["70%".to_string(), "0%".to_string()],
        }
    }
}

pub struct ManagedProxySettings(pub Arc<StdRwLock<ProxySettings>>);
pub struct InterceptAllowList(pub Arc<AsyncRwLock<Vec<network_spy_proxy::ProxyRule>>>);

pub use network_spy_proxy::proxy::close_tunnels_for_host;
pub type ManagedTunnelCloseMap = network_spy_proxy::proxy::TunnelShutdownMap;

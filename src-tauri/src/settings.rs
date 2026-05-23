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
}

fn default_port() -> u16 { 3001 }
fn default_autosave() -> bool { true }

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
        }
    }
}

pub struct ManagedProxySettings(pub Arc<StdRwLock<ProxySettings>>);
pub struct InterceptAllowList(pub Arc<AsyncRwLock<Vec<network_spy_proxy::ProxyRule>>>);

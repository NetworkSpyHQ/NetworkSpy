use serde::{Serialize, Deserialize};
use std::sync::OnceLock;
use std::sync::Mutex;
use std::collections::HashSet;
use tauri::Emitter;
use crate::utils::ACTUAL_PORT;
use std::sync::atomic::Ordering;

static MONITOR_STARTED: OnceLock<bool> = OnceLock::new();
static ADB_REVERSE_ACTIVE: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

fn adb_reverse_state() -> &'static Mutex<HashSet<String>> {
    ADB_REVERSE_ACTIVE.get_or_init(|| Mutex::new(HashSet::new()))
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DeviceInfo {
    pub serial: String,
    pub status: String,
    pub model: Option<String>,
    pub product: Option<String>,
    pub transport_id: Option<String>,
    pub usb: Option<String>,
}

#[tauri::command]
pub fn detect_devices(app: tauri::AppHandle) -> Vec<DeviceInfo> {
    MONITOR_STARTED.get_or_init(|| {
        start_device_monitor(app);
        true
    });
    run_adb_devices()
}

fn start_device_monitor(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut previous: Vec<DeviceInfo> = Vec::new();
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            let current = run_adb_devices();
            if current != previous {
                let _ = app.emit("device-list-changed", &current);
                previous = current;
            }
        }
    });
}

fn run_adb_devices() -> Vec<DeviceInfo> {
    let output = std::process::Command::new("adb")
        .args(["devices", "-l"])
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            parse_adb_devices(&stdout)
        }
        Err(_) => Vec::new(),
    }
}

fn parse_adb_devices(output: &str) -> Vec<DeviceInfo> {
    let mut devices = Vec::new();
    let mut in_device_list = false;

    for line in output.lines() {
        if line.starts_with("List of devices attached") {
            in_device_list = true;
            continue;
        }
        if !in_device_list || line.trim().is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let serial = parts[0].to_string();
        let status = parts[1].to_string();

        let mut model = None;
        let mut product = None;
        let mut transport_id = None;
        let mut usb = None;

        for part in &parts[2..] {
            if let Some((key, value)) = part.split_once(':') {
                match key {
                    "model" => model = Some(value.to_string()),
                    "product" => product = Some(value.to_string()),
                    "transport_id" => transport_id = Some(value.to_string()),
                    "usb" => usb = Some(value.to_string()),
                    _ => {}
                }
            }
        }

        devices.push(DeviceInfo {
            serial,
            status,
            model,
            product,
            transport_id,
            usb,
        });
    }

    devices
}

fn run_adb(serial: &str, args: &[&str]) -> Result<(), String> {
    let mut cmd = std::process::Command::new("adb");
    cmd.arg("-s").arg(serial);
    for arg in args {
        cmd.arg(arg);
    }
    let output = cmd.output().map_err(|e| format!("Failed to run adb: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn adb_device_start_proxy(serial: String) -> Result<(), String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);

    run_adb(&serial, &["reverse", &format!("tcp:{}", port), &format!("tcp:{}", port)])?;
    run_adb(&serial, &["shell", "settings", "put", "global", "http_proxy", &format!("127.0.0.1:{}", port)])?;

    adb_reverse_state().lock().unwrap().insert(serial);
    Ok(())
}

#[tauri::command]
pub fn adb_device_stop_proxy(serial: String) -> Result<(), String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);

    let _ = run_adb(&serial, &["shell", "settings", "put", "global", "http_proxy", ":0"]);
    let _ = run_adb(&serial, &["reverse", "--remove", &format!("tcp:{}", port)]);

    adb_reverse_state().lock().unwrap().remove(&serial);
    Ok(())
}

#[tauri::command]
pub fn get_adb_proxy_serials() -> Vec<String> {
    adb_reverse_state().lock().unwrap().iter().cloned().collect()
}

use serde::{Serialize, Deserialize};
use std::sync::OnceLock;
use std::sync::Mutex;
use std::collections::HashSet;
use tauri::Emitter;
use crate::utils::ACTUAL_PORT;
use std::sync::atomic::Ordering;
use std::path::PathBuf;

static MONITOR_STARTED: OnceLock<bool> = OnceLock::new();
static ADB_REVERSE_ACTIVE: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();
static ADB_PATH: OnceLock<String> = OnceLock::new();

fn find_adb() -> &'static str {
    ADB_PATH.get_or_init(|| {
        // Try plain "adb" first (PATH lookup — works in debug, may fail in production)
        if which_adb("adb").is_some() {
            println!("[adb] found via PATH: adb");
            return "adb".to_string();
        }

        // Check ANDROID_HOME
        if let Ok(home) = std::env::var("ANDROID_HOME") {
            let path = PathBuf::from(&home).join("platform-tools").join("adb");
            if path.exists() {
                let s = path.to_string_lossy().to_string();
                println!("[adb] found via ANDROID_HOME: {s}");
                return s;
            }
        }

        // Check ANDROID_SDK_ROOT
        if let Ok(root) = std::env::var("ANDROID_SDK_ROOT") {
            let path = PathBuf::from(&root).join("platform-tools").join("adb");
            if path.exists() {
                let s = path.to_string_lossy().to_string();
                println!("[adb] found via ANDROID_SDK_ROOT: {s}");
                return s;
            }
        }

        // Common macOS locations
        for candidate in [
            "~/Library/Android/sdk/platform-tools/adb",
            "~/.android/platform-tools/adb",
        ] {
            let expanded = shellexpand::tilde(candidate).to_string();
            if std::path::Path::new(&expanded).exists() {
                println!("[adb] found at: {expanded}");
                return expanded;
            }
        }

        // Common Linux / Windows locations
        for candidate in [
            "~/Android/Sdk/platform-tools/adb",
        ] {
            let expanded = shellexpand::tilde(candidate).to_string();
            if std::path::Path::new(&expanded).exists() {
                println!("[adb] found at: {expanded}");
                return expanded;
            }
        }

        // Fallback — let the OS try PATH anyway (will likely fail with a clear error)
        println!("[adb] not found in any known location, falling back to PATH lookup");
        "adb".to_string()
    })
}

fn which_adb(name: &str) -> Option<PathBuf> {
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths).find_map(|dir| {
            let full = dir.join(name);
            if full.is_file() {
                Some(full)
            } else {
                // On Windows, try with .exe extension
                let with_exe = dir.join(format!("{}.exe", name));
                if with_exe.is_file() {
                    Some(with_exe)
                } else {
                    None
                }
            }
        })
    })
}

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
    let adb = find_adb();
    println!("[adb] running: {adb} devices -l");

    let output = std::process::Command::new(adb)
        .args(["devices", "-l"])
        .output();

    match output {
        Ok(out) => {
            if !out.status.success() {
                let stderr = String::from_utf8_lossy(&out.stderr);
                eprintln!("[adb] devices -l failed (exit code: {:?}): {stderr}", out.status.code());
                return Vec::new();
            }
            let stdout = String::from_utf8_lossy(&out.stdout);
            let devices = parse_adb_devices(&stdout);
            println!("[adb] found {} device(s)", devices.len());
            devices
        }
        Err(e) => {
            eprintln!("[adb] failed to execute '{adb} devices -l': {e}");
            Vec::new()
        }
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
    let adb = find_adb();
    let cmd_str = format!("{adb} -s {serial} {}", args.join(" "));
    println!("[adb] running: {cmd_str}");

    let mut cmd = std::process::Command::new(adb);
    cmd.arg("-s").arg(serial);
    for arg in args {
        cmd.arg(arg);
    }
    let output = cmd.output().map_err(|e| {
        let msg = format!("Failed to run adb: {e}");
        eprintln!("[adb] {msg}");
        msg
    })?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let msg = format!("adb command failed: {stderr}");
        eprintln!("[adb] {msg}");
        return Err(msg);
    }
    Ok(())
}

fn notify_device(serial: &str, title: &str, text: &str) {
    let adb = find_adb();
    let result = std::process::Command::new(adb)
        .args(["-s", serial, "shell"])
        .arg(format!(
            "cmd notification post -S bigtext -t '{}' networkspy_proxy '{}'",
            title.replace('\'', "'\\''"),
            text.replace('\'', "'\\''"),
        ))
        .output();
    if let Err(e) = result {
        eprintln!("[adb] notification failed for {serial}: {e}");
    }
}

#[tauri::command]
pub fn adb_device_start_proxy(serial: String) -> Result<(), String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);

    run_adb(&serial, &["reverse", &format!("tcp:{}", port), &format!("tcp:{}", port)])?;
    run_adb(&serial, &["shell", "settings", "put", "global", "http_proxy", &format!("127.0.0.1:{}", port)])?;

    notify_device(&serial, "NetworkSpy", &format!("Proxy connected on port {}", port));

    adb_reverse_state().lock().unwrap().insert(serial);
    Ok(())
}

#[tauri::command]
pub fn adb_device_stop_proxy(serial: String) -> Result<(), String> {
    let port = ACTUAL_PORT.load(Ordering::SeqCst);

    let _ = run_adb(&serial, &["shell", "settings", "put", "global", "http_proxy", ":0"]);
    let _ = run_adb(&serial, &["reverse", "--remove", &format!("tcp:{}", port)]);

    notify_device(&serial, "NetworkSpy", "Proxy disconnected");

    adb_reverse_state().lock().unwrap().remove(&serial);
    Ok(())
}

#[tauri::command]
pub fn get_adb_proxy_serials() -> Vec<String> {
    adb_reverse_state().lock().unwrap().iter().cloned().collect()
}

#[tauri::command]
pub fn adb_push_cert(serial: String) -> Result<(), String> {
    let app_data_dir = crate::commands::window::get_app_data_dir();
    let cert_path = app_data_dir.join("ca").join("network-spy.crt");

    if !cert_path.exists() {
        return Err("Certificate not found. Install CA certificate on desktop first.".to_string());
    }

    let cert_str = cert_path.to_string_lossy().to_string();
    run_adb(&serial, &["push", &cert_str, "/sdcard/Download/network-spy.crt"])?;

    notify_device(&serial, "NetworkSpy", "CA certificate pushed to device. Open Downloads to install.");

    Ok(())
}

#[tauri::command]
pub fn adb_check_cert(serial: String) -> bool {
    let adb = find_adb();
    let output = std::process::Command::new(adb)
        .args(["-s", &serial, "shell", "ls", "/sdcard/Download/network-spy.crt"])
        .output();
    match output {
        Ok(out) => {
            let exists = out.status.success();
            println!("[adb] cert check for {serial}: {}", if exists { "found" } else { "not found" });
            exists
        }
        Err(e) => {
            eprintln!("[adb] cert check failed for {serial}: {e}");
            false
        }
    }
}

fn am_start(serial: &str, intent: &str) -> bool {
    let adb = find_adb();
    let output = std::process::Command::new(adb)
        .args(["-s", serial, "shell", "am", "start", intent])
        .output();
    match output {
        Ok(out) => {
            let s = format!("{}{}",
                String::from_utf8_lossy(&out.stdout),
                String::from_utf8_lossy(&out.stderr),
            );
            let ok = out.status.success() && !s.contains("Error");
            if !ok {
                eprintln!("[adb] am start failed for {serial} with intent '{intent}': {s}");
            }
            ok
        }
        Err(e) => {
            eprintln!("[adb] am start failed for {serial}: {e}");
            false
        }
    }
}

#[tauri::command]
pub fn adb_open_cert_install(serial: String) -> Result<(), String> {
    let intents = [
        "-a android.security.action.INSTALL_CERTIFICATE",
        "-a android.settings.SECURITY_SETTINGS",
        "-n com.android.certinstaller/.CertInstallerMain",
    ];

    for intent in &intents {
        if am_start(&serial, intent) {
            return Ok(());
        }
    }

    Err("Could not open certificate installer. Please navigate to Settings → Security → Install certificate manually.".to_string())
}

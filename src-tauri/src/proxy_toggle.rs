use std::sync::atomic::{AtomicBool, Ordering};
use std::process::Command;
#[cfg(target_os = "macos")]
use std::io::Write;
#[cfg(target_os = "macos")]
use std::time::Duration;

#[derive(Debug)]
pub struct ProxyToggle {
    is_active: AtomicBool,
}

impl ProxyToggle {
    pub fn new() -> Self {
        Self {
            is_active: AtomicBool::new(false),
        }
    }

    pub fn is_on(&self) -> bool {
        self.is_active.load(Ordering::Relaxed)
    }

    pub fn turn_on(&self, port: u64) {
        self.is_active.store(true, Ordering::Relaxed);
        #[cfg(target_os = "macos")]
        self.turn_on_macos(port);

        #[cfg(target_os = "linux")]
        self.turn_on_linux(port);

        #[cfg(target_os = "windows")]
        self.turn_on_windows(port);
    }

    pub fn turn_off(&self) {
        self.is_active.store(false, Ordering::Relaxed);
        #[cfg(target_os = "macos")]
        self.turn_off_macos();

        #[cfg(target_os = "linux")]
        self.turn_off_linux();

        #[cfg(target_os = "windows")]
        self.turn_off_windows();
    }

    #[cfg(target_os = "macos")]
    fn turn_on_macos(&self, port: u64) {
        let services = self.get_macos_services();
        let port_s = port.to_string();
        for service in &services {
            self.shell("/usr/sbin/networksetup", &["-setwebproxy", service, "127.0.0.1", &port_s]);
            self.shell("/usr/sbin/networksetup", &["-setsecurewebproxy", service, "127.0.0.1", &port_s]);
            self.shell("/usr/sbin/networksetup", &["-setwebproxystate", service, "on"]);
            self.shell("/usr/sbin/networksetup", &["-setsecurewebproxystate", service, "on"]);
        }
        notify_network_change_macos();
    }

    #[cfg(target_os = "macos")]
    fn turn_off_macos(&self) {
        let services = self.get_macos_services();
        for service in services {
            self.shell("/usr/sbin/networksetup", &["-setwebproxystate", &service, "off"]);
            self.shell("/usr/sbin/networksetup", &["-setsecurewebproxystate", &service, "off"]);
        }
        notify_network_change_macos();
    }

    #[cfg(target_os = "macos")]
    fn get_macos_services(&self) -> Vec<String> {
        let output = Command::new("/usr/sbin/networksetup")
            .arg("-listallnetworkservices")
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                stdout.lines()
                    .filter(|line| {
                        let l = line.trim();
                        !l.is_empty() && 
                        !l.contains("denotes") && 
                        !l.starts_with('*')
                    })
                    .map(|l| l.trim().to_string())
                    .collect()
            },
            Err(_) => vec!["Wi-Fi".to_string(), "Ethernet".to_string(), "Thunderbolt Bridge".to_string()]
        }
    }

    #[cfg(target_os = "linux")]
    fn turn_on_linux(&self, port: u64) {
        let port_s = port.to_string();
        // GNOME
        self.shell("gsettings", &["set", "org.gnome.system.proxy", "mode", "manual"]);
        self.shell("gsettings", &["set", "org.gnome.system.proxy.http", "host", "127.0.0.1"]);
        self.shell("gsettings", &["set", "org.gnome.system.proxy.http", "port", &port_s]);
        self.shell("gsettings", &["set", "org.gnome.system.proxy.https", "host", "127.0.0.1"]);
        self.shell("gsettings", &["set", "org.gnome.system.proxy.https", "port", &port_s]);
        
        // KDE (Kioslaverc)
        self.shell("kwriteconfig5", &["--file", "kioslaverc", "--group", "Proxy Settings", "--key", "ProxyType", "1"]);
        self.shell("kwriteconfig5", &["--file", "kioslaverc", "--group", "Proxy Settings", "--key", "httpProxy", &format!("http://127.0.0.1:{}", port_s)]);
        self.shell("kwriteconfig5", &["--file", "kioslaverc", "--group", "Proxy Settings", "--key", "httpsProxy", &format!("http://127.0.0.1:{}", port_s)]);
    }

    #[cfg(target_os = "linux")]
    fn turn_off_linux(&self) {
        // GNOME
        self.shell("gsettings", &["set", "org.gnome.system.proxy", "mode", "none"]);
        
        // KDE
        self.shell("kwriteconfig5", &["--file", "kioslaverc", "--group", "Proxy Settings", "--key", "ProxyType", "0"]);
    }

    #[cfg(target_os = "windows")]
    fn turn_on_windows(&self, port: u64) {
        let proxy = format!("127.0.0.1:{}", port);
        self.shell("reg", &["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings", "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "1", "/f"]);
        self.shell("reg", &["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings", "/v", "ProxyServer", "/t", "REG_SZ", "/d", &proxy, "/f"]);
        refresh_proxy();
    }

    #[cfg(target_os = "windows")]
    fn turn_off_windows(&self) {
        self.shell("reg", &["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings", "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "0", "/f"]);
        // It's cleaner to also clear the server string
        self.shell("reg", &["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings", "/v", "ProxyServer", "/t", "REG_SZ", "/d", "", "/f"]);
        refresh_proxy();
    }

    fn shell(&self, launch_path: &str, args: &[&str]) -> bool {
        let mut cmd = Command::new(launch_path);
        cmd.args(args);

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        match cmd.status() {
            Ok(status) => status.success(),
            Err(e) => {
                eprintln!("Failed to execute {}: {}", launch_path, e);
                false
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn refresh_proxy() {
    use windows::Win32::Networking::WinInet::{InternetSetOptionW, INTERNET_OPTION_SETTINGS_CHANGED, INTERNET_OPTION_REFRESH};
    unsafe {
        InternetSetOptionW(None, INTERNET_OPTION_SETTINGS_CHANGED, None, 0);
        InternetSetOptionW(None, INTERNET_OPTION_REFRESH, None, 0);
    }
}

#[cfg(target_os = "macos")]
fn bounce_network_service_macos(services: &[String], wait: Duration) {
    // Design: briefly disable then re-enable all network services to force the OS network
    // stack to reset. The idea was that Chrome would drop existing TCP connections and
    // re-create its NetworkContext, which re-reads system proxy settings at construction
    // time — picking up the newly-set proxy without needing a browser restart.
    //
    // Not used: Chrome's ProxyResolutionService caches proxy config at NetworkContext
    // creation and ignores subsequent SCDynamicStore/network-change notifications.
    // Bouncing the service drops connections but Chrome re-establishes them using the
    // cached "no proxy" resolution — the outcome is identical to what notifications alone
    // achieve. Kept for reference in case a future Chrome version re-enables dynamic
    // proxy re-read or if another app benefits from this approach.
    // Disable all detected network services briefly
    for service in services {
        let _ = Command::new("/usr/sbin/networksetup")
            .args(["-setnetworkserviceenabled", service, "off"])
            .status();
    }

    // Wait for connections to be disrupted and Chrome to react
    std::thread::sleep(wait);

    // Re-enable all detected network services
    for service in services {
        let _ = Command::new("/usr/sbin/networksetup")
            .args(["-setnetworkserviceenabled", service, "on"])
            .status();
    }
}

#[cfg(target_os = "macos")]
fn notify_network_change_macos() {
    // 1. Use scutil to list and notify each proxy key in SCDynamicStore directly.
    //    This calls SCDynamicStoreNotifyValue() — the same mechanism Chrome monitors.
    let list_output = Command::new("/usr/sbin/scutil")
        .args(["list", "State:/Network/Service/"])
        .output();

    let proxy_keys: Vec<String> = if let Ok(out) = list_output {
        String::from_utf8_lossy(&out.stdout)
            .lines()
            .filter(|line| line.contains("/Proxies"))
            .map(|line| line.trim().to_string())
            .collect()
    } else {
        Vec::new()
    };

    if !proxy_keys.is_empty() {
        if let Ok(mut child) = Command::new("/usr/sbin/scutil")
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
        {
            if let Some(ref mut stdin) = child.stdin {
                let _ = stdin.write_all(b"open\n");
                for key in &proxy_keys {
                    let _ = writeln!(stdin, "notify {}", key);
                }
                let _ = stdin.write_all(b"close\n");
            }
            let _ = child.wait();
        }
    }

    // 2. Also post Darwin notify as a fallback
    extern "C" {
        fn notify_post(name: *const std::ffi::c_char) -> u32;
    }
    let notifications = [
        "com.apple.system.config.network_change\0".as_ptr(),
        "com.apple.system.config.proxy_change\0".as_ptr(),
    ];
    for &name in &notifications {
        unsafe { notify_post(name as *const std::ffi::c_char); }
    }

    // 3. Flush DNS cache to trigger additional network state change
    let _ = Command::new("/usr/bin/dscacheutil").args(["-flushcache"]).status();
}
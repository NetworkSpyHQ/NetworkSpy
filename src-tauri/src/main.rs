// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod ca_manager;
pub mod proxy_handlers_functions;
mod certificate_installer;
pub mod eval;
pub mod proxy_toggle;
pub mod commands;
pub mod proxy_handler;
pub mod breakpoints;
pub mod scripting;
pub mod settings;
// pub mod submenu;
pub mod traffic;
pub mod mcp;
pub mod license;
pub mod handler;
pub mod map_local;
pub mod map_remote;
pub mod mac_window;
pub mod config;
mod workspace;
use crate::map_local::MapLocalManager;
use crate::map_remote::MapRemoteManager;

pub use breakpoints::*;
pub use scripting::*;
pub use settings::*;


use bytes::Bytes;
use certificate_installer::CertificateInstaller;
use hyper::{Request, Response, Version};
use network_spy_proxy::{proxy::Proxy, traffic::TrafficListener};
use tauri::menu::{Menu, MenuItem};
use async_trait::async_trait;
use once_cell::sync::OnceCell;
use proxy_toggle::ProxyToggle;
use std::collections::HashMap;
use std::fs;
use std::sync::{Arc, Mutex};
use proxy_handler::MyTrafficListener;
use std::env;
use tauri::{AppHandle, Manager, Emitter};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tokio::sync::RwLock;
use traffic::db::{TrafficDb, TrafficEvent};
use traffic::tags::TagManager;
use traffic::sessions::SessionManager;
use traffic::viewers::ViewerManager;
use traffic::bottom_pane::BottomPaneManager;
use std::sync::atomic::Ordering;
use tokio::sync::mpsc;

pub mod utils;
pub use utils::*;
pub mod menu;
pub use menu::*;
use crate::traffic::db::{is_text_content_type, body_to_string};



use commands::*;
#[cfg(target_os = "macos")]
use objc::msg_send;
#[cfg(target_os = "macos")]
use objc::sel;
#[cfg(target_os = "macos")]
use objc::sel_impl;



#[allow(unexpected_cfgs)]
fn main() {

    // Use compile-time environment variables (baked into the binary via build.rs)
    // This ensures no .env file is needed at runtime.
    #[allow(unused_variables)]
    let app_name = env!("APP_NAME");

    let _guard = if let Some(dsn) = option_env!("SENTRY_DSN") {
        if !dsn.is_empty() {
            Some(sentry::init((dsn, sentry::ClientOptions {
                release: sentry::release_name!(),
                ..Default::default()
            })))
        } else {
            None
        }
    } else {
        None
    };

    let args: Vec<String> = std::env::args().collect();
    let app_data_dir = get_app_data_dir();
    
    if args.iter().any(|arg| arg == "--install-cert") {
        let ca_keys = ca_manager::load_or_generate_ca(app_data_dir.clone())
            .expect("Failed to load or generate CA");
        let installer = CertificateInstaller {};
        match installer.install_from_content(None, false, &ca_keys.cert) {
            Ok(output) => {
                println!("Certificate installation successful:\n{}", output);
                std::process::exit(0);
            }
            Err(err) => {
                eprintln!("Certificate installation failed:\n{}", err);
                std::process::exit(1);
            }
        }
    }

    // Load CA cert for normal run
    let ca_keys = ca_manager::load_or_generate_ca(app_data_dir.clone())
        .expect("Failed to load or generate CA");

    // Leak the strings to satisfy the &'static str requirement of the proxy crate
    let key_pair: &'static str = Box::leak(ca_keys.key.into_boxed_str());
    let ca_cert: &'static str = Box::leak(ca_keys.cert.into_boxed_str());

    let proxy_toggle = ProxyToggle::new();
    PROXY_TOGGLE
        .set(proxy_toggle)
        .expect("Failed to set proxy_toggle instance");
    CERTIFICATE_INSTALLER
        .set(CertificateInstaller {})
        .expect("Failed to set certificate_installer instance");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app| {
            

            // 0. Native Window Customization
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    // Setup the native title bar positioning and styling (Yaak-style)
                    mac_window::setup_mac_window(&window);
                }

                #[cfg(not(target_os = "macos"))]
                {
                    // Hide native title bar on Windows/Linux to use custom one
                    let _ = window.set_decorations(false);
                }
            }


            // 1. Global Application Menu Setup (macOS only — Windows/Linux use per-window menus)
            #[cfg(target_os = "macos")]
            {
                let file_submenu = create_file_submenu(app, app_name)?;
                let edit_submenu = create_edit_submenu(app)?;
                let view_submenu = create_view_submenu(app)?;
                let traffic_submenu = create_traffic_submenu(app)?;
                let global_tools_submenu = create_tools_submenu(app)?;
                let help_submenu = create_help_submenu(app)?;

                let global_mac_menu = tauri::menu::MenuBuilder::new(app)
                    .item(&file_submenu)
                    .item(&edit_submenu)
                    .item(&view_submenu)
                    .item(&traffic_submenu)
                    .item(&global_tools_submenu)
                    .item(&help_submenu)
                    .build()?;

                app.set_menu(global_mac_menu)?;
            }

            // Event handling is unified below in the global handler

            let app_handle = app.app_handle();
            let app_data_dir = workspace::get_active_config_dir();
            
            #[cfg(debug_assertions)]
            println!("Active Config Dir: {}", app_data_dir.display());

            if !app_data_dir.exists() {
                fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
            }

            let db_path = app_data_dir.join("traffic.db");
            
            #[cfg(debug_assertions)]
            println!("DB Path: {}", db_path.display());
            
            let traffic_db = Arc::new(TrafficDb::new(db_path).expect("Failed to initialize database"));
            app_handle.manage(Arc::clone(&traffic_db));

            let config_manager = Arc::new(crate::config::ConfigManager::new(app_data_dir.clone()));
            app_handle.manage(Arc::clone(&config_manager));

            let tag_manager = Arc::new(TagManager::new(Arc::clone(&traffic_db)));
            app_handle.manage(Arc::clone(&tag_manager));

            let session_manager = Arc::new(SessionManager::new(app_data_dir.clone(), Arc::clone(&config_manager)));
            app_handle.manage(Arc::clone(&session_manager));

            let viewer_manager = Arc::new(ViewerManager::new(Arc::clone(&config_manager)));
            app_handle.manage(Arc::clone(&viewer_manager));

            let bottom_pane_manager = Arc::new(BottomPaneManager::new(Arc::clone(&config_manager)));
            app_handle.manage(Arc::clone(&bottom_pane_manager));

            let breakpoint_manager = Arc::new(BreakpointManager::new());
            app_handle.manage(Arc::clone(&breakpoint_manager));

            let script_manager = Arc::new(ScriptManager::new());
            app_handle.manage(Arc::clone(&script_manager));

            let map_local_manager = Arc::new(MapLocalManager::new());
            app_handle.manage(Arc::clone(&map_local_manager));

            let map_remote_manager = Arc::new(MapRemoteManager::new());
            app_handle.manage(Arc::clone(&map_remote_manager));

            // Load settings from ConfigManager
            let proxy_settings_data = config_manager.get_proxy_settings();
            let proxy_settings = Arc::new(std::sync::RwLock::new(proxy_settings_data));
            app_handle.manage(ManagedProxySettings(Arc::clone(&proxy_settings)));

            // Start MCP Server for LLM/Claude Code integration
            mcp::spawn_mcp_server(app_handle.clone());

            let rules = config_manager.get_proxy_rules();
            let list: Vec<network_spy_proxy::ProxyRule> = rules.into_iter()
                .filter(|rule| rule.enabled)
                .map(|rule| network_spy_proxy::ProxyRule {
                    pattern: rule.pattern,
                    client: rule.client,
                    action: rule.action,
                })
                .collect();
            let proxy_intercept_list = Arc::new(RwLock::new(list));
            app_handle.manage(InterceptAllowList(Arc::clone(&proxy_intercept_list)));

            let actual_port = (9090..65535)
                .find(|port| std::net::TcpListener::bind(("127.0.0.1", *port)).is_ok())
                .unwrap_or(9090);
            
            ACTUAL_PORT.store(actual_port, Ordering::SeqCst);
            println!("Proxy starting on port: {}", actual_port);

            let (tx, mut rx) = mpsc::unbounded_channel::<u16>();
            RESTART_TX.set(tx).expect("Failed to set RESTART_TX");

            let tray_stats = Arc::new(TrayStats::new());
            let _ = TRAY_STATS.set(tray_stats.clone());
            let tray_stats_for_task = tray_stats.clone();

            let app_handle_outer_task = app_handle.clone();
            let traffic_db_outer = Arc::clone(&traffic_db);
            let proxy_intercept_list_outer = Arc::clone(&proxy_intercept_list);
            let proxy_settings_outer = Arc::clone(&proxy_settings);
            let tag_manager_outer = Arc::clone(&tag_manager);
            let tray_stats_for_proxy = tray_stats.clone();
            let breakpoint_manager_outer = Arc::clone(&breakpoint_manager);
            let script_manager_outer = Arc::clone(&script_manager);
            let map_local_manager_outer = Arc::clone(&map_local_manager);
            let map_remote_manager_outer = Arc::clone(&map_remote_manager);
            let config_manager_outer = Arc::clone(&config_manager);

            // Create tunnel close map and manage it so commands can close tunnels
            let tunnel_close_map: ManagedTunnelCloseMap = Arc::new(tokio::sync::Mutex::new(HashMap::new()));
            app_handle.manage(tunnel_close_map.clone());
            let tunnel_close_map_outer = tunnel_close_map.clone();

            tauri::async_runtime::spawn(async move {
                let mut current_port = actual_port;
                loop {
                    let app_handle_inner = app_handle_outer_task.clone();
                    let traffic_db_inner = Arc::clone(&traffic_db_outer);
                    let proxy_intercept_list_inner = Arc::clone(&proxy_intercept_list_outer);
                    let proxy_settings_inner = Arc::clone(&proxy_settings_outer);
                    let tag_manager_inner = Arc::clone(&tag_manager_outer);
                    let config_manager_inner = Arc::clone(&config_manager_outer);
                    let tray_stats_deep = tray_stats_for_proxy.clone();

                    let mut proxy = Proxy::new(key_pair, ca_cert, current_port.into());
                    proxy.set_tunnel_shutdown_map(tunnel_close_map_outer.clone());
                        let listener = Arc::new(MyTrafficListener {
                            app_handle: app_handle_inner,
                            traffic_db: traffic_db_inner,
                            tag_manager: tag_manager_inner,
                            proxy_settings: proxy_settings_inner,
                            request_times: Mutex::new(HashMap::new()),
                            tray_stats: tray_stats_deep,
                            session_id: format!("SESS_{}", chrono::Local::now().format("%Y%m%d_%H%M%S")),
                            breakpoint_manager: Arc::clone(&breakpoint_manager_outer),
                            script_manager: Arc::clone(&script_manager_outer),
                            map_local_manager: Arc::clone(&map_local_manager_outer),
                            map_remote_manager: Arc::clone(&map_remote_manager_outer),
                            config_manager: Arc::clone(&config_manager_inner),
                        });

                    println!("Proxy server listening on port: {}", current_port);
                    
                    let listener_task = tauri::async_runtime::spawn(async move {
                        proxy.run_proxy(listener, proxy_intercept_list_inner).await;
                    });

                    // Wait for a restart signal
                    if let Some(new_port) = rx.recv().await {
                        println!("Restarting proxy on new port: {}", new_port);
                        listener_task.abort(); // Kill old listener
                        current_port = new_port;
                    } else {
                        break;
                    }
                }
            });

            // Tray Menu Setup
            let reqs_item = MenuItem::with_id(app_handle, "tray_reqs", "Requests: 0", false, None::<&str>)?;
            let data_item = MenuItem::with_id(app_handle, "tray_data", "Total: 0 B", false, None::<&str>)?;
            let split_item = MenuItem::with_id(app_handle, "tray_split", "0 B ↑ | 0 B ↓", false, None::<&str>)?;
            let status_capture_item = MenuItem::with_id(app_handle, "tray_status_capture", "Capture: Active", false, None::<&str>)?;

            let port_info = format!("Proxy Port: {}", actual_port);
            let status_item = MenuItem::with_id(app_handle, "status", &port_info, false, None::<&str>)?;
            let show_item = MenuItem::with_id(app_handle, "show", "Show Network Spy", true, None::<&str>)?;
            let reset_item = MenuItem::with_id(app_handle, "reset_proxy", "⚠️ Emergency Proxy Reset", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app_handle, "quit", "Quit", true, None::<&str>)?;
            
            // Background task to update tray labels
            let reqs_item_c = reqs_item.clone();
            let data_item_c = data_item.clone();
            let split_item_c = split_item.clone();
            let status_capture_item_c = status_capture_item.clone();
            let stats_updater = tray_stats_for_task.clone();

            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_millis(800)).await;
                    
                    let reqs = stats_updater.total_requests.load(Ordering::Relaxed);
                    let tx = stats_updater.tx_bytes.load(Ordering::Relaxed);
                    let rx = stats_updater.rx_bytes.load(Ordering::Relaxed);
                    
                    let is_active = if let Some(toggle) = PROXY_TOGGLE.get() {
                        toggle.is_on()
                    } else {
                        false
                    };

                    let _ = reqs_item_c.set_text(format!("Requests: {}", reqs));
                    let _ = data_item_c.set_text(format!("Total Data: {}", format_bytes(tx + rx)));
                    let _ = split_item_c.set_text(format!("{} ↑ | {} ↓", format_bytes(tx), format_bytes(rx)));
                    let _ = status_capture_item_c.set_text(if is_active { "Capture: ⚡ Active" } else { "Capture: ⏸ Paused" });
                }
            });

            let tray_menu = Menu::with_items(app_handle, &[
                &status_item, 
                &status_capture_item,
                &tauri::menu::PredefinedMenuItem::separator(app_handle)?,
                &reqs_item,
                &data_item,
                &split_item,
                &tauri::menu::PredefinedMenuItem::separator(app_handle)?,
                &show_item, 
                &reset_item, 
                &quit_item
            ])?;

            let app_handle_tray = app_handle.clone();
            let _tray = TrayIconBuilder::with_id("main_tray")
                .menu(&tray_menu)
                .icon(app_handle.default_window_icon().unwrap().clone())
                .on_menu_event(handle_tray_menu_event)
                .on_tray_icon_event(move |_tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = app_handle_tray.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app_handle)?;

            // Global Menu Event Handler for both Tray and macOS Window Menu
            let app_handle_menu = app_handle.clone();
            app_handle.on_menu_event(move |_app, event| {
                match event.id.as_ref() {
                    "install_cert" | "cert-installer" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "certificate-installer".to_string(), "Certificate Installer".to_string());
                        });
                    }
                    "saved-sessions" | "saved_sessions" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "sessions".to_string(), "Saved Sessions".to_string());
                        });
                    }
                    "traffic-filters" | "traffic_filters" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "filters".to_string(), "Traffic Filters".to_string());
                        });
                    }
                    "tools-tag" | "tools_tag" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "tag".to_string(), "Tag Tools".to_string());
                        });
                    }
                    "proxylist" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "proxylist".to_string(), "Proxy Intercept Rules".to_string());
                        });
                    }
                    "breakpoints" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "breakpoint".to_string(), "Traffic Breakpoints".to_string());
                        });
                    }
                    "map_local" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "map-local".to_string(), "Map Local Rules".to_string());
                        });
                    }
                    "map_remote" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "map-remote".to_string(), "Map Remote Rules".to_string());
                        });
                    }
                    "scripting" => {
                        let h = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            open_new_window_internal(&h, "scripting".to_string(), "Custom Scripting".to_string());
                        });
                    }
                    "check_updates" => {
                        let handle = app_handle_menu.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = handle.emit("check-for-updates", ());
                        });
                    }
                    "toggle_capture" => {
                        if let Some(toggle) = PROXY_TOGGLE.get() {
                            if toggle.is_on() {
                                toggle.turn_off();
                                let _ = _app.emit("proxy-status", false);
                            } else {
                                let port = ACTUAL_PORT.load(Ordering::SeqCst) as u64;
                                toggle.turn_on(port);
                                let _ = _app.emit("proxy-status", true);
                            }
                        }
                    }
                    "clear_traffic" => {
                        let _ = _app.emit("menu-clear-traffic", ());
                    }
                    "save_capture" => {
                        let _ = _app.emit("menu-save-capture", ());
                    }
                    "quit" | "quit-app" => {
                        if let Some(toggle) = PROXY_TOGGLE.get() {
                            toggle.turn_off();
                        }
                        _app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = _app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "reset_proxy" => {
                        if let Some(toggle) = PROXY_TOGGLE.get() {
                            toggle.turn_off();
                        }
                    }
                    "reload" => {
                        if let Some(window) = _app.get_webview_window("main") {
                            let _ = window.eval("window.location.reload()");
                        }
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(generate_handler!())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                if let Some(db) = _app_handle.try_state::<Arc<TrafficDb>>() {
                    let _ = db.clear_all();
                    println!("Traffic DB cleared (Application Exit)");
                }
                if let Some(toggle) = PROXY_TOGGLE.get() {
                    toggle.turn_off();
                    println!("Proxy turned off (Application Exit)");
                }
            }
            _ => {}
        });
}


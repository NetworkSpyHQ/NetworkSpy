use tauri::menu::{MenuItemBuilder, Submenu, SubmenuBuilder, PredefinedMenuItem};
use tauri::Manager;

pub fn create_file_submenu<R: tauri::Runtime>(manager: &impl Manager<R>, app_name: &str) -> tauri::Result<Submenu<R>> {
    SubmenuBuilder::new(manager, "File")
        .item(&MenuItemBuilder::with_id("show", "New Window").accelerator("CmdOrCtrl+N").build(manager)?)
        .separator()
        .item(&MenuItemBuilder::with_id("saved_sessions", "View Saved Sessions...").accelerator("CmdOrCtrl+O").build(manager)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(manager, None)?)
        .item(&MenuItemBuilder::with_id("quit", format!("Quit {}", app_name)).accelerator("CmdOrCtrl+Q").build(manager)?)
        .build()
}

pub fn create_edit_submenu<R: tauri::Runtime>(manager: &impl Manager<R>) -> tauri::Result<Submenu<R>> {
    SubmenuBuilder::new(manager, "Edit")
        .item(&PredefinedMenuItem::undo(manager, None)?)
        .item(&PredefinedMenuItem::redo(manager, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(manager, None)?)
        .item(&PredefinedMenuItem::copy(manager, None)?)
        .item(&PredefinedMenuItem::paste(manager, None)?)
        .item(&PredefinedMenuItem::select_all(manager, None)?)
        .build()
}

pub fn create_view_submenu<R: tauri::Runtime>(manager: &impl Manager<R>) -> tauri::Result<Submenu<R>> {
    SubmenuBuilder::new(manager, "View")
        .item(&MenuItemBuilder::with_id("reload", "Reload").accelerator("CmdOrCtrl+R").build(manager)?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(manager, None)?)
        .item(&PredefinedMenuItem::maximize(manager, None)?)
        .item(&PredefinedMenuItem::minimize(manager, None)?)
        .build()
}

pub fn create_help_submenu<R: tauri::Runtime>(manager: &impl Manager<R>) -> tauri::Result<Submenu<R>> {
    SubmenuBuilder::new(manager, "Help")
        .item(&MenuItemBuilder::with_id("check_updates", "Check for Updates...").build(manager)?)
        .separator()
        .item(&PredefinedMenuItem::about(manager, None, None)?)
        .build()
}

pub fn create_traffic_submenu<R: tauri::Runtime>(manager: &impl Manager<R>) -> tauri::Result<Submenu<R>> {
    SubmenuBuilder::new(manager, "Traffic")
        .item(&MenuItemBuilder::with_id("toggle_capture", "Pause Capture").accelerator("CmdOrCtrl+E").build(manager)?)
        .separator()
        .item(&MenuItemBuilder::with_id("clear_traffic", "Clear All Traffic").accelerator("CmdOrCtrl+K").build(manager)?)
        .separator()
        .item(&MenuItemBuilder::with_id("save_capture", "Save Capture...").accelerator("CmdOrCtrl+S").build(manager)?)
        .build()
}

pub fn create_tools_submenu<R: tauri::Runtime>(manager: &impl Manager<R>) -> tauri::Result<Submenu<R>> {
    SubmenuBuilder::new(manager, "Tools")
        .item(&MenuItemBuilder::with_id("install_cert", "Install Root Certificate").build(manager)?)
        .separator()
        .item(&MenuItemBuilder::with_id("tools_tag", "Tagging Rules").build(manager)?)
        .separator()
        .item(&MenuItemBuilder::with_id("saved_sessions", "Saved Sessions").build(manager)?)
        .item(&MenuItemBuilder::with_id("traffic_filters", "Traffic Filters").build(manager)?)
        .separator()
        .item(&MenuItemBuilder::with_id("breakpoints", "Traffic Breakpoints").build(manager)?)
        .item(&MenuItemBuilder::with_id("map_local", "Map Local Rules").build(manager)?)
        .item(&MenuItemBuilder::with_id("map_remote", "Map Remote Rules").build(manager)?)
        .item(&MenuItemBuilder::with_id("proxylist", "Proxy Intercept Rules").build(manager)?)
        .item(&MenuItemBuilder::with_id("scripting", "Custom Scripting").build(manager)?)
        .separator()
        .item(&MenuItemBuilder::with_id("composer", "Composer").accelerator("CmdOrCtrl+Shift+C").build(manager)?)
        .build()
}

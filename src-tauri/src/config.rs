use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use crate::traffic::db::{BreakpointRule, ProxyRule, MapLocalRule, FilterPreset, ScriptRule};
use crate::traffic::schema::map_remote::MapRemoteRule;
use crate::settings::ProxySettings;
use std::collections::HashMap;

use crate::traffic::viewers::{Viewer, ViewerFolder};
use crate::traffic::bottom_pane::CustomChecker;
use crate::traffic::sessions::{Session, SessionFolder};
use crate::commands::composer::ComposerSavedRequest;

const LEGACY_FILE: &str = "file.networkspy";
const SETTINGS_FILE: &str = "settings.yml";
const EXTRA_FILE: &str = "extra.yml";

const DIR_PROXY_RULES: &str = "proxy_rules";
const DIR_MAP_LOCAL: &str = "map_local";
const DIR_MAP_REMOTE: &str = "map_remote";
const DIR_BREAKPOINTS: &str = "breakpoints";
const DIR_FILTERS: &str = "filters";
const DIR_SCRIPTS: &str = "scripts";
const DIR_VIEWERS: &str = "viewers";
const DIR_VIEWER_FOLDERS: &str = "viewer_folders";
const DIR_CHECKERS: &str = "checkers";
const DIR_SESSIONS: &str = "sessions_meta";
const DIR_SESSION_FOLDERS: &str = "session_folders";
const DIR_COMPOSER: &str = "composer";

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct AppConfig {
    #[serde(default)]
    pub proxy_settings: ProxySettings,
    #[serde(default)]
    pub proxy_rules: Vec<ProxyRule>,
    #[serde(default)]
    pub map_local_rules: Vec<MapLocalRule>,
    #[serde(default)]
    pub map_remote_rules: Vec<MapRemoteRule>,
    #[serde(default)]
    pub breakpoints: Vec<BreakpointRule>,
    #[serde(default)]
    pub filter_presets: Vec<FilterPreset>,
    #[serde(default)]
    pub scripts: Vec<ScriptRule>,
    #[serde(default)]
    pub viewers: Vec<Viewer>,
    #[serde(default)]
    pub viewer_folders: Vec<ViewerFolder>,
    #[serde(default)]
    pub custom_checkers: Vec<CustomChecker>,
    #[serde(default)]
    pub sessions: Vec<Session>,
    #[serde(default)]
    pub session_folders: Vec<SessionFolder>,
    #[serde(default)]
    pub extra_settings: HashMap<String, String>,
    #[serde(default)]
    pub composer_requests: Vec<ComposerSavedRequest>,
}

pub struct ConfigManager {
    base_dir: Arc<RwLock<PathBuf>>,
}

fn read_yaml<T: DeserializeOwned>(path: &std::path::Path) -> Option<T> {
    let content = fs::read_to_string(path).ok()?;
    serde_yaml::from_str(&content).ok()
}

fn write_yaml<T: Serialize>(path: &std::path::Path, data: &T) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_yaml::to_string(data)?;
    fs::write(path, content)?;
    Ok(())
}

fn read_all_in_dir<T: DeserializeOwned>(dir: &std::path::Path) -> Vec<T> {
    let mut items = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "yml") {
                if let Some(item) = read_yaml::<T>(&path) {
                    items.push(item);
                }
            }
        }
    }
    items
}

fn write_all_to_dir<T: Serialize>(dir: &std::path::Path, items: &[T]) -> Result<(), Box<dyn std::error::Error>> {
    if dir.exists() {
        fs::remove_dir_all(dir)?;
    }
    fs::create_dir_all(dir)?;
    for item in items {
        let content = serde_yaml::to_string(item)?;
        let path = dir.join(format!("{}.yml", uuid::Uuid::new_v4()));
        fs::write(path, content)?;
    }
    Ok(())
}

fn write_item_by_id<T: Serialize>(dir: &std::path::Path, id: &str, item: &T) -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all(dir)?;
    let path = dir.join(format!("{}.yml", id));
    let content = serde_yaml::to_string(item)?;
    fs::write(path, content)?;
    Ok(())
}

fn delete_item_by_id(dir: &std::path::Path, id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = dir.join(format!("{}.yml", id));
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn write_item_by_i64_id<T: Serialize>(dir: &std::path::Path, id: i64, item: &T) -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all(dir)?;
    let path = dir.join(format!("{}.yml", id));
    let content = serde_yaml::to_string(item)?;
    fs::write(path, content)?;
    Ok(())
}

fn delete_item_by_i64_id(dir: &std::path::Path, id: i64) -> Result<(), Box<dyn std::error::Error>> {
    let path = dir.join(format!("{}.yml", id));
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

impl ConfigManager {
    pub fn new(base_dir: PathBuf) -> Self {
        let legacy_path = base_dir.join(LEGACY_FILE);
        if legacy_path.exists() {
            if let Ok(content) = fs::read_to_string(&legacy_path) {
                if let Ok(config) = serde_yaml::from_str::<AppConfig>(&content) {
                    let _ = Self::migrate_to_v2(&base_dir, &config);
                    let _ = fs::rename(&legacy_path, base_dir.join("file.networkspy.bak"));
                }
            }
        }

        Self {
            base_dir: Arc::new(RwLock::new(base_dir)),
        }
    }

    fn migrate_to_v2(base_dir: &std::path::Path, config: &AppConfig) -> Result<(), Box<dyn std::error::Error>> {
        write_yaml(&base_dir.join(SETTINGS_FILE), &config.proxy_settings)?;
        write_yaml(&base_dir.join(EXTRA_FILE), &config.extra_settings)?;

        if !config.proxy_rules.is_empty() {
            for rule in &config.proxy_rules {
                let id = if rule.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { rule.id.clone() };
                write_item_by_id(&base_dir.join(DIR_PROXY_RULES), &id, rule)?;
            }
        }
        for rule in &config.map_local_rules {
            let id = if rule.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { rule.id.clone() };
            write_item_by_id(&base_dir.join(DIR_MAP_LOCAL), &id, rule)?;
        }
        for rule in &config.map_remote_rules {
            let id = rule.id.unwrap_or_else(|| chrono::Utc::now().timestamp_millis());
            write_item_by_i64_id(&base_dir.join(DIR_MAP_REMOTE), id, rule)?;
        }
        for rule in &config.breakpoints {
            let id = if rule.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { rule.id.clone() };
            write_item_by_id(&base_dir.join(DIR_BREAKPOINTS), &id, rule)?;
        }
        for preset in &config.filter_presets {
            write_item_by_id(&base_dir.join(DIR_FILTERS), &preset.id, preset)?;
        }
        for script in &config.scripts {
            write_item_by_id(&base_dir.join(DIR_SCRIPTS), &script.id, script)?;
        }
        for viewer in &config.viewers {
            write_item_by_id(&base_dir.join(DIR_VIEWERS), &viewer.id, viewer)?;
        }
        for folder in &config.viewer_folders {
            write_item_by_id(&base_dir.join(DIR_VIEWER_FOLDERS), &folder.id, folder)?;
        }
        for checker in &config.custom_checkers {
            write_item_by_id(&base_dir.join(DIR_CHECKERS), &checker.id, checker)?;
        }
        for session in &config.sessions {
            write_item_by_id(&base_dir.join(DIR_SESSIONS), &session.id, session)?;
        }
        for folder in &config.session_folders {
            write_item_by_id(&base_dir.join(DIR_SESSION_FOLDERS), &folder.id, folder)?;
        }
        for req in &config.composer_requests {
            write_item_by_id(&base_dir.join(DIR_COMPOSER), &req.id, req)?;
        }

        Ok(())
    }

    pub fn set_base_dir(&self, base_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let mut dir = self.base_dir.write().unwrap();
        *dir = base_dir;
        Ok(())
    }

    pub fn reload(&self) -> Result<(), Box<dyn std::error::Error>> {
        Ok(())
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        Ok(())
    }

    pub fn get_config(&self) -> AppConfig {
        let base = self.base_dir.read().unwrap().clone();

        let proxy_settings = read_yaml(&base.join(SETTINGS_FILE)).unwrap_or_default();
        let extra_settings = read_yaml(&base.join(EXTRA_FILE)).unwrap_or_default();

        let proxy_rules = read_all_in_dir(&base.join(DIR_PROXY_RULES));
        let map_local_rules = read_all_in_dir(&base.join(DIR_MAP_LOCAL));
        let map_remote_rules = read_all_in_dir(&base.join(DIR_MAP_REMOTE));
        let breakpoints = read_all_in_dir(&base.join(DIR_BREAKPOINTS));
        let filter_presets = read_all_in_dir(&base.join(DIR_FILTERS));
        let scripts = read_all_in_dir(&base.join(DIR_SCRIPTS));
        let viewers = read_all_in_dir(&base.join(DIR_VIEWERS));
        let viewer_folders = read_all_in_dir(&base.join(DIR_VIEWER_FOLDERS));
        let custom_checkers = read_all_in_dir(&base.join(DIR_CHECKERS));
        let sessions = read_all_in_dir(&base.join(DIR_SESSIONS));
        let session_folders = read_all_in_dir(&base.join(DIR_SESSION_FOLDERS));
        let composer_requests = read_all_in_dir(&base.join(DIR_COMPOSER));

        AppConfig {
            proxy_settings,
            proxy_rules,
            map_local_rules,
            map_remote_rules,
            breakpoints,
            filter_presets,
            scripts,
            viewers,
            viewer_folders,
            custom_checkers,
            sessions,
            session_folders,
            extra_settings,
            composer_requests,
        }
    }

    pub fn update<F, R>(&self, f: F) -> Result<R, Box<dyn std::error::Error>>
    where
        F: FnOnce(&mut AppConfig) -> R,
    {
        let mut config = self.get_config();
        let res = f(&mut config);

        let base = self.base_dir.read().unwrap().clone();

        write_yaml(&base.join(SETTINGS_FILE), &config.proxy_settings)?;
        write_yaml(&base.join(EXTRA_FILE), &config.extra_settings)?;
        write_all_to_dir(&base.join(DIR_PROXY_RULES), &config.proxy_rules)?;
        write_all_to_dir(&base.join(DIR_MAP_LOCAL), &config.map_local_rules)?;
        write_all_to_dir(&base.join(DIR_MAP_REMOTE), &config.map_remote_rules)?;
        write_all_to_dir(&base.join(DIR_BREAKPOINTS), &config.breakpoints)?;
        write_all_to_dir(&base.join(DIR_FILTERS), &config.filter_presets)?;
        write_all_to_dir(&base.join(DIR_SCRIPTS), &config.scripts)?;
        write_all_to_dir(&base.join(DIR_VIEWERS), &config.viewers)?;
        write_all_to_dir(&base.join(DIR_VIEWER_FOLDERS), &config.viewer_folders)?;
        write_all_to_dir(&base.join(DIR_CHECKERS), &config.custom_checkers)?;
        write_all_to_dir(&base.join(DIR_SESSIONS), &config.sessions)?;
        write_all_to_dir(&base.join(DIR_SESSION_FOLDERS), &config.session_folders)?;
        write_all_to_dir(&base.join(DIR_COMPOSER), &config.composer_requests)?;

        Ok(res)
    }

    pub fn get_proxy_settings(&self) -> ProxySettings {
        let base = self.base_dir.read().unwrap();
        read_yaml(&base.join(SETTINGS_FILE)).unwrap_or_default()
    }

    pub fn set_proxy_settings(&self, settings: ProxySettings) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        write_yaml(&base.join(SETTINGS_FILE), &settings)
    }

    pub fn get_proxy_rules(&self) -> Vec<ProxyRule> {
        let base = self.base_dir.read().unwrap();
        read_all_in_dir(&base.join(DIR_PROXY_RULES))
    }

    pub fn save_proxy_rule(&self, rule: ProxyRule) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let id = if rule.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { rule.id.clone() };
        write_item_by_id(&base.join(DIR_PROXY_RULES), &id, &rule)
    }

    pub fn delete_proxy_rule(&self, id: String) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        delete_item_by_id(&base.join(DIR_PROXY_RULES), &id)
    }

    pub fn get_map_local_rules(&self) -> Vec<MapLocalRule> {
        let base = self.base_dir.read().unwrap();
        read_all_in_dir(&base.join(DIR_MAP_LOCAL))
    }

    pub fn save_map_local_rule(&self, rule: MapLocalRule) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let id = if rule.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { rule.id.clone() };
        write_item_by_id(&base.join(DIR_MAP_LOCAL), &id, &rule)
    }

    pub fn delete_map_local_rule(&self, id: String) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        delete_item_by_id(&base.join(DIR_MAP_LOCAL), &id)
    }

    pub fn get_map_remote_rules(&self) -> Vec<MapRemoteRule> {
        let base = self.base_dir.read().unwrap();
        read_all_in_dir(&base.join(DIR_MAP_REMOTE))
    }

    pub fn save_map_remote_rule(&self, mut rule: MapRemoteRule) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let dir = base.join(DIR_MAP_REMOTE);
        if rule.id.is_none() {
            let existing: Vec<MapRemoteRule> = read_all_in_dir(&dir);
            let next_id = existing.iter().filter_map(|r| r.id).max().unwrap_or(0) + 1;
            rule.id = Some(next_id);
        }
        write_item_by_i64_id(&dir, rule.id.unwrap(), &rule)
    }

    pub fn delete_map_remote_rule(&self, id: i64) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        delete_item_by_i64_id(&base.join(DIR_MAP_REMOTE), id)
    }

    pub fn get_breakpoints(&self) -> Vec<BreakpointRule> {
        let base = self.base_dir.read().unwrap();
        read_all_in_dir(&base.join(DIR_BREAKPOINTS))
    }

    pub fn save_breakpoint(&self, rule: BreakpointRule) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let id = if rule.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { rule.id.clone() };
        write_item_by_id(&base.join(DIR_BREAKPOINTS), &id, &rule)
    }

    pub fn delete_breakpoint(&self, id: String) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        delete_item_by_id(&base.join(DIR_BREAKPOINTS), &id)
    }

    pub fn get_filter_presets(&self) -> Vec<FilterPreset> {
        let base = self.base_dir.read().unwrap();
        read_all_in_dir(&base.join(DIR_FILTERS))
    }

    pub fn add_filter_preset(&self, preset: FilterPreset) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        write_item_by_id(&base.join(DIR_FILTERS), &preset.id, &preset)
    }

    pub fn update_filter_preset(&self, id: String, name: Option<String>, description: Option<String>, filters: Option<String>) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let dir = base.join(DIR_FILTERS);
        let path = dir.join(format!("{}.yml", id));
        if let Some(mut preset) = read_yaml::<FilterPreset>(&path) {
            if let Some(n) = name { preset.name = n; }
            if let Some(d) = description { preset.description = Some(d); }
            if let Some(f) = filters { preset.filters = f; }
            write_yaml(&path, &preset)?;
        }
        Ok(())
    }

    pub fn delete_filter_preset(&self, id: String) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        delete_item_by_id(&base.join(DIR_FILTERS), &id)
    }

    pub fn get_scripts(&self) -> Vec<ScriptRule> {
        let base = self.base_dir.read().unwrap();
        read_all_in_dir(&base.join(DIR_SCRIPTS))
    }

    pub fn save_script(&self, rule: ScriptRule) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let id = if rule.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { rule.id.clone() };
        write_item_by_id(&base.join(DIR_SCRIPTS), &id, &rule)
    }

    pub fn delete_script(&self, id: String) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        delete_item_by_id(&base.join(DIR_SCRIPTS), &id)
    }

    pub fn set_script_error(&self, id: String, error: Option<String>) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let dir = base.join(DIR_SCRIPTS);
        let path = dir.join(format!("{}.yml", id));
        if let Some(mut script) = read_yaml::<ScriptRule>(&path) {
            script.error = error;
            write_yaml(&path, &script)?;
        }
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Option<String> {
        let base = self.base_dir.read().unwrap();
        let settings: HashMap<String, String> = read_yaml(&base.join(EXTRA_FILE)).unwrap_or_default();
        settings.get(key).cloned()
    }

    pub fn set_setting(&self, key: String, value: String) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let path = base.join(EXTRA_FILE);
        let mut settings: HashMap<String, String> = read_yaml(&path).unwrap_or_default();
        settings.insert(key, value);
        write_yaml(&path, &settings)
    }

    pub fn get_composer_requests(&self) -> Vec<ComposerSavedRequest> {
        let base = self.base_dir.read().unwrap();
        read_all_in_dir(&base.join(DIR_COMPOSER))
    }

    pub fn save_all_composer_requests(&self, requests: Vec<ComposerSavedRequest>) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        let dir = base.join(DIR_COMPOSER);
        if dir.exists() {
            fs::remove_dir_all(&dir)?;
        }
        fs::create_dir_all(&dir)?;
        for req in &requests {
            write_item_by_id(&dir, &req.id, req)?;
        }
        Ok(())
    }

    pub fn save_composer_request(&self, request: ComposerSavedRequest) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        write_item_by_id(&base.join(DIR_COMPOSER), &request.id, &request)
    }

    pub fn delete_composer_request(&self, id: String) -> Result<(), Box<dyn std::error::Error>> {
        let base = self.base_dir.read().unwrap();
        delete_item_by_id(&base.join(DIR_COMPOSER), &id)
    }
}

use std::path::Path;
use std::fs::read_to_string;
use std::collections::HashSet;

fn main() {
  // Define mandatory environment variables that MUST be present for a successful build
  let required_fields: HashSet<&str> = [
    "APP_NAME",
    "SENTRY_DSN",
    "SENTRY_AUTH_TOKEN",
    "VITE_SENTRY_DSN",
    "API_BASE_URL",
  ].iter().cloned().collect();

  // Check if .env file exists in the root of the project
  let dot_env_path = Path::new("../.env");
  
  if !dot_env_path.exists() {
    panic!("FATAL ERROR: .env file not found at the root! This file is required to bake environment variables into the binary.");
  }

  // Ensure cargo reruns if the .env file changes
  println!("cargo:rerun-if-changed=../.env");

  let mut found_fields = HashSet::new();

  // Read .env and tell cargo to bake these into the binary environment
  if let Ok(content) = read_to_string(dot_env_path) {
    for line in content.lines() {
        let line = line.trim();
        // Skip comments and empty lines
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim().trim_matches('"').trim_matches('\'');
            
            // This makes the variable available via env!("KEY") at compile time
            // and std::env::var("KEY") at runtime if baked in.
            println!("cargo:rustc-env={}={}", key, value);
            found_fields.insert(key.to_string());
        }
    }
  }

  // Validate that all required fields were found
  let mut missing_fields = Vec::new();
  for field in required_fields {
      if !found_fields.contains(field) {
          missing_fields.push(field);
      }
  }

  if !missing_fields.is_empty() {
      panic!("FATAL ERROR: The following mandatory environment variables are missing from your .env file: {:?}", missing_fields);
  }

  #[cfg(target_os = "macos")]
  {
    println!("cargo:rerun-if-changed=XPCService/xpc_client.c");
    println!("cargo:rerun-if-changed=XPCService/xpc_client.h");

    cc::Build::new()
        .file("XPCService/xpc_client.c")
        .include("XPCService")
        .compile("xpc_client");
  }

  tauri_build::build()
}

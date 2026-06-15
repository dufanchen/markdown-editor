use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, RunEvent, Window};

struct OpenedFile(Arc<Mutex<Option<String>>>);

#[derive(serde::Serialize)]
struct DirectoryEntry {
  name: String,
  path: String,
  is_directory: bool,
}

#[tauri::command]
fn get_opened_file(state: tauri::State<'_, OpenedFile>) -> Option<String> {
  state.0.lock().unwrap().clone()
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
  std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
fn list_directory_files(path: String) -> Result<Vec<DirectoryEntry>, String> {
  let entries = std::fs::read_dir(&path)
    .map_err(|e| format!("Failed to read directory {}: {}", path, e))?;

  let mut result: Vec<DirectoryEntry> = entries
    .filter_map(|entry| {
      let entry = entry.ok()?;
      let name = entry.file_name().to_string_lossy().to_string();
      // Skip hidden files
      if name.starts_with('.') {
        return None;
      }
      let file_path = entry.path().to_string_lossy().to_string();
      let is_directory = entry.file_type().ok()?.is_dir();
      Some(DirectoryEntry { name, path: file_path, is_directory })
    })
    .collect();

  // Sort: directories first, then alphabetically by name (case-insensitive)
  result.sort_by(|a, b| {
    b.is_directory.cmp(&a.is_directory)
      .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
  });

  Ok(result)
}

#[tauri::command]
fn read_bundled_resource(app_handle: tauri::AppHandle, filename: String) -> Result<String, String> {
  let resource_path = app_handle
    .path()
    .resource_dir()
    .map_err(|e| format!("Failed to get resource dir: {}", e))?
    .join("resources")
    .join(&filename);
  std::fs::read_to_string(&resource_path)
    .map_err(|e| format!("Failed to read bundled resource {}: {}", filename, e))
}

#[tauri::command]
fn close_current_window(window: Window) -> Result<(), String> {
  window.destroy().map_err(|e| format!("Failed to close window: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let opened_file: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
  let opened_file_for_run = opened_file.clone();

  let app = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .manage(OpenedFile(opened_file.clone()))
    .invoke_handler(tauri::generate_handler![
      get_opened_file,
      read_file_content,
      read_bundled_resource,
      list_directory_files,
      close_current_window
    ])
    .setup(|_app| {
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(move |app_handle, event| {
    match event {
      RunEvent::Opened { urls } => {
        let paths: Vec<String> = urls
          .iter()
          .filter_map(|url| url.to_file_path().ok())
          .map(|p| p.to_string_lossy().to_string())
          .collect();
        if let Some(path) = paths.into_iter().next() {
          *opened_file_for_run.lock().unwrap() = Some(path.clone());
          let _ = app_handle.emit("file-opened", path);
        }
      }
      _ => {}
    }
  });
}

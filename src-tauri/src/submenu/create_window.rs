pub fn create_window(
    window: tauri::Window,
    id: &'static str,
    title: &'static str,
    url: &'static str,
) {
    tauri::async_runtime::spawn(async move {
        let mut window_builder =
            tauri::WindowBuilder::new(&window, id, tauri::WindowUrl::App(url.into()))
                .title(title)
                .theme(Some(tauri::Theme::Dark));

        #[cfg(target_os = "linux")]
        {
            window_builder = window_builder.menu(tauri::Menu::default());
        }

        window_builder.build().unwrap();
    });
}

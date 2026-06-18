#[cfg(target_os = "macos")]
use cocoa::foundation::NSRect;
#[cfg(target_os = "macos")]
use objc::{class, msg_send, sel, sel_impl};
#[cfg(target_os = "macos")]
use tauri::{Runtime, WebviewWindow};

#[cfg(target_os = "macos")]
pub fn setup_mac_window<R: Runtime>(window: &WebviewWindow<R>) {
    use cocoa::appkit::{NSColor, NSWindow, NSWindowTitleVisibility, NSWindowStyleMask};
    use cocoa::base::{id, nil, YES};
    use cocoa::foundation::NSString;
    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

    let ns_window = window.ns_window().expect("Failed to get NSWindow") as cocoa::base::id;

    unsafe {
        // 1. Ensure FullSizeContentView and Titled masks are set
        let mut style_mask = ns_window.styleMask();
        style_mask.insert(NSWindowStyleMask::NSFullSizeContentViewWindowMask);
        style_mask.insert(NSWindowStyleMask::NSTitledWindowMask);
        ns_window.setStyleMask_(style_mask);

        // 2. Hide the title and make the titlebar transparent
        ns_window.setTitleVisibility_(NSWindowTitleVisibility::NSWindowTitleHidden);
        ns_window.setTitlebarAppearsTransparent_(YES);

        // 3. Set the native window background to match the app theme
        let bg_color = NSColor::colorWithRed_green_blue_alpha_(
            nil,
            9.0 / 255.0,
            9.0 / 255.0,
            11.0 / 255.0,
            1.0,
        );
        ns_window.setBackgroundColor_(bg_color);

        // 4. Force dark appearance regardless of system theme
        let dark_appearance: id = msg_send![class!(NSAppearance), appearanceNamed: NSString::alloc(nil).init_str("NSAppearanceNameDarkAqua")];
        let _: () = msg_send![ns_window, setAppearance: dark_appearance];

        // 5. Position traffic lights
        position_traffic_lights(ns_window, 13.0, 18.0);
    }

    // 6. Apply vibrancy for the glass effect
    let _ = apply_vibrancy(window, NSVisualEffectMaterial::UnderWindowBackground, None, None);

    // 7. Listen for resize events to maintain traffic light positioning
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Resized(..) = event {
            let ns_window = window_clone.ns_window().expect("Failed to get NSWindow") as cocoa::base::id;
            unsafe {
                ns_window.setTitleVisibility_(NSWindowTitleVisibility::NSWindowTitleHidden);
                position_traffic_lights(ns_window, 13.0, 18.0);
            }
        }
    });
}

#[cfg(target_os = "macos")]
unsafe fn position_traffic_lights(ns_window: cocoa::base::id, x: f64, y: f64) {
    use cocoa::appkit::{NSView, NSWindow, NSWindowButton};
    use cocoa::foundation::NSRect;

    let close = ns_window.standardWindowButton_(NSWindowButton::NSWindowCloseButton);
    let miniaturize = ns_window.standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
    let zoom = ns_window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

    let title_bar_container_view = close.superview().superview();

    let close_rect: NSRect = msg_send![close, frame];
    let button_height = close_rect.size.height;

    // Set the height of the title bar container
    let mut title_bar_rect = NSView::frame(title_bar_container_view);
    let title_bar_frame_height = button_height + y;
    title_bar_rect.size.height = title_bar_frame_height;
    title_bar_rect.origin.y = NSView::frame(ns_window).size.height - title_bar_frame_height;
    let _: () = msg_send![title_bar_container_view, setFrame: title_bar_rect];

    // Position the buttons
    let window_buttons = vec![close, miniaturize, zoom];
    
    // Calculate space between buttons if they exist
    let space_between = if !miniaturize.is_null() && !close.is_null() {
        NSView::frame(miniaturize).origin.x - NSView::frame(close).origin.x
    } else {
        20.0 // fallback
    };

    for (i, button) in window_buttons.into_iter().enumerate() {
        if button.is_null() { continue; }
        let mut rect: NSRect = NSView::frame(button);
        rect.origin.x = x + (i as f64 * space_between);
        rect.origin.y = (title_bar_frame_height - button_height) / 2.0;
        button.setFrameOrigin(rect.origin);
    }
}

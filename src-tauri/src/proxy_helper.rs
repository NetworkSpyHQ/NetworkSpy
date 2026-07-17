use std::ffi::{CStr, CString};
use std::sync::Mutex;
use std::fmt;

#[link(name = "xpc_client", kind = "static")]
extern "C" {
    fn xpc_call_helper(
        mach_service_name: *const std::ffi::c_char,
        command: *const std::ffi::c_char,
        host: *const std::ffi::c_char,
        port: i64,
    ) -> XpcResult;
    fn xpc_result_free(res: *mut XpcResult);
}

#[repr(C)]
struct XpcResult {
    success: bool,
    error: *mut std::ffi::c_char,
    payload: *mut std::ffi::c_char,
}

unsafe impl Send for XpcResult {}

const MACH_SERVICE_NAME: &str = "com.muiz.idn.tauri.dev.proxy-helper";

#[derive(Debug)]
pub enum HelperError {
    NotInstalled,
    ConnectionFailed(String),
    CommandFailed(String),
}

impl fmt::Display for HelperError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            HelperError::NotInstalled => write!(f, "helper not installed"),
            HelperError::ConnectionFailed(msg) => write!(f, "connection failed: {}", msg),
            HelperError::CommandFailed(msg) => write!(f, "command failed: {}", msg),
        }
    }
}

pub struct ProxyHelper {
    inner: Mutex<()>,
}

impl ProxyHelper {
    pub fn new() -> Self {
        Self { inner: Mutex::new(()) }
    }

    pub fn enable_proxy(&self, host: &str, port: u16) -> Result<(), HelperError> {
        let _lock = self.inner.lock().unwrap();
        let service = CString::new(MACH_SERVICE_NAME).unwrap();
        let command = CString::new("enable_proxy").unwrap();
        let host_c = CString::new(host).unwrap();

        unsafe {
            let res = xpc_call_helper(service.as_ptr(), command.as_ptr(),
                                      host_c.as_ptr(), port as i64);
            let result = convert_result(&res);
            xpc_result_free(&res as *const _ as *mut _);
            result
        }
    }

    pub fn disable_proxy(&self) -> Result<(), HelperError> {
        let _lock = self.inner.lock().unwrap();
        let service = CString::new(MACH_SERVICE_NAME).unwrap();
        let command = CString::new("disable_proxy").unwrap();

        unsafe {
            let res = xpc_call_helper(service.as_ptr(), command.as_ptr(),
                                      std::ptr::null(), 0);
            let result = convert_result(&res);
            xpc_result_free(&res as *const _ as *mut _);
            result
        }
    }

    pub fn get_status(&self) -> Result<String, HelperError> {
        let _lock = self.inner.lock().unwrap();
        let service = CString::new(MACH_SERVICE_NAME).unwrap();
        let command = CString::new("get_status").unwrap();

        unsafe {
            let res = xpc_call_helper(service.as_ptr(), command.as_ptr(),
                                      std::ptr::null(), 0);
            let result = convert_result_payload(&res);
            xpc_result_free(&res as *const _ as *mut _);
            result
        }
    }
}

unsafe fn convert_result(res: &XpcResult) -> Result<(), HelperError> {
    if res.success {
        return Ok(());
    }
    if !res.error.is_null() {
        let msg = CStr::from_ptr(res.error).to_string_lossy().into_owned();
        Err(HelperError::CommandFailed(msg))
    } else {
        Err(HelperError::CommandFailed("unknown error".into()))
    }
}

unsafe fn convert_result_payload(res: &XpcResult) -> Result<String, HelperError> {
    if res.success && !res.payload.is_null() {
        let payload = CStr::from_ptr(res.payload).to_string_lossy().into_owned();
        return Ok(payload);
    }
    if !res.error.is_null() {
        let msg = CStr::from_ptr(res.error).to_string_lossy().into_owned();
        Err(HelperError::CommandFailed(msg))
    } else {
        Err(HelperError::CommandFailed("unknown error".into()))
    }
}

// SMJobBless — installs the privileged helper via launchd
use std::ffi::c_void;

#[link(name = "Security", kind = "framework")]
extern "C" {
    fn AuthorizationCreate(
        rights: *const c_void,
        environment: *const c_void,
        flags: u32,
        auth: *mut *mut c_void,
    ) -> i32;
    fn AuthorizationFree(auth: *mut c_void, flags: u32) -> i32;
}

#[link(name = "ServiceManagement", kind = "framework")]
extern "C" {
    fn SMJobBless(
        domain: *const c_void,
        executableLabel: *const c_void,
        auth: *mut c_void,
        outError: *mut *mut c_void,
    ) -> bool;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFStringCreateWithCString(
        alloc: *const c_void,
        cStr: *const std::ffi::c_char,
        encoding: u32,
    ) -> *const c_void;
    fn CFRelease(cf: *const c_void);
}

const K_CFSTRING_ENCODING_UTF8: u32 = 0x08000100;
const K_AUTHORIZATION_FLAG_INTERACTION_ALLOWED: u32 = 1 << 0;
const K_AUTHORIZATION_FLAG_EXTRA_RIGHTS: u32 = 1 << 1;

pub fn install_helper() -> Result<(), String> {
    unsafe {
        let mut auth: *mut c_void = std::ptr::null_mut();
        let status = AuthorizationCreate(
            std::ptr::null(),
            std::ptr::null(),
            K_AUTHORIZATION_FLAG_INTERACTION_ALLOWED | K_AUTHORIZATION_FLAG_EXTRA_RIGHTS,
            &mut auth,
        );
        if status != 0 || auth.is_null() {
            return Err(format!("AuthorizationCreate failed: {}", status));
        }

        let label = CFStringCreateWithCString(
            std::ptr::null(),
            "com.muiz.idn.tauri.dev.proxy-helper\0".as_ptr() as *const _,
            K_CFSTRING_ENCODING_UTF8,
        );
        let domain = CFStringCreateWithCString(
            std::ptr::null(),
            "kSMDomainSystemLaunchd\0".as_ptr() as *const _,
            K_CFSTRING_ENCODING_UTF8,
        );

        let mut error: *mut c_void = std::ptr::null_mut();
        let blessed = SMJobBless(domain, label, auth, &mut error);

        if !label.is_null() { CFRelease(label); }
        if !domain.is_null() { CFRelease(domain); }
        AuthorizationFree(auth, 0);

        if blessed {
            Ok(())
        } else {
            Err("SMJobBless failed (user cancelled or error)".into())
        }
    }
}

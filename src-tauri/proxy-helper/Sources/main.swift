import Foundation
import SystemConfiguration

@objc protocol ProxyHelperProtocol {
    func enableProxy(host: String, port: Int64, withReply reply: @escaping (String) -> Void)
    func disableProxy(withReply reply: @escaping (String) -> Void)
    func getStatus(withReply reply: @escaping (String) -> Void)
}

class ProxyHelperDelegate: NSObject, NSXPCListenerDelegate {
    let helper = ProxyHelper()

    func listener(_ listener: NSXPCListener,
                  shouldAcceptNewConnection newConnection: NSXPCConnection) -> Bool {
        guard validateCaller(newConnection) else {
            os_log(.error, "Rejected XPC connection from unauthorized caller")
            return false
        }
        newConnection.exportedInterface = NSXPCInterface(with: ProxyHelperProtocol.self)
        newConnection.exportedObject = helper
        newConnection.resume()
        return true
    }

    private func validateCaller(_ conn: NSXPCConnection) -> Bool {
        guard let token = conn.auditToken else { return false }
        var code: SecCode?
        let attribs: [String: Any] = [
            kSecGuestAttributeAuditToken as String: token
        ]
        guard SecCodeCopyGuestWithAttributes(nil, attribs as CFDictionary,
                                             [], &code) == errSecSuccess,
              let appCode = code else { return false }
        let requirementString = "identifier \"com.muiz.idn.tauri.dev\""
        var requirement: SecRequirement?
        guard SecRequirementCreateWithString(requirementString as CFString,
                                              [], &requirement) == errSecSuccess,
              let req = requirement else { return false }
        return SecCodeCheckValidity(appCode, [], req) == errSecSuccess
    }
}

class ProxyHelper: NSObject, ProxyHelperProtocol {
    func enableProxy(host: String, port: Int64, withReply reply: @escaping (String) -> Void) {
        os_log(.info, "enableProxy: host=%{public}s port=%lld", host, port)
        let result = SystemProxyConfig.setProxies(host: host, port: Int(port), enable: true)
        reply(result ? "ok" : "error")
    }

    func disableProxy(withReply reply: @escaping (String) -> Void) {
        os_log(.info, "disableProxy")
        let result = SystemProxyConfig.setProxies(host: "", port: 0, enable: false)
        reply(result ? "ok" : "error")
    }

    func getStatus(withReply reply: @escaping (String) -> Void) {
        reply(SystemProxyConfig.currentProxyStatusJSON())
    }
}

struct SystemProxyConfig {
    static func setProxies(host: String, port: Int, enable: Bool) -> Bool {
        guard let prefs = SCPreferencesCreate(nil, "NetworkSpy" as CFString, nil) else {
            return false
        }
        SCPreferencesLock(prefs, true)
        defer { SCPreferencesUnlock(prefs) }

        guard let sets = SCNetworkSetCopyAll(prefs) as? [SCNetworkSet] else { return false }

        for set in sets {
            guard let services = SCNetworkSetCopyServices(set) as? [SCNetworkService]
            else { continue }
            for service in services {
                guard SCNetworkServiceGetEnabled(service) else { continue }
                setServiceProxy(prefs, service: service, host: host, port: port, enable: enable)
            }
        }

        return SCPreferencesCommitChanges(prefs) && SCPreferencesApplyChanges(prefs)
    }

    private static func setServiceProxy(
        _ prefs: SCPreferences,
        service: SCNetworkService,
        host: String,
        port: Int,
        enable: Bool
    ) {
        let serviceID = SCNetworkServiceGetServiceID(service) as String
        let path = "/NetworkServices/\(serviceID)/Proxies" as CFString

        var dict: [String: Any] = [:]
        if let existing = SCPreferencesPathGetValue(prefs, path) as? [String: Any] {
            dict = existing
        }

        if enable {
            dict[kSCPropNetProxiesHTTPEnable as String] = 1
            dict[kSCPropNetProxiesHTTPProxy as String] = host
            dict[kSCPropNetProxiesHTTPPort as String] = port
            dict[kSCPropNetProxiesHTTPSEnable as String] = 1
            dict[kSCPropNetProxiesHTTPSProxy as String] = host
            dict[kSCPropNetProxiesHTTPSPort as String] = port
            dict[kSCPropNetProxiesExcludeSimpleHostnames as String] = 1
            dict[kSCPropNetProxiesBypassAllowed as String] = 1
        } else {
            dict[kSCPropNetProxiesHTTPEnable as String] = 0
            dict[kSCPropNetProxiesHTTPSEnable as String] = 0
        }

        SCPreferencesPathSetValue(prefs, path, dict as CFDictionary)
    }

    static func currentProxyStatusJSON() -> String {
        guard let prefs = SCPreferencesCreate(nil, "NetworkSpy" as CFString, nil) else {
            return "{}"
        }
        var result: [String: Any] = [:]
        if let sets = SCNetworkSetCopyAll(prefs) as? [SCNetworkSet] {
            for set in sets {
                guard let services = SCNetworkSetCopyServices(set) as? [SCNetworkService]
                else { continue }
                for service in services {
                    let name = SCNetworkServiceGetName(service) as String? ?? "unknown"
                    let serviceID = SCNetworkServiceGetServiceID(service) as String
                    let path = "/NetworkServices/\(serviceID)/Proxies" as CFString
                    if let val = SCPreferencesPathGetValue(prefs, path) as? [String: Any] {
                        result[name] = val
                    }
                }
            }
        }
        if let data = try? JSONSerialization.data(withJSONObject: result, options: .prettyPrinted),
           let str = String(data: data, encoding: .utf8) {
            return str
        }
        return "{}"
    }
}

let delegate = ProxyHelperDelegate()
let listener = NSXPCListener(machServiceName: "com.muiz.idn.tauri.dev.proxy-helper")
listener.delegate = delegate
listener.resume()
RunLoop.current.run()

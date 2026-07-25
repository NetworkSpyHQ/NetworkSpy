import { invoke } from '@tauri-apps/api/core';
import { useAtom } from 'jotai';
import { planAtom } from '@src/utils/trafficAtoms';

export const useLicense = () => {
    const [plan, setPlan] = useAtom(planAtom);

    const isVerified = plan !== 'free';
    const isLicensed = isVerified;
    const isPro = plan === 'pro' || plan === 'lifetime';
    const isTeam = plan === 'team';

    /**
     * Securely check if a feature is enabled by querying the Rust backend.
     * This makes it much harder for attackers to bypass checks by modifying JS.
     */
    const checkFeature = async (feature: 'scripting' | 'mcp' | 'breakpoints' | 'custom_viewers' | 'premium'): Promise<boolean> => {
        try {
            return await invoke<boolean>("license_check_feature", { feature });
        } catch (e) {
            console.error("Feature check failed", e);
            return false;
        }
    };

    /**
     * Get a numerical limit (e.g., max tabs, max filters, max rules) from the secure backend.
     */
    const getLimit = async (limitName: 'max_tabs' | 'max_filters' | 'max_proxy_rules' | 'max_scripts' | 'max_breakpoints' | 'max_map_local' | 'max_map_remote'): Promise<number> => {
        try {
            return await invoke<number>("license_get_limit", { limitName });
        } catch (e) {
            console.error("Limit check failed", e);
            return limitName === 'max_tabs' ? 2 : 3;
        }
    };

    /**
     * Get the current plan name (e.g., 'free', 'personal', 'pro') from the Rust backend
     * and update the shared atom so all components stay in sync.
     */
    const getPlan = async (): Promise<string> => {
        try {
            const p = await invoke<string>("license_get_plan");
            setPlan(p);
            return p;
        } catch (e) {
            console.error("Plan check failed", e);
            setPlan("free");
            return "free";
        }
    };

    /**
     * Verify a license key against the remote API.
     * Updates the shared plan atom on success so all components re-render.
     */
    const verifyLicense = async (key: string | null = null): Promise<any> => {
        try {
            const result: any = await invoke("verify_license", { licenseKey: key });
            if (result.success) {
                setPlan(result.plan);
            } else {
                setPlan("free");
            }
            return result;
        } catch (e) {
            console.error("License verification failed", e);
            setPlan("free");
            throw e;
        }
    };

    /**
     * Revoke the current license. Clears keychain + shared plan state.
     */
    const revokeLicense = async (): Promise<void> => {
        try {
            await invoke("revoke_license_from_keychain");
            setPlan("free");
        } catch (e) {
            console.error("Failed to revoke license", e);
        }
    };

    return { checkFeature, getLimit, getPlan, verifyLicense, revokeLicense, plan, isPro, isLicensed, isTeam, isVerified };
};

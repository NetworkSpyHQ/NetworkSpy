import React, { ReactNode } from 'react';
import { PostHogProvider } from '@posthog/react';
import { getVersion } from '@tauri-apps/api/app';
import { RUNNING_IN_TAURI } from './TauriProvider';

interface AnalyticsProviderProps {
  children: ReactNode;
}

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  defaults: '2026-01-30',
} as const;

const PostHogVersionSetter: React.FC = () => {
  const posthog = usePostHog();
  React.useEffect(() => {
    if (!RUNNING_IN_TAURI) return;
    getVersion().then(version => {
      posthog?.register({ app_version: version });
    });
  }, [posthog]);
  return null;
};

const DevIdentifier: React.FC = () => {
  const posthog = usePostHog();
  React.useEffect(() => {
    if (import.meta.env.DEV && posthog) {
      posthog.identify('local-developer', {
        role: 'developer',
        is_dev: true,
        environment: 'development'
      });
    }
  }, [posthog]);
  return null;
};

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

  if (!apiKey || apiKey.startsWith('your_')) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider apiKey={apiKey} options={options}>
      <PostHogVersionSetter />
      <DevIdentifier />
      {children}
    </PostHogProvider>
  );
};

// Re-export hook if needed for compatibility (though usePostHog is standard)
import { usePostHog } from '@posthog/react';

export const useAnalytics = () => {
  const posthog = usePostHog();
  
  return {
    track: (event: string, properties?: Record<string, any>) => {
      posthog.capture(event, properties);
    },
    // Add other methods if needed to match previous AnalyticsContextType
    identify: (distinctId: string, userProperties?: Record<string, any>) => {
      posthog.identify(distinctId, userProperties);
    },
    page: (name: string, properties?: Record<string, any>) => {
      posthog.capture('$pageview', { ...properties, page_name: name });
    }
  };
};

export { usePostHog as useAnalyticsInstance } from '@posthog/react';

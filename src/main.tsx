import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layout";
import ErrorPage from "./error-page";
import Home from "./routes/home";
import Settings from "./routes/settings";
import { TauriProvider } from "./context/TauriProvider";
import "./styles.css";
import "./styles/treeview.css";
import "split-pane-react/esm/themes/default.css";
import { SettingsProvider } from "./context/SettingsProvider";
// import ScriptList from "./routes/script-list";
import CertificateInstaller from "./routes/certificate-installer";
import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && sentryDsn.startsWith('http')) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
}

import Breakpoint from "./routes/tools/Breakpoint";
import Diffing from "./routes/tools/Diffing";
import Logging from "./routes/tools/Logging";
import Rewrite from "./routes/tools/Rewrite";
import Scripting from "./routes/tools/Scripting";
import Tag from "./routes/tools/Tag";
import WorkspacePage from "./routes/workspace";
import AccountPage from "./routes/account";
import ExtensionsPage from "./routes/extensions";
import SessionPage from "./routes/sessions";
import ViewersPage from "./routes/viewers";
import FiltersPage from "./routes/filters";
import ProxyList from "./routes/tools/ProxyList";
import MapLocal from "./routes/tools/MapLocal";
import MapRemote from "./routes/tools/MapRemote/index";
import Composer from "./routes/tools/Composer";
import { SessionProvider } from "./context/SessionContext";
import { ViewerProvider } from "./context/ViewerContext";
// FilterProvider removed as it is now per-tab in CenterPane

import { BreakpointHitView } from "./packages/breakpoint/BreakpointHitView";

// import ScriptEditor from "./routes/script-editor";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/workspace",
        element: <WorkspacePage />,
      },
      {
        path: "/account",
        element: <AccountPage />,
      },
      {
        path: "/extensions",
        element: <ExtensionsPage />,
      },
      {
        path: "/breakpoint",
        element: <Breakpoint />,
      },
      {
        path: "/diffing",
        element: <Diffing />,
      },
      {
        path: "/logging",
        element: <Logging />,
      },
      {
        path: "/rewrite",
        element: <Rewrite />,
      },
      {
        path: "/scripting",
        element: <Scripting />,
      },
      {
        path: "/tag",
        element: <Tag />,
      },
      {
        path: "/certificate-installer",
        element: <CertificateInstaller />,
      },
      {
        path: "/sessions",
        element: <SessionPage />,
      },
      {
        path: "/viewers",
        element: <ViewersPage />,
      },
      {
        path: "/filters",
        element: <FiltersPage />,
      },
      {
        path: "/proxylist",
        element: <ProxyList />,
      },
      {
        path: "/map-local",
        element: <MapLocal />,
      },
      {
        path: "/map-remote",
        element: <MapRemote />,
      },
      {
        path: "/breakpoint-hit",
        element: <BreakpointHitView />,
      },
      {
        path: "/repeat",
        element: <BreakpointHitView />,
      },
      {
        path: "/composer",
        element: <Composer />,
      },
    ],
  },
]);

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TagProvider } from "./context/TagContext";

import { TrafficListProvider } from "@src/packages/main-content/context/TrafficList";
import { TauriEnvProvider } from "@src/packages/app-env";
import { PaneProvider } from "./context/PaneProvider";
import { FilterPresetProvider } from "./context/FilterPresetContext";
import { AnalyticsProvider } from "./context/AnalyticsProvider";
import { UpgradeProvider } from "./context/UpgradeContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AnalyticsProvider>
      <TauriProvider>
        <UpgradeProvider>
          <TagProvider>
            <SessionProvider>
              <ViewerProvider>
                <SettingsProvider>
                  <FilterPresetProvider>
                    <TrafficListProvider>
                      <TauriEnvProvider>
                        <PaneProvider>
                          <DndProvider backend={HTML5Backend}>
                            <RouterProvider router={router} />
                          </DndProvider>
                        </PaneProvider>
                      </TauriEnvProvider>
                    </TrafficListProvider>
                  </FilterPresetProvider>
                </SettingsProvider>
              </ViewerProvider>
            </SessionProvider>
          </TagProvider>
        </UpgradeProvider>
      </TauriProvider>
    </AnalyticsProvider>
  </React.StrictMode>
);

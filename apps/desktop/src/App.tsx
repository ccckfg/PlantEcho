import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { BackendConnect } from "@/components/BackendConnect";
import { DesktopFrame } from "@/components/window/DesktopFrame";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { MobileShell } from "@/components/mobile/MobileShell";
import { clearApiConnection, getApiConnection } from "@/lib/api";
import type { BackendConnection } from "@/lib/connection";
import { useIsMobile } from "@/lib/usePlatform";
import { useSyncStream } from "@/hooks/useSyncStream";
import { useProactiveInbox } from "@/features/proactive/useProactiveInbox";
import { usePresenceHeartbeat } from "@/features/proactive/usePresenceHeartbeat";
import { DashboardPage } from "@/pages/DashboardPage";
import { ChatPage } from "@/pages/ChatPage";
import { JournalPage } from "@/pages/JournalPage";
import { AlbumPage } from "@/pages/AlbumPage";
import { PlantDetailPage } from "@/pages/PlantDetailPage";
import { MobileDashboardPage } from "@/pages/mobile/MobileDashboardPage";
import { MobileChatPage } from "@/pages/mobile/MobileChatPage";
import { MobileJournalPage } from "@/pages/mobile/MobileJournalPage";
import { MobileAlbumPage } from "@/pages/mobile/MobileAlbumPage";
import { MobilePlantDetailPage } from "@/pages/mobile/MobilePlantDetailPage";

export default function App() {
  const [connection, setConnection] = useState<BackendConnection | null>(() =>
    getApiConnection()
  );
  const [editingConnection, setEditingConnection] = useState(false);
  const isMobile = useIsMobile();
  useSyncStream(connection);
  useProactiveInbox(connection);
  usePresenceHeartbeat(connection);
  const logout = () => {
    clearApiConnection();
    setConnection(null);
    setEditingConnection(false);
  };

  // 外壳与页面随平台切换；桌面端渲染路径与现状完全一致。
  const Frame = isMobile ? MobileFrame : DesktopFrame;

  if (!connection || editingConnection) {
    return (
      <Frame>
        <BackendConnect
          onConnected={(nextConnection) => {
            setConnection(nextConnection);
            setEditingConnection(false);
          }}
          onCancel={connection ? () => setEditingConnection(false) : undefined}
        />
      </Frame>
    );
  }

  const routes = isMobile ? (
    <Routes>
      <Route path="/" element={<MobileDashboardPage />} />
      <Route path="/plant/:plantId" element={<MobilePlantDetailPage />} />
      <Route path="/chat" element={<MobileChatPage />} />
      <Route path="/chat/:plantId" element={<MobileChatPage />} />
      <Route path="/journal" element={<MobileJournalPage />} />
      <Route path="/journal/:plantId" element={<MobileJournalPage />} />
      <Route path="/album" element={<MobileAlbumPage />} />
      <Route path="*" element={<MobileDashboardPage />} />
    </Routes>
  ) : (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/plant/:plantId" element={<PlantDetailPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/chat/:plantId" element={<ChatPage />} />
      <Route path="/journal" element={<JournalPage />} />
      <Route path="/journal/:plantId" element={<JournalPage />} />
      <Route path="/album" element={<AlbumPage />} />
      <Route path="*" element={<DashboardPage />} />
    </Routes>
  );

  return (
    <Frame>
      {isMobile ? (
        <MobileShell
          connection={connection}
          onDisconnect={() => setEditingConnection(true)}
          onLogout={logout}
        >
          {routes}
        </MobileShell>
      ) : (
        <AppShell
          connection={connection}
          onDisconnect={() => setEditingConnection(true)}
          onLogout={logout}
        >
          {routes}
        </AppShell>
      )}
    </Frame>
  );
}

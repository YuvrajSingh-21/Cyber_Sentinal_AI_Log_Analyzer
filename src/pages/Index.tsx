// import { useState, useCallback } from 'react';
// import { PageType } from '@/types/cyber';
// import { useCyberData } from '@/hooks/useCyberData';
// import { Sidebar } from '@/components/layout/Sidebar';
// import { Header } from '@/components/layout/Header';
// import { Dashboard } from './Dashboard';
// import { Logs } from './Logs';
// import { UploadData } from './UploadData';
// import { Anomalies } from './Anomalies';
// import { Timeline } from './Timeline';
// import { Reports } from './Reports';
// import { Settings } from './Settings';
// import { useNavigate, Outlet } from "react-router-dom";

// const Index = () => {
//   const navigate = useNavigate();
//   const location = useLocation();

//   const currentPage =
//     (location.pathname.replace("/", "") as PageType) || "dashboard";

//   const [searchQuery, setSearchQuery] = useState('');
  
//   const {
//     logs,
//     anomalies,
//     timeline,
//     metrics,
//     isLive,
//     updateAnomalyStatus,
//     clearLogs,
//     toggleLive,
//   } = useCyberData();

//   const activeAnomalyCount = anomalies.filter(a => a.status === 'active').length;

//   const handleSearch = useCallback((query: string) => {
//     setSearchQuery(query);
//     // If on dashboard, switch to logs when searching
//     if (query && currentPage === 'dashboard') {
//       navigate('/logs');
//     }
//   }, [currentPage]);

//   const renderPage = () => {
//     switch (currentPage) {
//       case 'dashboard':
//         return <Dashboard logs={logs} metrics={metrics} anomalies={anomalies} />;
//       case 'logs':
//         return <Logs logs={logs} onClearLogs={clearLogs} />;
//       case 'upload':
//         return <UploadData />;
//       case 'anomalies':
//         return <Anomalies anomalies={anomalies} onUpdateStatus={updateAnomalyStatus} />;
//       case 'timeline':
//         return <Timeline events={timeline} />;
//       case 'reports':
//         return <Reports />;
//       case 'settings':
//         return <Settings />;
//       default:
//         return <Dashboard logs={logs} metrics={metrics} anomalies={anomalies} />;
//     }
//   };

//   return (
//     <div className="min-h-screen bg-background grid-cyber">
//       <div className="flex">
//         <Sidebar
//           currentPage={currentPage}
//           onPageChange={(page) => navigate(`/${page}`)}
//           anomalyCount={activeAnomalyCount}
//         />

        
//         <div className="flex-1 flex flex-col min-h-screen">
//           <Header 
//             onSearch={handleSearch}
//             isLive={isLive}
//             onToggleLive={toggleLive}
//           />
          
//           <main className="flex-1 p-4 lg:p-6 overflow-auto scrollbar-cyber">
//             <Outlet />
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Index;








import { useCallback } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";

import { useCyberData } from "@/hooks/useCyberData";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

import { Dashboard } from "./Dashboard";
import { Logs } from "./Logs";
import { UploadData } from "./UploadData";
import { Anomalies } from "./Anomalies";
import { Timeline } from "./Timeline";
import { Reports } from "./Reports";
import { Settings } from "./Settings";
import { PageType } from "@/types/cyber";

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage =
    (location.pathname.replace("/", "") as PageType) || "dashboard";

  const {
    logs,
    anomalies,
    timeline,
    metrics,
    isLive,
    updateAnomalyStatus,
    clearLogs,
    toggleLive,
  } = useCyberData();

  const activeAnomalyCount = anomalies.filter(
    (a) => a.status === "active"
  ).length;

  const handleSearch = useCallback(
    (query: string) => {
      if (query && currentPage === "dashboard") {
        navigate("/logs");
      }
    },
    [currentPage, navigate]
  );

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            logs={logs}
            metrics={metrics}
            anomalies={anomalies}
          />
        );
      case "logs":
        return <Logs logs={logs} onClearLogs={clearLogs} />;
      case "upload":
        return <UploadData />;
      case "anomalies":
        return (
          <Anomalies
            anomalies={anomalies}
            onUpdateStatus={updateAnomalyStatus}
          />
        );
      case "timeline":
        return <Timeline events={timeline} />;
      case "reports":
        return <Reports />;
      case "settings":
        return <Settings />;
      default:
        return (
          <Dashboard
            logs={logs}
            metrics={metrics}
            anomalies={anomalies}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background grid-cyber">
      <div className="flex">
        <Sidebar
          currentPage={currentPage}
          onPageChange={(page) => navigate(`/${page}`)}
          anomalyCount={activeAnomalyCount}
        />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header
            onSearch={handleSearch}
            isLive={isLive}
            onToggleLive={toggleLive}
          />

          <main className="flex-1 p-4 lg:p-6 overflow-auto scrollbar-cyber">
            {renderPage()}
          </main>
        </div>
      </div>

      {/* Needed so React Router considers routes active */}
      <Outlet />
    </div>
  );
}

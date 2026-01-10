import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PageType } from '@/types/cyber';
import {
  LayoutDashboard,
  FileText,
  Upload,
  AlertTriangle,
  Clock,
  FileBarChart,
  Settings,
  Menu,
  X,
  Shield,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  anomalyCount: number;
}

const navItems: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'logs', label: 'Log Explorer', icon: FileText },
  { id: 'upload', label: 'Upload Data', icon: Upload },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar = ({ currentPage, onPageChange, anomalyCount }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const activeAnomalies = anomalyCount;

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar border border-sidebar-border hover:bg-sidebar-accent transition-colors"
        aria-label="Toggle menu"
      >
        <div className="relative w-6 h-6">
          <Menu 
            className={cn(
              "absolute inset-0 transition-all duration-300",
              isMobileOpen ? "opacity-0 rotate-90" : "opacity-100 rotate-0"
            )} 
          />
          <X 
            className={cn(
              "absolute inset-0 transition-all duration-300",
              isMobileOpen ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
            )} 
          />
        </div>
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border z-40 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo - Click to toggle sidebar */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <button
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              setIsMobileOpen(false);
            }}
            className="relative group cursor-pointer hover:scale-105 transition-transform duration-200"
            aria-label="Toggle sidebar"
          >
            <Shield className="w-10 h-10 text-primary group-hover:text-primary/80 transition-colors" />
            <Activity className="w-4 h-4 text-primary absolute -bottom-1 -right-1 animate-pulse" />
          </button>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-sidebar-foreground tracking-tight">
                CyberSentinel
              </h1>
              <p className="text-xs text-muted-foreground">AI Log Framework</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-cyber">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const showBadge = item.id === 'anomalies' && activeAnomalies > 0;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  setIsMobileOpen(false);
                }}
                className={cn(
                  "sidebar-item w-full relative group",
                  isActive && "sidebar-item-active"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                )} />
                
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}

                {showBadge && (
                  <span className={cn(
                    "absolute flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full",
                    isCollapsed ? "top-0 right-0 w-5 h-5" : "right-3 w-6 h-6"
                  )}>
                    {activeAnomalies}
                  </span>
                )}
              </button>
            );
          })}
        </nav>


        {/* Status Indicator */}
        <div className={cn(
          "p-4 border-t border-sidebar-border",
          isCollapsed && "flex justify-center"
        )}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-success" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-success animate-pulse-ring" />
            </div>
            {!isCollapsed && (
              <span className="text-xs text-muted-foreground">System Online</span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

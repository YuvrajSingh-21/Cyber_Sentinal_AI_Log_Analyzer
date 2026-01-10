import { useState, useEffect } from 'react';
import { Sun, Moon, Search, Bell, Command, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onSearch: (query: string) => void;
  isLive: boolean;
  onToggleLive: () => void;
}

export const Header = ({ onSearch, isLive, onToggleLive }: HeaderProps) => {
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(3);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder='Search logs... (try "failed logins last hour")'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full pl-10 pr-20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Live Toggle */}
        <button
          onClick={onToggleLive}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            isLive 
              ? "bg-success/20 text-success border border-success/30" 
              : "bg-muted text-muted-foreground border border-border"
          )}
        >
          <Zap className={cn("w-4 h-4", isLive && "animate-pulse")} />
          <span className="hidden sm:inline">{isLive ? 'LIVE' : 'PAUSED'}</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {notifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
              {notifications}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg hover:bg-muted transition-colors relative overflow-hidden"
          aria-label="Toggle theme"
        >
          <div className="relative w-5 h-5">
            <Sun 
              className={cn(
                "absolute inset-0 transition-all duration-300",
                isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
              )} 
            />
            <Moon 
              className={cn(
                "absolute inset-0 transition-all duration-300",
                isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
              )} 
            />
          </div>
        </button>
      </div>
    </header>
  );
};

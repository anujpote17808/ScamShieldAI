import { Shield, LayoutDashboard, ScanSearch, Link as LinkIcon, FileText, History, Settings, Home } from "lucide-react";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  userName: string;
}

export function Sidebar({ currentView, onViewChange, userName }: SidebarProps) {
  const menuItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "scan", icon: ScanSearch, label: "Scan Message" },
    { id: "url-scanner", icon: LinkIcon, label: "URL Scanner" },
    { id: "reports", icon: FileText, label: "Reports" },
    { id: "history", icon: History, label: "History" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="fixed left-0 top-0 h-16 md:h-screen w-full md:w-64 bg-sidebar/95 border-b md:border-b-0 md:border-r border-sidebar-border backdrop-blur-xl z-50">
      <div className="p-4 md:p-6 h-full md:h-auto border-b-0 md:border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" />
          <span className="text-lg font-bold">ScamShield AI</span>
        </div>
      </div>

      <nav className="hidden md:block p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  currentView === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="hidden md:block absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
        <button
          onClick={() => onViewChange("profile")}
          className="w-full px-4 py-3 bg-primary/10 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left overflow-hidden">
            <div className="text-sm font-semibold truncate">{userName}</div>
            <div className="text-xs text-muted-foreground">View Profile</div>
          </div>
        </button>
      </div>
    </div>
  );
}

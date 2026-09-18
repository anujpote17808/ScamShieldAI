import { useState, useRef, useCallback, useEffect } from "react";
import { Shield, Menu, X } from "lucide-react";

// Import components
import { ParticlesBackground } from "./components/particles-background";
import { HeroSection } from "./components/hero-section";
import { TrustSection } from "./components/trust-section";
import { HowItWorks } from "./components/how-it-works";
import { LiveDemo } from "./components/live-demo";
import { Features } from "./components/features";
import { DashboardPreview } from "./components/dashboard-preview";
import { Testimonials } from "./components/testimonials";
import { Pricing } from "./components/pricing";
import { FAQ } from "./components/faq";
import { Footer } from "./components/footer";
import { Sidebar } from "./components/sidebar";
import { Dashboard } from "./components/dashboard";
import { ScanView } from "./components/scan-view";
import { LoginPage } from "./components/login-page";
import { SignupPage } from "./components/signup-page";
import { HomePage } from "./components/home-page";
import { ProfilePage } from "./components/profile-page";
import { Button } from "./components/button";
import { StartupOverlay } from "./components/startup-overlay";
import { Reveal } from "./components/reveal";
import { useAuth } from "../hooks/useAuth";

export default function App() {
  const [currentView, setCurrentView] = useState("landing");
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showStartup, setShowStartup] = useState(true);
  const liveDemoRef = useRef<HTMLDivElement>(null);
  const completeStartup = useCallback(() => setShowStartup(false), []);
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const isAuthenticated = Boolean(user);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    setCurrentView("home");
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    await register(name, email, password);
    setCurrentView("home");
  };

  const handleLogout = async () => {
    await logout();
    setCurrentView("landing");
  };

  useEffect(() => {
    if (user && (currentView === "landing" || currentView === "login" || currentView === "signup")) {
      setCurrentView("home");
    }
  }, [user, currentView]);

  const scrollToDemo = () => {
    if (liveDemoRef.current) {
      liveDemoRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const renderView = () => {
    // Show login/signup if not authenticated and trying to access auth pages
    const protectedViews = ["home", "dashboard", "scan", "profile", "url-scanner", "reports", "history", "settings"];
    if (!isAuthenticated && (currentView === "login" || currentView === "signup" || protectedViews.includes(currentView))) {
      return authView === "login" ? (
        <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setAuthView("signup")} />
      ) : (
        <SignupPage onSignup={handleSignup} onSwitchToLogin={() => setAuthView("login")} />
      );
    }

    // Authenticated routes
    if (isAuthenticated) {
      switch (currentView) {
        case "home":
          return <HomePage userName={user?.name || "there"} onNavigate={setCurrentView} />;

        case "dashboard":
          return <Dashboard />;

        case "scan":
          return <ScanView />;

        case "profile":
          return <ProfilePage userName={user?.name || ""} userEmail={user?.email || ""} onLogout={handleLogout} />;

        case "url-scanner":
        case "reports":
        case "history":
        case "settings":
          return (
            <div className="min-h-screen ml-0 md:ml-64 p-5 md:p-8 pt-24 md:pt-8 flex items-center justify-center">
              <div className="text-center">
                <Shield className="w-24 h-24 text-primary mx-auto mb-6 opacity-50" />
                <h2 className="text-3xl font-bold mb-4">
                  {currentView.charAt(0).toUpperCase() + currentView.slice(1).replace("-", " ")}
                </h2>
                <p className="text-muted-foreground">This section is coming soon!</p>
                <Button onClick={() => setCurrentView("home")} className="mt-6">
                  Back to Home
                </Button>
              </div>
            </div>
          );
      }
    }

    // Landing page (default)
    switch (currentView) {
      default:
        return (
          <>
            <ParticlesBackground />

            <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
              <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-8 h-8 text-primary" />
                  <span className="text-xl font-bold">ScamShield AI</span>
                </div>

                <nav className="hidden md:flex items-center gap-8">
                  <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                    Features
                  </a>
                  <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">
                    How it Works
                  </a>
                  <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">
                    Pricing
                  </a>
                  <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">
                    FAQ
                  </a>
                </nav>

                <div className="hidden md:flex items-center gap-4">
                  <Button variant="outline" onClick={() => { setCurrentView("login"); setAuthView("login"); }}>
                    Sign In
                  </Button>
                  <Button onClick={() => { setCurrentView("signup"); setAuthView("signup"); }}>
                    Get Started
                  </Button>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-foreground"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>

              {mobileMenuOpen && (
                <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
                  <nav className="flex flex-col p-4 space-y-4">
                    <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                      Features
                    </a>
                    <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">
                      How it Works
                    </a>
                    <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">
                      Pricing
                    </a>
                    <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">
                      FAQ
                    </a>
                    <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                      <Button variant="outline" onClick={() => { setCurrentView("login"); setAuthView("login"); }} className="w-full">
                        Sign In
                      </Button>
                      <Button onClick={() => { setCurrentView("signup"); setAuthView("signup"); }} className="w-full">
                        Get Started
                      </Button>
                    </div>
                  </nav>
                </div>
              )}
            </header>

            <main className="relative pt-16">
              <HeroSection onAnalyzeClick={scrollToDemo} />
              <Reveal><TrustSection /></Reveal>
              <Reveal><div id="how-it-works">
                <HowItWorks />
              </div></Reveal>
              <Reveal><div ref={liveDemoRef}>
                <LiveDemo onAnalyzeClick={() => { setCurrentView("login"); setAuthView("login"); }} />
              </div></Reveal>
              <Reveal><div id="features">
                <Features />
              </div></Reveal>
              <Reveal><DashboardPreview /></Reveal>
              <Reveal><Testimonials /></Reveal>
              <Reveal><div id="pricing">
                <Pricing />
              </div></Reveal>
              <Reveal><div id="faq">
                <FAQ />
              </div></Reveal>
              <Footer />
            </main>
          </>
        );
    }
  };

  const showSidebar = isAuthenticated && currentView !== "landing" && currentView !== "login" && currentView !== "signup";

  return (
    <div className="dark min-h-screen text-foreground">
      {showSidebar && <Sidebar currentView={currentView} onViewChange={setCurrentView} userName={user?.name || ""} />}
      {renderView()}
      {showStartup && !isAuthenticated && <StartupOverlay onComplete={completeStartup} />}
      {authLoading && <div className="sr-only" aria-live="polite">Restoring secure session...</div>}
    </div>
  );
}

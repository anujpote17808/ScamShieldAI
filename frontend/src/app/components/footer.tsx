import { Shield, Twitter, Github, Linkedin, Mail } from "lucide-react";

export function Footer() {
  const links = {
    product: ["Features", "Pricing", "API", "Documentation"],
    company: ["About", "Blog", "Careers", "Press Kit"],
    legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
    support: ["Help Center", "Contact", "Status", "Security"],
  };

  return (
    <footer className="relative py-16 px-4 border-t border-border/50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">ScamShield AI</span>
            </div>
            <p className="text-muted-foreground mb-6">
              Protecting users from scams with cutting-edge AI technology.
              Stay safe, stay informed.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Twitter className="w-5 h-5 text-primary" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Github className="w-5 h-5 text-primary" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Linkedin className="w-5 h-5 text-primary" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Mail className="w-5 h-5 text-primary" />
              </a>
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4 capitalize">{category}</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2026 ScamShield AI. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm">
            Built with ❤️ for a safer internet
          </p>
        </div>
      </div>
    </footer>
  );
}

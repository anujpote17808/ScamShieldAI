import { GlassCard } from "./glass-card";
import { Button } from "./button";
import { User, Bell, Lock, CreditCard, LogOut, Camera } from "lucide-react";
import { motion } from "motion/react";
import { useScans } from "../../hooks/useScans";

interface ProfilePageProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export function ProfilePage({ userName, userEmail, onLogout }: ProfilePageProps) {
  const { scans, loading } = useScans();
  return (
    <div className="min-h-screen ml-0 md:ml-64 p-5 md:p-8 pt-24 md:pt-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <GlassCard className="p-8 mb-6">
          <div className="flex items-start gap-6 mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{userName}</h2>
              <p className="text-muted-foreground mb-4">{userEmail}</p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">Edit Profile</Button>
                <Button variant="outline" size="sm">Change Avatar</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-input/50 rounded-lg text-center">
              <div className="text-2xl font-bold mb-1">Active</div>
              <div className="text-sm text-muted-foreground">Account status</div>
            </div>
            <div className="p-4 bg-input/50 rounded-lg text-center">
              <div className="text-2xl font-bold mb-1">{loading ? "-" : scans.length}</div>
              <div className="text-sm text-muted-foreground">Total Scans</div>
            </div>
            <div className="p-4 bg-input/50 rounded-lg text-center">
              <div className="text-2xl font-bold mb-1">-</div>
              <div className="text-sm text-muted-foreground">Accuracy (engine data)</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Account Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Full Name</label>
              <input
                type="text"
                defaultValue={userName}
                className="w-full px-4 py-3 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email Address</label>
              <input
                type="email"
                defaultValue={userEmail}
                className="w-full px-4 py-3 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <Button>Save Changes</Button>
          </div>
        </GlassCard>

        <GlassCard className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Security
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-input/50 rounded-lg">
              <div>
                <div className="font-semibold mb-1">Password</div>
                <div className="text-sm text-muted-foreground">Last changed 3 months ago</div>
              </div>
              <Button variant="outline" size="sm">Change Password</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-input/50 rounded-lg">
              <div>
                <div className="font-semibold mb-1">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-input/50 rounded-lg">
              <div>
                <div className="font-semibold mb-1">Active Sessions</div>
                <div className="text-sm text-muted-foreground">Manage your active sessions</div>
              </div>
              <Button variant="outline" size="sm">View Sessions</Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </h3>
          <div className="space-y-4">
            {[
              { title: "Email Notifications", description: "Receive email alerts for high-risk scams" },
              { title: "Push Notifications", description: "Get instant alerts on your device" },
              { title: "Weekly Reports", description: "Receive weekly security summary emails" },
              { title: "Marketing Emails", description: "Product updates and promotions" },
            ].map((item, index) => (
              <div key={`notification-${index}`} className="flex items-center justify-between p-4 bg-input/50 rounded-lg">
                <div>
                  <div className="font-semibold mb-1">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={index < 2} className="sr-only peer" />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Billing & Subscription
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/30">
              <div>
                <div className="font-semibold mb-1">Pro Plan</div>
                <div className="text-sm text-muted-foreground">₹299/month • Renews on July 6, 2026</div>
              </div>
              <Button variant="outline" size="sm">Manage Plan</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-input/50 rounded-lg">
              <div>
                <div className="font-semibold mb-1">Payment Method</div>
                <div className="text-sm text-muted-foreground">•••• •••• •••• 4242</div>
              </div>
              <Button variant="outline" size="sm">Update</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-input/50 rounded-lg">
              <div>
                <div className="font-semibold mb-1">Billing History</div>
                <div className="text-sm text-muted-foreground">View past invoices and receipts</div>
              </div>
              <Button variant="outline" size="sm">View History</Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-destructive/30">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-destructive">
            <LogOut className="w-5 h-5" />
            Account Actions
          </h3>
          <div className="space-y-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="danger"
                className="w-full justify-start"
                onClick={onLogout}
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </Button>
            </motion.div>
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="font-semibold mb-1 text-destructive">Delete Account</div>
              <div className="text-sm text-muted-foreground mb-3">
                Permanently delete your account and all associated data
              </div>
              <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive hover:text-white">
                Delete Account
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

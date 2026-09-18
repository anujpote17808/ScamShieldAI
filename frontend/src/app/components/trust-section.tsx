import { GlassCard } from "./glass-card";
import { Eye, Link2, ShieldCheck, Zap } from "lucide-react";
import { motion } from "motion/react";

export function TrustSection() {
  const capabilities = [
    { icon: ShieldCheck, label: "Message analysis", value: "Inspect content", color: "text-primary" },
    { icon: Link2, label: "Link awareness", value: "Check destinations", color: "text-accent" },
    { icon: Eye, label: "Clear explanations", value: "Understand the why", color: "text-success" },
    { icon: Zap, label: "Fast feedback", value: "Built for urgency", color: "text-secondary" },
  ];

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <GlassCard className="p-6 text-center">
                <stat.icon className={`w-12 h-12 mx-auto mb-4 ${stat.color}`} />
                <div className="text-lg font-semibold mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

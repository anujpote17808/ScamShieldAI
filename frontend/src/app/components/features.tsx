import { GlassCard } from "./glass-card";
import { Brain, Link as LinkIcon, Zap, FileText, Shield, Lock } from "lucide-react";
import { motion } from "motion/react";

export function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI Scam Detection",
      description: "Advanced machine learning models trained on millions of scam patterns",
      color: "text-primary",
    },
    {
      icon: LinkIcon,
      title: "Phishing URL Analysis",
      description: "Real-time scanning of suspicious links and shortened URLs",
      color: "text-accent",
    },
    {
      icon: Zap,
      title: "Real-time Scanning",
      description: "Instant results in seconds, not minutes or hours",
      color: "text-warning",
    },
    {
      icon: FileText,
      title: "Explainable AI",
      description: "Detailed breakdown of why a message is flagged as suspicious",
      color: "text-success",
    },
    {
      icon: Shield,
      title: "Fraud Prevention Tips",
      description: "Get actionable advice on how to protect yourself",
      color: "text-secondary",
    },
    {
      icon: Lock,
      title: "Secure Processing",
      description: "Your data is encrypted and never stored on our servers",
      color: "text-destructive",
    },
  ];

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to stay protected from scams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <GlassCard className="p-6 h-full">
                <feature.icon className={`w-12 h-12 mb-4 ${feature.color}`} />
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

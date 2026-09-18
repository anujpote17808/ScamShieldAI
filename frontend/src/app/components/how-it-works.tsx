import { GlassCard } from "./glass-card";
import { FileText, Brain, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function HowItWorks() {
  const steps = [
    {
      icon: FileText,
      title: "Paste Message",
      description: "Copy and paste any suspicious SMS, email, or message you received",
      color: "text-primary",
    },
    {
      icon: Brain,
      title: "AI Analyzes",
      description: "Our advanced AI scans for patterns, URLs, and known scam indicators",
      color: "text-accent",
    },
    {
      icon: CheckCircle,
      title: "Get Results",
      description: "Receive instant scam probability score with detailed explanation",
      color: "text-success",
    },
  ];

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground">
            Protect yourself in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <GlassCard className="p-8 h-full">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-${step.color} to-transparent flex items-center justify-center mb-6 mx-auto`}>
                    <step.icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-center">{step.title}</h3>
                  <p className="text-muted-foreground text-center">{step.description}</p>
                  <div className="text-center mt-4">
                    <span className="text-4xl font-bold text-primary/30">0{index + 1}</span>
                  </div>
                </GlassCard>
              </motion.div>

              {index < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-primary z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

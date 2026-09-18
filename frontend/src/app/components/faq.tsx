import { useState } from "react";
import { GlassCard } from "./glass-card";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does ScamShield AI detect scams?",
      answer: "The security engine analyzes message content, URLs, and linguistic indicators to identify potential threats. Each result includes the risk level and explanation returned by the engine.",
    },
    {
      question: "Is my data secure and private?",
      answer: "Absolutely. All messages are processed in real-time and immediately discarded after analysis. We never store your personal messages or data. All communication is encrypted end-to-end.",
    },
    {
      question: "What types of scams can ScamShield detect?",
      answer: "ScamShield can detect phishing emails, SMS scams, WhatsApp fraud, lottery scams, fake prize notifications, impersonation attempts, malicious links, and many other types of fraudulent communications.",
    },
    {
      question: "Can I use ScamShield on mobile?",
      answer: "Yes! ScamShield has native apps for both iOS and Android. You can also forward suspicious messages directly to our scanning service or use browser extensions for desktop protection.",
    },
    {
      question: "What happens if a legitimate message is flagged?",
      answer: "Our AI provides detailed reasoning for each detection. If you believe a message was incorrectly flagged, you can report it to help improve our models. We're constantly learning and updating our algorithms.",
    },
    {
      question: "Do you offer API access for businesses?",
      answer: "Yes, Pro and Enterprise plans include API access. This allows you to integrate ScamShield's protection directly into your own applications, customer service platforms, or security infrastructure.",
    },
  ];

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about ScamShield AI
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <GlassCard key={`faq-${index}-${faq.question.slice(0, 20)}`} className="overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold pr-8">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-primary transition-transform flex-shrink-0 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-muted-foreground">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

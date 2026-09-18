import { GlassCard } from "./glass-card";
import { Star } from "lucide-react";
import { motion } from "motion/react";

export function Testimonials() {
  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Small Business Owner",
      content: "ScamShield saved me from a phishing attack that could have cost my business thousands. The AI detected a fake invoice email instantly!",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    {
      name: "Rajesh Kumar",
      role: "Senior Citizen",
      content: "As someone not very tech-savvy, this tool gives me peace of mind. I check every suspicious message before taking any action.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    {
      name: "Ananya Patel",
      role: "College Student",
      content: "I was almost scammed by a fake scholarship email. ScamShield flagged it immediately and explained why it was suspicious. Amazing!",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    {
      name: "Vikram Singh",
      role: "IT Professional",
      content: "The explainable AI is brilliant. It doesn't just say it's a scam, it tells you WHY. Perfect for educating my parents about online safety.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
    {
      name: "Meera Reddy",
      role: "Entrepreneur",
      content: "I use the API in my customer service platform. It's helped protect hundreds of my customers from scams. Highly recommended!",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    },
    {
      name: "Arjun Mehta",
      role: "Digital Marketer",
      content: "The accuracy is incredible. I've tested it with known scams and legitimate messages - it gets it right every single time.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    },
  ];

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Trusted by Thousands</h2>
          <p className="text-xl text-muted-foreground">
            See what our users have to say
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <GlassCard className="p-6 h-full">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={`${testimonial.name}-star-${i}`} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full border-2 border-primary/30"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

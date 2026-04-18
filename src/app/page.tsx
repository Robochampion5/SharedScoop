"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Users,
  TrendingDown,
  Shield,
  Zap,
  ArrowRight,
  ChevronRight,
  Star,
  Package,
  IndianRupee,
  Dumbbell,
} from "lucide-react";



const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });

  return (
    <div className="overflow-hidden">
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-scoop/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-scoop-light/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-scoop/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
              <Zap className="w-4 h-4" />
              Save up to 30% on premium supplements
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6"
          >
            Buy Protein{" "}
            <span className="gradient-text">Together</span>
            <br />
            Save{" "}
            <span className="gradient-text">Together</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Join a community of fitness enthusiasts who pool their purchases to
            buy premium protein supplements directly from vendors at wholesale
            prices.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/auth/login"
              className="group px-8 py-3.5 bg-gradient-to-r from-scoop to-scoop-light text-white rounded-xl text-base font-semibold hover:shadow-2xl hover:shadow-scoop/30 transition-all duration-300 flex items-center gap-2"
            >
              Start Saving Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/community/browse"
              className="px-8 py-3.5 bg-secondary text-secondary-foreground rounded-xl text-base font-semibold hover:bg-accent transition-all duration-200 flex items-center gap-2"
            >
              Browse Communities
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>


        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-bold mb-4"
            >
              Why <span className="gradient-text">SharedScoop</span>?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground max-w-xl mx-auto"
            >
              We bring fitness communities together to unlock wholesale pricing
              that was only available to retailers.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingDown,
                title: "Save Big",
                description:
                  "Get premium protein at wholesale prices. Our communities save an average of 25-30% compared to retail MRP.",
                gradient: "from-emerald-500 to-green-600",
              },
              {
                icon: Users,
                title: "Community Power",
                description:
                  "Join location-based communities of fitness enthusiasts. Vote on products, pool funds, and buy together.",
                gradient: "from-scoop to-scoop-light",
              },
              {
                icon: Shield,
                title: "100% Authentic",
                description:
                  "Direct from verified vendors with reliability ratings. No middlemen, no fakes, just genuine supplements.",
                gradient: "from-blue-500 to-cyan-500",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card rounded-2xl p-8 group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From finding your community to getting your protein delivered —
              it&apos;s simple.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: Users,
                title: "Join a Community",
                description: "Find or create a group in your area. Connect with fellow fitness buffs nearby.",
              },
              {
                step: "02",
                icon: Star,
                title: "Vote & Decide",
                description: "Democratically choose which protein brand and type to bulk-order this month.",
              },
              {
                step: "03",
                icon: IndianRupee,
                title: "Pool & Pay",
                description: "Commit your share in KGs. Watch the order pool fill up to meet the vendor MOQ.",
              },
              {
                step: "04",
                icon: Package,
                title: "Get Delivered",
                description: "Track your order status and verify delivery with a secure OTP — done!",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                {i < 3 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-transparent" />
                )}
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6 relative">
                  <item.icon className="w-10 h-10 text-primary" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-scoop/10 via-transparent to-scoop-light/10" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to <span className="gradient-text">Save</span>?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Join thousands of fitness enthusiasts already saving on their
                protein supplements through group purchasing.
              </p>
              <Link
                href="/auth/login"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-scoop to-scoop-light text-white rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-scoop/30 transition-all duration-300"
              >
                Get Started — It&apos;s Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-scoop to-scoop-light flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-foreground">
              Shared<span className="text-primary">Scoop</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 SharedScoop. Building stronger communities through smarter purchasing.
          </p>
        </div>
      </footer>
    </div>
  );
}

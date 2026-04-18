"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase/client";
import { collection, addDoc } from "firebase/firestore";
import {
  Users,
  MapPin,
  MessageCircle,
  FileText,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";

const LOCATIONS = [
  "Koramangala",
  "Whitefield",
  "Indiranagar",
  "HSR Layout",
  "Marathahalli",
  "Electronic City",
  "Jayanagar",
  "JP Nagar",
  "Bannerghatta Road",
  "Hebbal",
  "Rajajinagar",
  "Malleshwaram",
];

export default function CreateCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) {
      setError("Name and location are required");
      return;
    }

    setLoading(true);
    setError("");

    const user = auth.currentUser;
    if (!user) {
      setError("You must be signed in");
      setLoading(false);
      return;
    }

    try {
      const communityDoc = await addDoc(collection(db, "communities"), {
        name,
        description,
        location_area: location,
        admin_id: user.uid,
        whatsapp_link: whatsappLink,
        created_at: new Date().toISOString()
      });

      await addDoc(collection(db, "memberships"), {
        user_id: user.uid,
        community_id: communityDoc.id,
        status: "approved",
        created_at: new Date().toISOString()
      });

      router.push(`/community/${communityDoc.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create community");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="glass-card rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-scoop to-scoop-light flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Create a Community
            </h1>
            <p className="text-sm text-muted-foreground">
              Start a buying group and invite fitness enthusiasts in your area
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Community Name
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Koramangala Protein Crew"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's your community about?"
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Location Area
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      location === loc
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                WhatsApp Group Link (optional)
              </label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="url"
                  value={whatsappLink}
                  onChange={(e) => setWhatsappLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-scoop to-scoop-light text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-scoop/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create Community
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

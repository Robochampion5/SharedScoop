"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase/client";
import { collection, query, where, getDocs, limit, doc, getDoc, updateDoc } from "firebase/firestore";
import { MapPin, ArrowRight, Loader2, Users, ChevronRight } from "lucide-react";

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

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [nearbyCommunities, setNearbyCommunities] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  useEffect(() => {
    if (!selectedLocation) return;
    const fetchCommunities = async () => {
      setLoadingCommunities(true);
      try {
        const q = query(
          collection(db, "communities"),
          where("location_area", "==", selectedLocation),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const communities = await Promise.all(
          snapshot.docs.map(async (d) => {
            const data = d.data();
            const adminDoc = await getDoc(doc(db, "users", data.admin_id));
            return {
              id: d.id,
              ...data,
              admin: adminDoc.data()
            };
          })
        );
        setNearbyCommunities(communities);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCommunities(false);
      }
    };
    fetchCommunities();
  }, [selectedLocation]);

  const handleSave = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          location_area: selectedLocation
        });
      } catch (err) {
        console.error(err);
      }
    }
    router.push("/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-scoop/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-scoop-light/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <div className="glass-card rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-scoop to-scoop-light flex items-center justify-center mx-auto mb-4 shadow-lg">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Where are you located?
            </h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ll find active buying groups in your area
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
            {LOCATIONS.map((location) => (
              <button
                key={location}
                onClick={() => setSelectedLocation(location)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  selectedLocation === location
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {location}
              </button>
            ))}
          </div>

          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6"
            >
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Communities in {selectedLocation}
              </h3>
              {loadingCommunities ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="skeleton h-14 rounded-xl" />
                  ))}
                </div>
              ) : nearbyCommunities.length > 0 ? (
                <div className="space-y-2">
                  {nearbyCommunities.map((community) => (
                    <div
                      key={community.id}
                      className="flex items-center justify-between p-3 bg-secondary rounded-xl hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {community.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {community.description?.slice(0, 50)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 bg-secondary rounded-xl">
                  No communities yet. You could be the first to create one!
                </p>
              )}
            </motion.div>
          )}

          <button
            onClick={handleSave}
            disabled={!selectedLocation || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-scoop to-scoop-light text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-scoop/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

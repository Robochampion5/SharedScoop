"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { db, auth } from "@/lib/firebase/client";
import { collection, query, getDocs, orderBy, where, addDoc, getCountFromServer } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { CardSkeleton } from "@/components/shared/skeleton-loader";
import { EmptyState } from "@/components/shared/empty-state";
import type { Community } from "@/lib/types";
import {
  Search,
  MapPin,
  Users,
  ArrowRight,
  Plus,
  Filter,
} from "lucide-react";

const LOCATIONS = [
  "All",
  "Koramangala",
  "Whitefield",
  "Indiranagar",
  "HSR Layout",
  "Marathahalli",
  "Electronic City",
  "Jayanagar",
  "JP Nagar",
  "Hebbal",
  "Malleshwaram",
];

export default function BrowseCommunitiesPage() {
  const [communities, setCommunities] = useState<(Community & { member_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [joining, setJoining] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      fetchCommunities(currentUser);
    });
    return () => unsubscribe();
  }, [selectedLocation, search]); // We rely on the initial render to setup auth observer, and refetch on search/location change

  const fetchCommunities = async (currentUser = auth.currentUser) => {
    setLoading(true);
    let conditions = [];

    if (selectedLocation !== "All") {
      conditions.push(where("location_area", "==", selectedLocation));
    }
    
    // In Firestore, substring search (ilike) is difficult natively.
    // For simplicity, we fetch all that match location and filter by name in memory if there's a search term.
    const communitiesRef = collection(db, "communities");
    const q = query(communitiesRef, ...conditions, orderBy("created_at", "desc"));
    
    const querySnapshot = await getDocs(q);
    
    let fetchedCommunities: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (search) {
        if (data.name?.toLowerCase().includes(search.toLowerCase())) {
           fetchedCommunities.push({ id: doc.id, ...data });
        }
      } else {
         fetchedCommunities.push({ id: doc.id, ...data });
      }
    });

    const withCounts = await Promise.all(
      fetchedCommunities.map(async (c) => {
        const membershipsRef = collection(db, "memberships");
        const membershipQuery = query(
          membershipsRef, 
          where("community_id", "==", c.id),
          where("status", "==", "approved")
        );
        const snapshot = await getCountFromServer(membershipQuery);
        return { ...c, member_count: snapshot.data().count || 0 };
      })
    );
    setCommunities(withCounts);

    if (currentUser) {
      const userMembershipsRef = collection(db, "memberships");
      const userMembershipsQuery = query(userMembershipsRef, where("user_id", "==", currentUser.uid));
      const userMembershipsSnapshot = await getDocs(userMembershipsQuery);
      
      const ids = new Set<string>();
      userMembershipsSnapshot.forEach((doc) => {
        ids.add(doc.data().community_id);
      });
      setJoinedIds(ids);
    }

    setLoading(false);
  };

  const handleJoin = async (communityId: string) => {
    setJoining(communityId);
    if (!auth.currentUser) {
      window.location.href = "/auth/login";
      return;
    }

    await addDoc(collection(db, "memberships"), {
      user_id: auth.currentUser.uid,
      community_id: communityId,
      status: "pending",
      created_at: new Date().toISOString()
    });

    setJoinedIds((prev) => new Set([...prev, communityId]));
    setJoining(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Browse Communities
            </h1>
            <p className="text-sm text-muted-foreground">
              Find a buying group near you
            </p>
          </div>
          <Link
            href="/community/create"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-scoop to-scoop-light text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-scoop/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Community
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search communities..."
                className="w-full pl-10 pr-4 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedLocation === loc
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {loc === "All" ? (
                  <span className="flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    All
                  </span>
                ) : (
                  loc
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : communities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community, i) => (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-6 group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                    <MapPin className="w-3 h-3" />
                    {community.location_area}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {community.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                  {community.description || "A fitness community buying protein together."}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {community.member_count} member{community.member_count !== 1 ? "s" : ""}
                  </span>

                  {joinedIds.has(community.id) ? (
                    <Link
                      href={`/community/${community.id}`}
                      className="flex items-center gap-1 px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      View
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleJoin(community.id)}
                      disabled={joining === community.id}
                      className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                      {joining === community.id ? "Joining..." : "Join"}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No Communities Found"
            description="Try a different search or location filter, or create your own community."
            action={{
              label: "Create Community",
              onClick: () => (window.location.href = "/community/create"),
            }}
          />
        )}
      </div>
    </div>
  );
}

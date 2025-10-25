import React, { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type Tone = "info" | "success" | "warning" | "error";

// --- Ad now supports optional media (image or video/gif) ---
type Ad = {
  text?: string;
  mediaDataUrl?: string; // data URL for preview/storage
  mediaKind?: "image" | "video" | "gif";
  timestamp: number;
};

type Announcement = {
  id: string;
  country: string;
  city: string;
  text: string;
  created: number;
  accepted?: boolean;
};

export default function App() {
  const [notice, setNotice] = useState<{ show: boolean; text: string; tone: Tone }>({
    show: false,
    text: "",
    tone: "info",
  });
  const notify = (text: string, tone: Tone = "info") => {
    setNotice({ show: true, text, tone });
    (notify as any)._t && clearTimeout((notify as any)._t);
    (notify as any)._t = setTimeout(() => setNotice((s: any) => ({ ...s, show: false })), 4000);
  };

  const [role, setRole] = useState("none");
  const [registered, setRegistered] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [auth, setAuth] = useState({ username: "", password: "" });

  // --- Ads / Announcements state
  const [ads, setAds] = useState<Ad[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // --- Analytics and stats
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalAds: 0,
    accepted: 0,
    interactions: 0,
  });

  // --- Client post modal
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ country: "", city: "", text: "" });

  // --- Advertiser inputs
  const [adText, setAdText] = useState("");
  const [adPaid, setAdPaid] = useState(false);
  const [adMediaUrl, setAdMediaUrl] = useState<string>(""); // preview
  const [adMediaKind, setAdMediaKind] = useState<Ad["mediaKind"]>(undefined);

  useEffect(() => {
    // Needed for report email features elsewhere in the app
    emailjs.init({ publicKey: "ZOixa_otkIeM7vgIB" });
  }, []);

  // Restore ads and rotate every 13 hours
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("i2uAds") || "[]");
      // migrate older string-only ads to new shape
      const migrated: Ad[] = (stored as any[]).map((a) => {
        if (a && typeof a === "object") return a;
        return { text: String(a ?? "Advertisement"), timestamp: Date.now() } as Ad;
      });
      setAds(migrated);
    } catch {}
    const rot = setInterval(() => {
      setAds((prev) => {
        if (!prev.length) return prev;
        const rotated = [...prev.slice(1), prev[0]];
        localStorage.setItem("i2uAds", JSON.stringify(rotated));
        return rotated;
      });
    }, 13 * 60 * 60 * 1000);
    return () => clearInterval(rot);
  }, []);

  // Cleanup expired ads (5 days)
  useEffect(() => {
    const now = Date.now();
    const cleaned = ads.filter((a) => now - a.timestamp < 5 * 24 * 60 * 60 * 1000);
    if (cleaned.length !== ads.length) {
      setAds(cleaned);
      localStorage.setItem("i2uAds", JSON.stringify(cleaned));
    }
  }, [ads]);

  // Restore + persist announcements
  useEffect(() => {
    try {
      setAnnouncements(JSON.parse(localStorage.getItem("i2uAnnouncements") || "[]"));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("i2uAnnouncements", JSON.stringify(announcements));
  }, [announcements]);

  // Fake analytics
  useEffect(() => {
    const data = Array.from({ length: 7 }).map((_, i) => ({
      day: `Day ${i + 1}`,
      posts: Math.floor(Math.random() * 10) + 1,
      ads: Math.floor(Math.random() * 5) + 1,
      interactions: Math.floor(Math.random() * 50) + 10,
    }));
    setAnalytics(data);
  }, []);

  // Recompute stats
  useEffect(() => {
    setStats({
      totalPosts: announcements.length,
      totalAds: ads.length,
      accepted: announcements.filter((a) => a.accepted).length,
      interactions: announcements.length * 5 + ads.length * 3,
    });
  }, [announcements, ads]);

  // Auth
  const handleRegister = () => {
    if (!auth.username || !auth.password || !agreement)
      return notify("Please fill all fields and accept the agreement.", "warning");
    localStorage.setItem("i2uUser", JSON.stringify(auth));
    setRegistered(true);
    notify("Registration successful. You can now log in.", "success");
  };
  const handleLogin = () => {
    let stored: any = {};
    try {
      stored = JSON.parse(localStorage.getItem("i2uUser") || "{}");
    } catch {}
    if (auth.username === stored.username && auth.password === stored.password) {
      setLoggedIn(true);
      notify("Welcome! Please choose your role.", "success");
    } else notify("Invalid credentials.", "error");
  };

  // Advertiser (A)
  const handleAdPayment = () => {
    setAdPaid(true);
    notify("Simulated ad payment: $1 processed successfully.", "success");
  };

  // Detect and read media file as data URL (with size/type constraints)
  const handleAdMediaChange = async (file?: File | null) => {
    if (!file) return;
    const type = file.type.toLowerCase();

    // Accept common image/video types; treat GIF as animation (gif)
    const isImage = type.startsWith("image/") && type !== "image/gif";
    const isGif = type === "image/gif";
    const isVideo = type.startsWith("video/"); // e.g., mp4, webm

    // Size limits
    const maxImageMb = 2;
    const maxAnimMb = 10;
    const mb = file.size / (1024 * 1024);

    if (isImage && mb > maxImageMb) {
      return notify(`Image too large. Max ${maxImageMb} MB.`, "warning");
    }
    if ((isGif || isVideo) && mb > maxAnimMb) {
      return notify(`Animation/Video too large. Max ${maxAnimMb} MB.`, "warning");
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAdMediaUrl(String(reader.result || ""));
      setAdMediaKind(isImage ? "image" : isGif ? "gif" : "video");
      notify("Media loaded. Ready to post.", "success");
    };
    reader.onerror = () => notify("Failed to read file.", "error");
    reader.readAsDataURL(file);
  };

  const handlePostAd = () => {
    if (!adPaid) return notify("Please simulate payment first ($1).", "warning");
    if (!adText.trim() && !adMediaUrl) {
      return notify("Provide ad text and/or upload media before posting.", "warning");
    }
    // optional 30-word constraint for ad text
    if (adText.trim()) {
      const words = adText.trim().split(/\s+/).filter(Boolean);
      if (words.length > 30) return notify("Ad text must be 30 words or fewer.", "warning");
    }

    const newAd: Ad = {
      text: adText.trim() || undefined,
      mediaDataUrl: adMediaUrl || undefined,
      mediaKind: adMediaKind,
      timestamp: Date.now(),
    };

    const newAds = [newAd, ...ads].slice(0, 10);
    setAds(newAds);
    localStorage.setItem("i2uAds", JSON.stringify(newAds));

    // reset ad inputs
    setAdText("");
    setAdPaid(false);
    setAdMediaUrl("");
    setAdMediaKind(undefined);

    notify("Your ad has been posted and will remain for 5 days.", "success");
  };

  // Client (C)
  const openClientPostForm = () => {
    notify("Simulated payment: $1 processed successfully.", "success");
    setShowPostForm(true);
  };
  const submitClientPost = () => {
    if (!postForm.country || !postForm.city || !postForm.text)
      return notify("Please fill country, city, and description.", "warning");
    const words = postForm.text.trim().split(/\s+/).filter(Boolean);
    if (words.length > 30) return notify("Announcement must be 30 words or fewer.", "warning");

    const item: Announcement = {
      id: Math.random().toString(36).slice(2),
      country: postForm.country.trim(),
      city: postForm.city.trim(),
      text: postForm.text.trim(),
      created: Date.now(),
      accepted: false,
    };
    setAnnouncements((prev) => [item, ...prev]);
    setShowPostForm(false);
    setPostForm({ country: "", city: "", text: "" });
    notify("Your request has been posted and is visible to Service Providers.", "success");
  };

  // Export helpers
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("i2U - With Pleasure", 14, 20);
    doc.setFontSize(12);
    doc.text(`Dashboard Report (${role})`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
    autoTable(doc, {
      head: [["Metric", "Value"]],
      body: [
        ["Total Posts", String(stats.totalPosts)],
        ["Total Ads", String(stats.totalAds)],
        ["Accepted Requests", String(stats.accepted)],
        ["Interactions", String(stats.interactions)],
      ],
      startY: 45,
    });
    doc.save(`i2U_${role}_Report.pdf`);
  };
  const exportCSV = () => {
    const headers = "Day,Posts,Ads,Interactions";
    const rows = analytics.map((d) => `${d.day},${d.posts},${d.ads},${d.interactions}`).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `i2U_${role}_Report.csv`;
    link.click();
  };

  // --- OPTIONAL ContactForm remains in code but unused (hidden) ---
  const ContactForm = () => null; // hidden; easy to re-enable later

  if (!registered || !loggedIn) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 text-foreground p-6">
        <div className="card max-w-md w-full">
          <div className="p-4">
            <h3>{registered ? "Login to i2U" : "Register for i2U"}</h3>
            <p style={{ color: "#6b7280" }}>Access the i2U platform (English only)</p>
          </div>
          <div className="p-4" style={{ paddingTop: 0 }}>
            <input
              className="border rounded-xl p-2 w-full"
              placeholder="Username"
              value={auth.username}
              onChange={(e) => setAuth({ ...auth, username: e.target.value })}
            />
            <div className="mt-4" />
            <input
              className="border rounded-xl p-2 w-full"
              type="password"
              placeholder="Password"
              value={auth.password}
              onChange={(e) => setAuth({ ...auth, password: e.target.value })}
            />
            {!registered && (
              <label className="mt-4" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} />
                <span style={{ fontSize: 14, color: "#374151" }}>
                  I agree that interactions between Clients (C) and Service Providers (CP) are solely their legal
                  responsibility; i2U has no liability.
                </span>
              </label>
            )}
            <div className="mt-4" />
            {registered ? (
              <button className="btn primary w-full" onClick={handleLogin}>
                Login
              </button>
            ) : (
              <button className="btn primary w-full" onClick={handleRegister}>
                Register
              </button>
            )}
          </div>
        </div>
        {notice.show && <div className="banner" style={{ textAlign: "center" }}>{notice.text}</div>}
      </div>
    );
  }

  // derive lists
  const visibleAnnouncements = announcements.filter((a) => !a.accepted).slice(0, 20);
  const hiddenAnnouncements = announcements.filter((a, i) => !a.accepted && i >= 20);

  const [cpCountry, setCpCountry] = useState("");
  const [cpCity, setCpCity] = useState("");
  const cpResults = hiddenAnnouncements.filter(
    (a) =>
      (cpCountry ? a.country.toLowerCase().includes(cpCountry.toLowerCase()) : true) &&
      (cpCity ? a.city.toLowerCase().includes(cpCity.toLowerCase()) : true)
  );

  return (
    <div className="min-h-screen bg-gray-50 text-foreground">
      <header className="border-b bg-white/80" style={{ backdropFilter: "blur(6px)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>
            🪸 i2U <span style={{ color: "#6b7280", fontWeight: 400 }}>With Pleasure</span>
          </h1>
          <button className="btn" onClick={() => { setLoggedIn(false); setRegistered(true); }}>
            Logout
          </button>
        </div>
      </header>

      {notice.show && <div className="banner">{notice.text}</div>}

      {/* UPPER HALF: Announcements */}
      <section className="container">
        <div className="card">
          <div className="p-4">
            <h3>Client Announcements (up to 20 visible)</h3>
            <p style={{ color: "#6b7280" }}>
              Shows Country & City with a short (≤ 30 words) description. Disappears once accepted by a CP.
            </p>
          </div>
          <div className="p-4" style={{ paddingTop: 0 }}>
            {visibleAnnouncements.length === 0 ? (
              <p className="text-sm opacity-70">No announcements yet.</p>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                {visibleAnnouncements.map((a) => (
                  <div key={a.id} className="border rounded-xl p-3 bg-white">
                    <div className="text-sm font-semibold">
                      {a.country} • {a.city}
                    </div>
                    <div className="text-sm mt-1">{a.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Role selection + dashboards */}
      <section className="container">
        <h2>Select Your Role</h2>
        <div className="row mb-8 mt-4">
          {["Client (C)", "Service Provider (CP)", "Advertiser (A)"].map((r) => (
            <button key={r} className={`btn ${role === r ? "primary" : ""}`} onClick={() => setRole(r)}>
              {r}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-2 mt-4">
          <div className="card p-4">
            <h3>Total Posts</h3>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{stats.totalPosts}</p>
          </div>
          <div className="card p-4">
            <h3>Total Ads</h3>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{stats.totalAds}</p>
          </div>
          <div className="card p-4">
            <h3>Accepted</h3>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{stats.accepted}</p>
          </div>
          <div className="card p-4">
            <h3>Interactions</h3>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{stats.interactions}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-2 mt-4">
          <div className="card">
            <div className="p-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Posts vs Ads</h3>
              <button className="btn" onClick={exportCSV}>CSV</button>
            </div>
            <div className="p-4" style={{ paddingTop: 0 }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="posts" name="Posts" />
                  <Bar dataKey="ads" name="Ads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="p-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Interaction Trends</h3>
              <button className="btn" onClick={exportPDF}>PDF</button>
            </div>
            <div className="p-4" style={{ paddingTop: 0 }}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="interactions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Role dashboards */}
        <div className="card p-4 mt-6">
          <h3>{role} Dashboard</h3>
          <p style={{ color: "#6b7280" }}>Manage your activities and monitor analytics below.</p>

          {role === "Client (C)" && (
            <div className="mt-3">
              <button className="btn primary" onClick={openClientPostForm}>
                Pay & Post Service Request
              </button>
            </div>
          )}

          {role === "Service Provider (CP)" && (
            <div className="space-y-3 mt-3">
              <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
                <input
                  className="border rounded-xl p-2"
                  placeholder="Search by Country"
                  value={cpCountry}
                  onChange={(e) => setCpCountry((e.target as any).value)}
                />
                <input
                  className="border rounded-xl p-2"
                  placeholder="Search by City"
                  value={cpCity}
                  onChange={(e) => setCpCity((e.target as any).value)}
                />
                <button className="btn">Search</button>
              </div>
              <div className="text-sm opacity-70">
                Searching non-visible announcements (those beyond the first 20 on the homepage).
              </div>
              {cpResults.length === 0 ? (
                <div className="text-sm">No results.</div>
              ) : (
                <div className="grid gap-2">
                  {cpResults.map((a) => (
                    <div key={a.id} className="border rounded-xl p-3 bg-white">
                      <div className="text-sm font-semibold">
                        {a.country} • {a.city}
                      </div>
                      <div className="text-sm mt-1">{a.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {role === "Advertiser (A)" && (
            <div className="grid gap-3 mt-3">
              <textarea
                className="border rounded-xl p-2"
                placeholder="Enter ad text (max 30 words)"
                value={adText}
                onChange={(e) => setAdText((e.target as any).value)}
              />
              <div className="text-xs opacity-70">
                Optional: upload an image (PNG/JPG/GIF ≤ 2 MB) or animation/video (GIF/MP4/WebM ≤ 10 MB).
              </div>
              <input
                className="border rounded-xl p-2"
                type="file"
                accept="image/*,video/mp4,video/webm,image/gif"
                onChange={(e) => handleAdMediaChange(e.target.files?.[0] || null)}
              />
              {/* Preview */}
              {adMediaUrl && (
                <div className="border rounded-xl p-2 bg-white">
                  <div className="text-sm mb-2 opacity-70">Preview:</div>
                  {adMediaKind === "image" && (
                    <img src={adMediaUrl} alt="Ad preview" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }} />
                  )}
                  {adMediaKind === "gif" && (
                    <img src={adMediaUrl} alt="Ad GIF" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }} />
                  )}
                  {adMediaKind === "video" && (
                    <video
                      src={adMediaUrl}
                      style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }}
                      controls
                      playsInline
                      muted
                      loop
                    />
                  )}
                </div>
              )}

              <div className="text-xs opacity-70">
                Ads appear in square blocks below for 5 days and rotate every 13 hours. Only 10 are visible at a time.
              </div>

              <div className="flex gap-2">
                {!adPaid ? (
                  <button className="btn" onClick={handleAdPayment}>Simulate Payment</button>
                ) : (
                  <button className="btn" onClick={() => setAdPaid(false)}>Undo Payment</button>
                )}
                <button className="btn primary" onClick={handlePostAd} disabled={!adPaid}>
                  Post Advertisement
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LOWER HALF: Ads */}
      <section className="container">
        <div className="card">
          <div className="p-4">
            <h3>Sponsored Advertisements (max 10 visible)</h3>
            <p style={{ color: "#6b7280" }}>Rotates every 13 hours. Each ad stays for 5 consecutive days.</p>
          </div>
          <div className="p-4" style={{ paddingTop: 0 }}>
            {ads.length === 0 ? (
              <p className="text-sm opacity-70">No ads yet.</p>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12 }}>
                {ads.slice(0, 10).map((ad, i) => (
                  <div key={i} className="aspect-square border rounded-xl p-2 bg-white text-sm flex items-center justify-center text-center overflow-hidden">
                    {ad.mediaDataUrl ? (
                      ad.mediaKind === "image" || ad.mediaKind === "gif" ? (
                        <img
                          src={ad.mediaDataUrl}
                          alt="ad"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <video
                          src={ad.mediaDataUrl}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      )
                    ) : (
                      <span style={{ padding: 6 }}>{ad.text || "Advertisement"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact & Complaints — HIDDEN (kept for easy restore)
      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="card">
          <div className="p-4">
            <h3>Contact & Complaints</h3>
            <p style={{ color: "#6b7280" }}>English only. Your message will be emailed to mnemitallah@gmail.com.</p>
          </div>
          <div className="p-4" style={{ paddingTop: 0 }}>
            <ContactForm />
          </div>
        </div>
      </section>
      */}

      <footer className="border-t text-sm text-center py-6">
        <p>
          By registering, you agree that all interactions between Clients (C) and Service Providers (CP) are solely
          their legal responsibility. i2U assumes no legal liability for user actions or outcomes.
        </p>
        <p className="mt-2 text-xs">IBAN: EG550003020730003711457000110</p>
        <p className="mt-2">© {new Date().getFullYear()} i2U. With Pleasure.</p>
      </footer>

      {/* Modal: Client Post Form */}
      {showPostForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" style={{ zIndex: 50 }}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Post a Service Request</h3>
              <button className="text-sm underline" onClick={() => setShowPostForm(false)}>
                Close
              </button>
            </div>
            <div className="p-4 grid gap-3">
              <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                <input
                  className="border rounded-xl p-2"
                  placeholder="Country"
                  value={postForm.country}
                  onChange={(e) => setPostForm({ ...postForm, country: (e.target as any).value })}
                />
                <input
                  className="border rounded-xl p-2"
                  placeholder="City"
                  value={postForm.city}
                  onChange={(e) => setPostForm({ ...postForm, city: (e.target as any).value })}
                />
              </div>
              <textarea
                className="border rounded-xl p-2"
                rows={4}
                placeholder="Describe the needed service (max 30 words)."
                value={postForm.text}
                onChange={(e) => setPostForm({ ...postForm, text: (e.target as any).value })}
              />
              <div className="text-xs opacity-70">IBAN: EG550003020730003711457000110</div>
            </div>
            <div className="p-4 border-t text-right">
              <button className="btn primary" onClick={submitClientPost}>
                Submit Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

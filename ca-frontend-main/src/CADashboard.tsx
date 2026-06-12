// import React, { useEffect, useState, useRef, useCallback } from "react";
// import api from "./api";
// import "./App.css";

// type Level = "Foundation" | "Intermediate" | "Final" | "Self Paced" | "Others";

// const DEFAULT_VIDEO_URL = "https://youtu.be/76UUB7Vv8s8?si=7NlDSfqlON-SVpIi";

// const VIDEO_API_BASE = (import.meta as any).env?.VITE_VIDEO_API_URL ?? "http://127.0.0.1:8081";
// const POLL_INTERVAL_MS = 20000;
// const POLL_TIMEOUT_MS = 15 * 60 * 1000;

// const LEVEL_META: Record<Level, { icon: string; desc: string; color: string }> = {
//   Foundation:   { icon: "🌱", desc: "Core concepts & basics",  color: "#0d7a4e" },
//   Intermediate: { icon: "📊", desc: "In-depth applied study",  color: "#b45309" },
//   Final:        { icon: "🏆", desc: "Advanced & strategic",    color: "#1a2744" },
//   "Self Paced": { icon: "🎯", desc: "Learn at your own pace",  color: "#0e7490" },
//   Others:       { icon: "📁", desc: "Reference & extras",      color: "#6b46c1" }
// };

// // ============================================================
// // TYPES
// // ============================================================

// interface PDFItem {
//   _id: string;
//   title: string;
//   pdf_url: string;
//   chapter?: string;
//   unit?: string;
//   video_url?: string;
//   audio_url?: string;
//   simplified_pdf_url?: string;
//   video_created_at?: string;
//   status?: "pending" | "processing" | "completed" | "failed";
// }

// type ViewerType = "pdf" | "video" | "audio" | "smart_pdf";

// interface Viewer {
//   type: ViewerType;
//   item: PDFItem;
// }

// interface VideoJob {
//   jobId: string;
//   dashboardId: string;
//   startedAt: number;
//   status: "polling" | "completed" | "failed" | "timeout";
//   message?: string;
// }

// interface SmartUpload {
//   status: "idle" | "uploading" | "success" | "error";
//   message?: string;
// }

// // ── NEW: simple toast ──────────────────────────────────────
// interface Toast {
//   id: number;
//   message: string;
//   type: "info" | "warning" | "error" | "success";
// }

// // ============================================================
// // HELPERS
// // ============================================================

// function getNum(s: string): number {
//   const m = s.match(/\d+/);
//   return m ? parseInt(m[0]) : 999;
// }

// function sortKeys(keys: string[]): string[] {
//   return [...keys].sort((a, b) => {
//     const diff = getNum(a) - getNum(b);
//     return diff !== 0 ? diff : a.localeCompare(b);
//   });
// }

// // ── Detect mobile (narrow viewport or touch) ─────────────────
// function isMobileDevice(): boolean {
//   return (
//     typeof window !== "undefined" &&
//     (window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
//   );
// }

// // ============================================================
// // TOAST HOOK
// // ============================================================

// function useToast() {
//   const [toasts, setToasts] = useState<Toast[]>([]);
//   const counterRef = useRef(0);

//   const showToast = useCallback(
//     (message: string, type: Toast["type"] = "info", duration = 4000) => {
//       const id = ++counterRef.current;
//       setToasts((prev) => [...prev, { id, message, type }]);
//       setTimeout(() => {
//         setToasts((prev) => prev.filter((t) => t.id !== id));
//       }, duration);
//     },
//     []
//   );

//   const dismissToast = useCallback((id: number) => {
//     setToasts((prev) => prev.filter((t) => t.id !== id));
//   }, []);

//   return { toasts, showToast, dismissToast };
// }

// // ============================================================
// // TOAST RENDERER
// // ============================================================

// const TOAST_COLORS: Record<Toast["type"], { bg: string; border: string; color: string; icon: string }> = {
//   info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "ℹ️" },
//   warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "⚠️" },
//   error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "❌" },
//   success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "✅" },
// };

// const ToastContainer: React.FC<{
//   toasts: Toast[];
//   onDismiss: (id: number) => void;
// }> = ({ toasts, onDismiss }) => {
//   if (toasts.length === 0) return null;
//   return (
//     <div
//       style={{
//         position: "fixed",
//         top: 74,
//         right: 20,
//         zIndex: 9999,
//         display: "flex",
//         flexDirection: "column",
//         gap: 10,
//         maxWidth: 360,
//         width: "calc(100vw - 40px)",
//       }}
//     >
//       {toasts.map((t) => {
//         const c = TOAST_COLORS[t.type];
//         return (
//           <div
//             key={t.id}
//             style={{
//               background: c.bg,
//               border: `1.5px solid ${c.border}`,
//               color: c.color,
//               borderRadius: 10,
//               padding: "12px 14px",
//               display: "flex",
//               alignItems: "flex-start",
//               gap: 10,
//               boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
//               animation: "toastIn 0.25s ease",
//             }}
//           >
//             <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
//             <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.45 }}>
//               {t.message}
//             </span>
//             <button
//               onClick={() => onDismiss(t.id)}
//               style={{
//                 background: "none",
//                 border: "none",
//                 cursor: "pointer",
//                 color: "inherit",
//                 fontSize: "0.9rem",
//                 opacity: 0.6,
//                 padding: "0 2px",
//                 flexShrink: 0,
//               }}
//             >
//               ✕
//             </button>
//           </div>
//         );
//       })}
//     </div>
//   );
// };

// // ============================================================
// // PDF BLOB HOOK
// // ============================================================

// function usePdfBlobUrl(url: string | undefined): {
//   blobUrl: string | null;
//   loading: boolean;
//   error: string | null;
// } {
//   const [blobUrl, setBlobUrl] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError]     = useState<string | null>(null);

//   useEffect(() => {
//     if (!url) { setBlobUrl(null); return; }

//     let revoked = false;
//     setLoading(true);
//     setError(null);
//     setBlobUrl(null);

//     (async () => {
//       try {
//         const res = await api.get("/dashboard/pdf-proxy", {
//           params:       { url },
//           responseType: "blob",
//         });
//         if (revoked) return;
//         const blob   = new Blob([res.data], { type: "application/pdf" });
//         const objUrl = URL.createObjectURL(blob);
//         setBlobUrl(objUrl);
//       } catch (err: any) {
//         if (!revoked) setError(err?.message ?? "Failed to load PDF");
//       } finally {
//         if (!revoked) setLoading(false);
//       }
//     })();

//     return () => {
//       revoked = true;
//       setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
//     };
//   }, [url]);

//   return { blobUrl, loading, error };
// }

// // ============================================================
// // PDF VIEWER COMPONENT
// // ============================================================

// interface PdfViewerProps {
//   url: string;
//   title: string;
//   className?: string;
// }

// const PdfViewer: React.FC<PdfViewerProps> = ({
//   url,
//   title,
//   className = "multimedia-frame pdf-frame",
// }) => {
//   const { blobUrl, loading, error } = usePdfBlobUrl(url);
//   const [mobile] = useState(() => isMobileDevice());

//   if (loading)
//     return (
//       <div className="pdf-loading-state" style={loadingStyle}>
//         <div className="loader" />
//         <span className="loader-text">Loading PDF…</span>
//       </div>
//     );

//   if (error)
//     return (
//       <div style={errorWrapStyle}>
//         <span style={{ fontSize: "2rem" }}>⚠️</span>
//         <p style={{ fontWeight: 600, color: "#991b1b" }}>Could not load PDF</p>
//         <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>{error}</p>
//         {/* Always offer a direct-open link as fallback */}
//         <a
//           href={url}
//           target="_blank"
//           rel="noopener noreferrer"
//           style={openLinkStyle}
//         >
//           Open PDF in new tab ↗
//         </a>
//       </div>
//     );

//   if (!blobUrl) return null;

//   // ── MOBILE: browsers (especially iOS Safari) block iframe PDFs.
//   //    Instead render a full-screen friendly view with an open button
//   //    + an <object> fallback which works on most Android browsers.
//   if (mobile) {
//     return (
//       <div style={mobilePdfWrapStyle}>
//         {/* Primary: <object> works on Android Chrome */}
//         <object
//           data={blobUrl}
//           type="application/pdf"
//           style={{ width: "100%", height: "100%", border: "none" }}
//         >
//           {/* Fallback for iOS Safari and other blockers */}
//           <div style={mobileFallbackStyle}>
//             <span style={{ fontSize: "3rem" }}>📄</span>
//             <p style={{ fontWeight: 700, fontSize: "1rem", color: "#1a2744" }}>{title}</p>
//             <p style={{ fontSize: "0.85rem", color: "#6b7280", textAlign: "center", maxWidth: 280 }}>
//               Your browser does not support inline PDF viewing.
//               Tap the button below to open the PDF.
//             </p>
//             <a
//               href={blobUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               style={openLinkStyle}
//             >
//               Open PDF ↗
//             </a>
//             <a
//               href={blobUrl}
//               download={`${title.replace(/[^a-z0-9]/gi, "_")}.pdf`}
//               style={{ ...openLinkStyle, background: "#1a2744", color: "#fff", borderColor: "#1a2744", marginTop: 6 }}
//             >
//               ⬇ Download PDF
//             </a>
//           </div>
//         </object>
//       </div>
//     );
//   }

//   // ── DESKTOP: standard iframe ──────────────────────────────
//   return (
//     <iframe
//       src={`${blobUrl}#toolbar=1&view=FitH`}
//       title={title}
//       className={className}
//       allowFullScreen
//     />
//   );
// };

// // small style objects to keep JSX clean
// const loadingStyle: React.CSSProperties = {
//   display: "flex", flexDirection: "column", alignItems: "center",
//   justifyContent: "center", gap: 14, minHeight: 200, width: "100%",
// };
// const errorWrapStyle: React.CSSProperties = {
//   display: "flex", flexDirection: "column", alignItems: "center",
//   justifyContent: "center", gap: 12, padding: 40, textAlign: "center", width: "100%",
// };
// const mobilePdfWrapStyle: React.CSSProperties = {
//   width: "100%", height: "100%", overflow: "hidden",
//   display: "flex", flexDirection: "column",
// };
// const mobileFallbackStyle: React.CSSProperties = {
//   display: "flex", flexDirection: "column", alignItems: "center",
//   justifyContent: "center", gap: 14, padding: 40, textAlign: "center",
//   background: "#f9fafb", height: "100%", width: "100%",
// };
// const openLinkStyle: React.CSSProperties = {
//   display: "inline-flex", alignItems: "center", gap: 6,
//   padding: "10px 22px", background: "#c9a84c", color: "#1a2744",
//   borderRadius: 8, fontWeight: 700, fontSize: "0.9rem",
//   textDecoration: "none", border: "2px solid #c9a84c",
//   marginTop: 4, transition: "all 0.2s",
// };

// // ============================================================
// // MAIN COMPONENT
// // ============================================================

// const CADashboard: React.FC = () => {
//   const [selected, setSelected]       = useState<Level | null>(null);
//   const [tree, setTree]               = useState<any>({});
//   const [viewer, setViewer]           = useState<Viewer | null>(null);
//   const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
//   const [treeLoading, setTreeLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isAdmin, setIsAdmin]         = useState(false);

//   const [videoJobs, setVideoJobs]     = useState<Record<string, VideoJob>>({});
//   const videoJobsRef                  = useRef<Record<string, VideoJob>>({});
//   videoJobsRef.current                = videoJobs;

//   const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

//   const [smartUploads, setSmartUploads] = useState<Record<string, SmartUpload>>({});
//   const smartPdfRefs = useRef<Record<string, HTMLInputElement | null>>({});

//   // ── Toast ────────────────────────────────────────────────
//   const { toasts, showToast, dismissToast } = useToast();

//   // ============================================================
//   // CLEANUP
//   // ============================================================
//   useEffect(() => {
//     return () => { Object.values(pollTimers.current).forEach(clearInterval); };
//   }, []);

//   // ============================================================
//   // LOAD
//   // ============================================================
//   useEffect(() => {
//     checkAdminStatus();
//     loadDashboardTree();
//   }, []);

//   const checkAdminStatus = async () => {
//     try {
//       const res = await api.get("/auth/me");
//       setIsAdmin(res.data.role === "admin");
//     } catch {
//       setIsAdmin(false);
//     }
//   };

//   const loadDashboardTree = () => {
//     api
//       .get("/dashboard/tree")
//       .then((res) => setTree(res.data))
//       .catch((err) => console.error(err))
//       .finally(() => setTreeLoading(false));
//   };

//   // ============================================================
//   // TREE PATCH HELPER
//   // ============================================================
//   const patchTreeItem = useCallback(
//     (dashboardId: string, patch: Partial<PDFItem>) => {
//       setTree((prev: any) => {
//         const next = JSON.parse(JSON.stringify(prev));
//         for (const level in next) {
//           for (const subject in next[level]) {
//             for (const mod in next[level][subject]) {
//               for (const chapter in next[level][subject][mod]) {
//                 const items: PDFItem[] = next[level][subject][mod][chapter];
//                 const idx = items.findIndex((it) => it._id === dashboardId);
//                 if (idx !== -1) {
//                   items[idx] = { ...items[idx], ...patch };
//                   return next;
//                 }
//               }
//             }
//           }
//         }
//         return prev;
//       });
//       setViewer((v) =>
//         v && v.item._id === dashboardId ? { ...v, item: { ...v.item, ...patch } } : v
//       );
//     },
//     []
//   );

//   // ============================================================
//   // POLLING
//   // ============================================================
//   const startPolling = useCallback(
//     (dashboardId: string, _jobId: string) => {
//       if (pollTimers.current[dashboardId]) clearInterval(pollTimers.current[dashboardId]);

//       const startedAt = Date.now();

//       const timer = setInterval(async () => {
//         if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
//           clearInterval(pollTimers.current[dashboardId]);
//           delete pollTimers.current[dashboardId];
//           setVideoJobs((prev) => ({
//             ...prev,
//             [dashboardId]: { ...prev[dashboardId], status: "timeout", message: "Timed out after 15 min." },
//           }));
//           patchTreeItem(dashboardId, { status: "failed" });
//           return;
//         }

//         try {
//           const res = await api.get(`/dashboard/item/${dashboardId}`);
//           const item: PDFItem = res.data;

//           if (item.video_url && (item.status === "completed" || !item.status)) {
//             clearInterval(pollTimers.current[dashboardId]);
//             delete pollTimers.current[dashboardId];
//             patchTreeItem(dashboardId, {
//               video_url:          item.video_url,
//               audio_url:          item.audio_url,
//               simplified_pdf_url: item.simplified_pdf_url,
//               status:             "completed",
//               video_created_at:   item.video_created_at,
//             });
//             setVideoJobs((prev) => ({
//               ...prev,
//               [dashboardId]: { ...prev[dashboardId], status: "completed", message: "Video ready!" },
//             }));
//             showToast("🎬 Video is ready!", "success");
//           } else if (item.status === "failed") {
//             clearInterval(pollTimers.current[dashboardId]);
//             delete pollTimers.current[dashboardId];
//             setVideoJobs((prev) => ({
//               ...prev,
//               [dashboardId]: { ...prev[dashboardId], status: "failed", message: "Video generation failed." },
//             }));
//             patchTreeItem(dashboardId, { status: "failed" });
//           }
//         } catch (err) {
//           console.warn("[poll] Error:", err);
//         }
//       }, POLL_INTERVAL_MS);

//       pollTimers.current[dashboardId] = timer;
//     },
//     [patchTreeItem, showToast]
//   );

//   // ============================================================
//   // CREATE VIDEO — GUARD: Smart PDF must exist first
//   // ============================================================
//   const handleCreateVideo = async (item: PDFItem) => {
//     const dashboardId = item._id;

//     // ── TASK 1: block if no smart PDF ───────────────────────
//     if (!item.simplified_pdf_url) {
//       showToast(
//         "Please upload a Smart PDF first before creating a video.",
//         "warning",
//         5000
//       );
//       return;
//     }

//     if (videoJobs[dashboardId]?.status === "polling") return;

//     patchTreeItem(dashboardId, { status: "processing" });
//     setVideoJobs((prev) => ({
//       ...prev,
//       [dashboardId]: {
//         jobId: "", dashboardId, startedAt: Date.now(),
//         status: "polling", message: "Submitting job…",
//       },
//     }));

//     try {
//       const payload = {
//         pdf_s3_url:   item.pdf_url,
//         dashboard_id: dashboardId,
//         platform:     "ca",
//         use_gemini:   true,
//         use_openai:   true,
//       };

//       const res = await fetch(`${VIDEO_API_BASE}/api/process`, {
//         method:  "POST",
//         headers: { "Content-Type": "application/json" },
//         body:    JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const errText = await res.text();
//         throw new Error(`Video API returned ${res.status}: ${errText}`);
//       }

//       const data: { job_id: string; dashboard_id: string; status: string; message: string } =
//         await res.json();

//       setVideoJobs((prev) => ({
//         ...prev,
//         [dashboardId]: {
//           jobId:     data.job_id,
//           dashboardId,
//           startedAt: Date.now(),
//           status:    "polling",
//           message:   data.message || "Processing…",
//         },
//       }));

//       startPolling(dashboardId, data.job_id);
//     } catch (err: any) {
//       console.error("[video] Job submission failed:", err);
//       setVideoJobs((prev) => ({
//         ...prev,
//         [dashboardId]: {
//           ...(prev[dashboardId] ?? { jobId: "", dashboardId, startedAt: Date.now() }),
//           status:  "failed",
//           message: err?.message ?? "Submission failed. Try again.",
//         },
//       }));
//       patchTreeItem(dashboardId, { status: "failed" });
//       showToast("Video job submission failed. Please try again.", "error");

//       setTimeout(() => {
//         setVideoJobs((prev) => {
//           const next = { ...prev };
//           delete next[dashboardId];
//           return next;
//         });
//         patchTreeItem(dashboardId, { status: undefined });
//       }, 5000);
//     }
//   };

//   // ============================================================
//   // SMART PDF UPLOAD
//   // ============================================================
//   const handleSmartPdfSelect = async (
//     e: React.ChangeEvent<HTMLInputElement>,
//     item: PDFItem,
//   ) => {
//     const file = e.target.files?.[0];
//     if (e.target) e.target.value = "";
//     if (!file) return;

//     if (!file.name.toLowerCase().endsWith(".pdf")) {
//       alert("Only PDF files are accepted for Smart PDF upload.");
//       return;
//     }

//     const id = item._id;
//     setSmartUploads((prev) => ({ ...prev, [id]: { status: "uploading", message: "Uploading…" } }));

//     try {
//       const fd = new FormData();
//       fd.append("file", file);

//       const res = await api.post(
//         `/admin/materials/${id}/upload_smart_pdf`,
//         fd,
//         { headers: { "Content-Type": "multipart/form-data" } },
//       );

//       const { simplified_pdf_url } = res.data as { simplified_pdf_url: string };
//       patchTreeItem(id, { simplified_pdf_url });

//       setSmartUploads((prev) => ({
//         ...prev,
//         [id]: { status: "success", message: "Smart PDF saved!" },
//       }));
//       showToast("🧠 Smart PDF uploaded successfully!", "success");

//       setTimeout(() => {
//         setSmartUploads((prev) => ({ ...prev, [id]: { status: "idle" } }));
//       }, 4000);
//     } catch (err: any) {
//       const detail = err?.response?.data?.detail ?? "Upload failed. Please try again.";
//       setSmartUploads((prev) => ({ ...prev, [id]: { status: "error", message: detail } }));
//       showToast(`Smart PDF upload failed: ${detail}`, "error");
//       setTimeout(() => {
//         setSmartUploads((prev) => ({ ...prev, [id]: { status: "idle" } }));
//       }, 4000);
//     }
//   };

//   // ============================================================
//   // NAVIGATION HELPERS
//   // ============================================================
//   const toggleModule = (key: string) =>
//     setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));

//   const expandAll = () => {
//     if (!selected || !tree[selected]) return;
//     const keys: Record<string, boolean> = {};
//     Object.keys(tree[selected]).forEach((subject) => {
//       Object.keys(tree[selected][subject]).forEach((mod) => {
//         keys[`${subject}-${mod}`] = true;
//       });
//     });
//     setOpenModules(keys);
//   };

//   const collapseAll = () => setOpenModules({});

//   const goBack = () => {
//     setSelected(null);
//     setSearchQuery("");
//     setOpenModules({});
//   };

//   const openViewer = (item: PDFItem, type: ViewerType = "pdf") =>
//     setViewer({ type, item });

//   const closeViewer = () => setViewer(null);

//   const handleDownloadAudio = async (item: PDFItem) => {
//     if (!item.audio_url) return;
//     try {
//       const res = await api.get("/dashboard/audio-proxy", {
//         params: { url: item.audio_url }, responseType: "blob",
//       });
//       const blob     = new Blob([res.data], { type: "audio/mpeg" });
//       const objUrl   = URL.createObjectURL(blob);
//       const anchor   = document.createElement("a");
//       const filename = item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_audio.mp3";
//       anchor.href = objUrl; anchor.download = filename;
//       document.body.appendChild(anchor); anchor.click();
//       document.body.removeChild(anchor); URL.revokeObjectURL(objUrl);
//     } catch (err: any) {
//       console.error("[download audio]", err);
//       alert("Could not download audio. Please try again.");
//     }
//   };

//   const getFilteredChapters = (subject: string, module: string) => {
//     const chapters = tree[selected!]?.[subject]?.[module] ?? {};
//     if (!searchQuery.trim()) return chapters;
//     const q = searchQuery.toLowerCase();
//     const filtered: Record<string, any[]> = {};
//     Object.entries(chapters).forEach(([ch, items]: [string, any]) => {
//       const matched = items.filter(
//         (it: any) =>
//           it.title?.toLowerCase().includes(q) ||
//           ch.toLowerCase().includes(q) ||
//           it.unit?.toLowerCase().includes(q)
//       );
//       if (matched.length > 0) filtered[ch] = matched;
//     });
//     return filtered;
//   };

//   const countLevelPdfs = (lvl: string) => {
//     if (!tree[lvl]) return 0;
//     let count = 0;
//     Object.values(tree[lvl]).forEach((subjects: any) =>
//       Object.values(subjects).forEach((modules: any) =>
//         Object.values(modules).forEach((items: any) => { count += items.length; })
//       )
//     );
//     return count;
//   };

//   // ============================================================
//   // VIDEO BUTTON RENDERER
//   // ============================================================
//   const renderVideoButton = (item: PDFItem) => {
//     const dashboardId = item._id;
//     const job         = videoJobs[dashboardId];
//     const hasVideo    = !!item.video_url || job?.status === "completed";

//     if (hasVideo) {
//       return (
//         <>
//           <button
//             className="resource-action-btn resource-action-video resource-action-watch"
//             onClick={() => openViewer(item, "video")}
//             title="Watch generated video lecture"
//           >
//             ▶ Watch Video
//           </button>
//           {isAdmin && (
//             <button
//               className="resource-action-btn resource-action-recreate-video"
//               onClick={() => handleCreateVideo(item)}
//               title="Regenerate AI video lecture (Admin only)"
//             >
//               🔄 Recreate Video
//             </button>
//           )}
//         </>
//       );
//     }

//     if (job?.status === "polling" || item.status === "processing") {
//       return (
//         <button
//           className="resource-action-btn resource-action-create-video loading"
//           disabled
//           title={job?.message ?? "Generating video…"}
//         >
//           <span className="spinner-mini" />
//           {job?.message ?? "Processing…"}
//         </button>
//       );
//     }

//     if (job?.status === "failed" || job?.status === "timeout") {
//       return (
//         <button
//           className="resource-action-btn resource-action-create-video resource-action-failed"
//           onClick={() => handleCreateVideo(item)}
//           title={job?.message ?? "Failed — click to retry"}
//         >
//           ⚠ Retry Video
//         </button>
//       );
//     }

//     // ── Admin: show Create Video button (will be blocked by guard if no Smart PDF) ──
//     if (isAdmin && !item.video_url) {
//       const hasSmartPdf = !!item.simplified_pdf_url;
//       return (
//         <button
//           className="resource-action-btn resource-action-create-video"
//           onClick={() => handleCreateVideo(item)}
//           title={
//             hasSmartPdf
//               ? "Generate AI video lecture (Admin only)"
//               : "Upload Smart PDF first to enable video creation"
//           }
//           style={
//             !hasSmartPdf
//               ? { opacity: 0.55, cursor: "not-allowed", filter: "grayscale(0.4)" }
//               : undefined
//           }
//         >
//           {hasSmartPdf ? "🤖 Create Video" : "🔒 Create Video"}
//         </button>
//       );
//     }

//     return null;
//   };

//   // ============================================================
//   // SMART PDF UPLOAD BUTTON RENDERER
//   // ============================================================
//   const renderSmartPdfUploadButton = (item: PDFItem) => {
//     if (!isAdmin) return null;

//     const id  = item._id;
//     const job = smartUploads[id] ?? { status: "idle" };

//     const label =
//       job.status === "uploading" ? "⏫ Uploading…"        :
//       job.status === "success"   ? "✅ Saved!"             :
//       job.status === "error"     ? "❌ Retry"              :
//       item.simplified_pdf_url    ? "🧠 Replace Smart PDF" :
//                                    "🧠 Upload Smart PDF";

//     const titleText =
//       job.status === "uploading" ? "Uploading Smart PDF to S3…"                      :
//       job.status === "error"     ? (job.message ?? "Upload failed — click to retry") :
//       item.simplified_pdf_url    ? "Smart PDF exists — click to replace"             :
//                                    "Upload a simplified PDF for students (Admin only)";

//     return (
//       <>
//         <input
//           ref={(el) => { smartPdfRefs.current[id] = el; }}
//           type="file"
//           accept=".pdf,application/pdf"
//           style={{ display: "none" }}
//           onChange={(e) => handleSmartPdfSelect(e, item)}
//         />
//         <button
//           className="resource-action-btn resource-action-smart-pdf-upload"
//           disabled={job.status === "uploading"}
//           title={titleText}
//           onClick={() => smartPdfRefs.current[id]?.click()}
//           style={{
//             opacity:     job.status === "uploading" ? 0.65 : 1,
//             cursor:      job.status === "uploading" ? "not-allowed" : "pointer",
//             background:
//               job.status === "success" ? "rgba(16,185,129,0.15)" :
//               job.status === "error"   ? "rgba(239,68,68,0.12)"  :
//               item.simplified_pdf_url  ? "rgba(16,185,129,0.08)" :
//                                          "rgba(139,92,246,0.12)",
//             borderColor:
//               job.status === "success" ? "rgba(16,185,129,0.5)"  :
//               job.status === "error"   ? "rgba(239,68,68,0.5)"   :
//               item.simplified_pdf_url  ? "rgba(16,185,129,0.35)" :
//                                          "rgba(139,92,246,0.4)",
//             color:
//               job.status === "success" ? "#10b981" :
//               job.status === "error"   ? "#ef4444"  :
//               item.simplified_pdf_url  ? "#10b981"  :
//                                          "#a78bfa",
//           }}
//         >
//           {label}
//         </button>
//       </>
//     );
//   };

//   // ============================================================
//   // RENDER
//   // ============================================================
//   return (
//     <div className="ca-dashboard">

//       {/* ── TOAST CONTAINER ── */}
//       <ToastContainer toasts={toasts} onDismiss={dismissToast} />

//       {/* ── HEADER ── */}
//       <div className="ca-header">
//         <div className="ca-header-inner">
//           <div>
//             <h1>CA Study Dashboard</h1>
//             <p>Explore curated modules, ICAI PDFs &amp; video lectures</p>
//           </div>
//           {selected && (
//             <div className="ca-search-wrap">
//               <span className="ca-search-icon">🔍</span>
//               <input
//                 className="ca-search-input"
//                 type="search"
//                 placeholder="Search chapters, units or topics…"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//               />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── LEVEL SELECTOR ── */}
//       {!selected && (
//         <div className="level-selector-section">
//           <p className="level-selector-hint">Select your CA level to begin</p>

//           {treeLoading ? (
//             <div className="app-full-center" style={{ marginTop: 60 }}>
//               <div className="loader" />
//               <span className="loader-text">Loading study materials…</span>
//             </div>
//           ) : (
//             <div className="level-cards-grid">
//               {(["Foundation", "Intermediate", "Final", "Self Paced", "Others"] as Level[]).map((lvl) => {
//                 const meta         = LEVEL_META[lvl];
//                 const subjectCount = tree[lvl] ? Object.keys(tree[lvl]).length : 0;
//                 const pdfCount     = countLevelPdfs(lvl);
//                 return (
//                   <button
//                     key={lvl}
//                     className="level-card"
//                     onClick={() => setSelected(lvl)}
//                     aria-label={`Select ${lvl} level`}
//                   >
//                     <span className="level-card-icon">{meta.icon}</span>
//                     <span className="level-card-name">{lvl}</span>
//                     <span className="level-card-desc">{meta.desc}</span>
//                     {subjectCount > 0 ? (
//                       <div className="level-card-stats">
//                         <span className="level-card-badge">{subjectCount} subjects</span>
//                         <span className="level-card-badge level-card-badge-pdf">{pdfCount} PDFs</span>
//                       </div>
//                     ) : (
//                       <span className="level-card-empty">No content yet</span>
//                     )}
//                     <span className="level-card-arrow">→</span>
//                   </button>
//                 );
//               })}
//             </div>
//           )}

//           {!treeLoading && (
//             <div className="dashboard-stats">
//               {(["Foundation", "Intermediate", "Final", "Self Paced", "Others"] as Level[]).map((lvl) => {
//                 const pdfCount = countLevelPdfs(lvl);
//                 if (!pdfCount) return null;
//                 return (
//                   <div className="dash-stat" key={lvl}>
//                     <span className="dash-stat-num">{pdfCount}</span>
//                     <span className="dash-stat-label">{lvl} PDFs</span>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── LEVEL CONTENT ── */}
//       {selected && (
//         <div className="level-content">
//           <div className="level-toolbar">
//             <button className="back-btn" onClick={goBack}>← All Levels</button>
//             <div className="level-toolbar-meta">
//               <span className="level-toolbar-icon">{LEVEL_META[selected].icon}</span>
//               <h2 className="level-toolbar-title">{selected}</h2>
//             </div>
//             <div className="level-toolbar-actions">
//               <button className="toolbar-btn" onClick={expandAll}>Expand All</button>
//               <button className="toolbar-btn" onClick={collapseAll}>Collapse</button>
//             </div>
//           </div>

//           {!tree[selected] || Object.keys(tree[selected]).length === 0 ? (
//             <div className="ca-empty-state">
//               <span className="ca-empty-icon">📭</span>
//               <p>No content available for <strong>{selected}</strong> yet.</p>
//               <p className="ca-empty-hint">Ask your admin to upload PDFs for this level.</p>
//             </div>
//           ) : (
//             <div className="premium-tree">
//               {sortKeys(Object.keys(tree[selected])).map((subject) => (
//                 <div key={subject} className="subject-card">
//                   <div className="subject-card-header">
//                     <h3>{subject}</h3>
//                     <span className="subject-module-count">
//                       {Object.keys(tree[selected][subject]).length} modules
//                     </span>
//                   </div>

//                   {sortKeys(Object.keys(tree[selected][subject])).map((module) => {
//                     const moduleKey        = `${subject}-${module}`;
//                     const isOpen           = openModules[moduleKey];
//                     const filteredChapters = getFilteredChapters(subject, module);
//                     const chapterKeys      = sortKeys(Object.keys(filteredChapters));

//                     if (searchQuery && chapterKeys.length === 0) return null;

//                     return (
//                       <div key={module} className="module-block">
//                         <button
//                           className="module-toggle"
//                           onClick={() => toggleModule(moduleKey)}
//                           aria-expanded={isOpen}
//                         >
//                           <span className="module-toggle-text">
//                             <span className="module-toggle-arrow">{isOpen ? "▾" : "▸"}</span>
//                             {module}
//                           </span>
//                           <span className="module-toggle-count">{chapterKeys.length} ch.</span>
//                         </button>

//                         {isOpen && (
//                           <div className="module-chapters">
//                             {chapterKeys.map((chapter) => (
//                               <div key={chapter} className="chapter-block">
//                                 <div className="chapter-header">
//                                   <span className="chapter-dot" />
//                                   <h4>{chapter}</h4>
//                                 </div>

//                                 <div className="resource-list">
//                                   {filteredChapters[chapter].map((item: PDFItem) => (
//                                     <div key={item._id} className="resource-item">
//                                       {item.unit && (
//                                         <div className="resource-unit-label">📎 {item.unit}</div>
//                                       )}

//                                       <button
//                                         className="pdf-btn"
//                                         onClick={() => openViewer(item, "pdf")}
//                                         title={`Open: ${item.title}`}
//                                       >
//                                         <span className="pdf-btn-icon">📄</span>
//                                         <span className="pdf-btn-text">{item.title}</span>
//                                       </button>

//                                       <div className="resource-actions">
//                                         <button
//                                           className="resource-action-btn resource-action-read"
//                                           onClick={() => openViewer(item, "pdf")}
//                                           title="Read PDF"
//                                         >
//                                           📖 Read
//                                         </button>

//                                         {item.simplified_pdf_url && (
//                                           <button
//                                             className="resource-action-btn resource-action-smart-pdf"
//                                             onClick={() => openViewer(item, "smart_pdf")}
//                                             title="View AI-enhanced Smart PDF"
//                                           >
//                                             🧠 Smart PDF
//                                           </button>
//                                         )}

//                                         {renderVideoButton(item)}

//                                         {item.audio_url && (
//                                           <button
//                                             className="resource-action-btn resource-action-audio"
//                                             onClick={() => openViewer(item, "audio")}
//                                             title="Listen to audio explanation"
//                                           >
//                                             🎵 Audio
//                                           </button>
//                                         )}

//                                         <button
//                                           className="resource-action-btn resource-action-chat"
//                                           onClick={() => (window as any).goChat?.()}
//                                           title="Ask AI about this topic"
//                                         >
//                                           💬 Ask AI
//                                         </button>

//                                         {renderSmartPdfUploadButton(item)}
//                                       </div>

//                                       {/* Status messages */}
//                                       {smartUploads[item._id]?.status === "uploading" && (
//                                         <div className="video-job-status" style={{ color: "#a78bfa" }}>
//                                           <span className="spinner-mini" />
//                                           <span>Uploading Smart PDF…</span>
//                                         </div>
//                                       )}
//                                       {smartUploads[item._id]?.status === "error" && (
//                                         <div className="video-job-status" style={{ color: "#ef4444" }}>
//                                           ⚠ {smartUploads[item._id].message}
//                                         </div>
//                                       )}
//                                       {videoJobs[item._id]?.status === "polling" && (
//                                         <div className="video-job-status">
//                                           <span className="spinner-mini" />
//                                           <span>{videoJobs[item._id].message ?? "Generating video…"}</span>
//                                           <span className="video-job-elapsed">
//                                             {Math.floor((Date.now() - videoJobs[item._id].startedAt) / 1000)}s
//                                           </span>
//                                         </div>
//                                       )}
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── VIEWER MODAL ── */}
//       {viewer && (
//         <div
//           className="multimedia-modal"
//           role="dialog"
//           aria-modal="true"
//           aria-label={viewer.item.title}
//           onClick={(e) => { if (e.target === e.currentTarget) closeViewer(); }}
//         >
//           <div className="multimedia-container">
//             <div className="multimedia-header">
//               <div className="multimedia-header-info">
//                 <button className="multimedia-back-btn" onClick={closeViewer} aria-label="Go back">
//                   ← Back
//                 </button>
//                 <span className="multimedia-header-icon">
//                   {viewer.type === "pdf"       && "📄"}
//                   {viewer.type === "smart_pdf" && "🧠"}
//                   {viewer.type === "video"     && "🎬"}
//                   {viewer.type === "audio"     && "🎵"}
//                 </span>
//                 <div>
//                   <h3 className="multimedia-header-title">{viewer.item.title}</h3>
//                   {viewer.item.chapter && (
//                     <span className="multimedia-header-sub">{viewer.item.chapter}</span>
//                   )}
//                   {viewer.item.unit && (
//                     <span className="multimedia-header-unit">📎 {viewer.item.unit}</span>
//                   )}
//                 </div>
//               </div>

//               <div className="multimedia-header-actions">
//                 {viewer.item.pdf_url && viewer.type !== "pdf" && (
//                   <button
//                     className="resource-action-btn resource-action-read"
//                     onClick={() => setViewer((v) => v ? { ...v, type: "pdf" } : null)}
//                   >
//                     📖 Read PDF
//                   </button>
//                 )}
//                 {viewer.item.simplified_pdf_url && viewer.type !== "smart_pdf" && (
//                   <button
//                     className="resource-action-btn resource-action-smart-pdf"
//                     onClick={() => setViewer((v) => v ? { ...v, type: "smart_pdf" } : null)}
//                   >
//                     🧠 Smart PDF
//                   </button>
//                 )}
//                 {viewer.item.video_url && viewer.type !== "video" && (
//                   <button
//                     className="resource-action-btn resource-action-video"
//                     onClick={() => setViewer((v) => v ? { ...v, type: "video" } : null)}
//                   >
//                     🎬 Watch Video
//                   </button>
//                 )}
//                 {viewer.item.audio_url && viewer.type !== "audio" && (
//                   <button
//                     className="resource-action-btn resource-action-audio"
//                     onClick={() => setViewer((v) => v ? { ...v, type: "audio" } : null)}
//                   >
//                     🎵 Audio
//                   </button>
//                 )}
//                 <button
//                   className="resource-action-btn resource-action-chat"
//                   onClick={() => { closeViewer(); (window as any).goChat?.(); }}
//                 >
//                   💬 Chat
//                 </button>
//                 <button className="multimedia-close-btn" onClick={closeViewer} aria-label="Close">
//                   ✕
//                 </button>
//               </div>
//             </div>

//             <div className="multimedia-content">
//               {/* PDF */}
//               {viewer.type === "pdf" && (
//                 <PdfViewer url={viewer.item.pdf_url} title={viewer.item.title} />
//               )}

//               {/* Smart PDF */}
//               {viewer.type === "smart_pdf" && viewer.item.simplified_pdf_url && (
//                 <PdfViewer
//                   url={viewer.item.simplified_pdf_url}
//                   title={`Smart PDF – ${viewer.item.title}`}
//                 />
//               )}

//               {/* Video */}
//               {viewer.type === "video" && viewer.item.video_url && (
//                 <video
//                   controls
//                   autoPlay
//                   className="multimedia-frame video-frame"
//                   controlsList="nodownload"
//                   key={viewer.item.video_url}
//                   playsInline          // ← important for iOS
//                 >
//                   <source src={viewer.item.video_url} type="video/mp4" />
//                   Your browser does not support the video tag.
//                 </video>
//               )}

//               {/* Audio */}
//               {viewer.type === "audio" && viewer.item.audio_url && (
//                 <div className="audio-player-container">
//                   <audio
//                     controls
//                     autoPlay
//                     className="audio-player"
//                     controlsList="nodownload"
//                     key={viewer.item.audio_url}
//                     playsInline          // ← important for iOS
//                   >
//                     <source src={viewer.item.audio_url} type="audio/mpeg" />
//                     Your browser does not support the audio element.
//                   </audio>
//                   <div className="audio-player-info">
//                     <h4>{viewer.item.title}</h4>
//                     <p>Now listening to audio lecture</p>
//                   </div>
//                   <button
//                     className="resource-action-btn resource-action-download-audio"
//                     onClick={() => handleDownloadAudio(viewer.item)}
//                     title="Download audio as MP3"
//                   >
//                     ⬇ Download MP3
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CADashboard;



import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "./api";
import "./App.css";

type Level = "Foundation" | "Intermediate" | "Final" | "Self Paced" | "Others";

const DEFAULT_VIDEO_URL = "https://youtu.be/76UUB7Vv8s8?si=7NlDSfqlON-SVpIi";

const VIDEO_API_BASE = (import.meta as any).env?.VITE_VIDEO_API_URL ?? "http://127.0.0.1:8081";
const POLL_INTERVAL_MS = 20000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

const LEVEL_META: Record<Level, { icon: string; desc: string; color: string }> = {
  Foundation:   { icon: "🌱", desc: "Core concepts & basics",  color: "#0d7a4e" },
  Intermediate: { icon: "📊", desc: "In-depth applied study",  color: "#b45309" },
  Final:        { icon: "🏆", desc: "Advanced & strategic",    color: "#1a2744" },
  "Self Paced": { icon: "🎯", desc: "Learn at your own pace",  color: "#0e7490" },
  Others:       { icon: "📁", desc: "Reference & extras",      color: "#6b46c1" }
};

// Maps user profile ca_level values → dashboard Level labels
// Must stay in sync with DASHBOARD_LEVEL_MAP in main.py
const CA_LEVEL_MAP: Record<string, Level> = {
  Foundation:   "Foundation",
  Intermediate: "Intermediate",
  Inter:        "Intermediate",   // alternate spelling
  Final:        "Final",
};

// These levels are always visible to every student regardless of ca_level
const ALWAYS_VISIBLE_LEVELS = new Set<Level>(["Self Paced", "Others"]);

// ============================================================
// TYPES
// ============================================================

interface PDFItem {
  _id: string;
  title: string;
  pdf_url: string;
  chapter?: string;
  unit?: string;
  video_url?: string;
  audio_url?: string;
  simplified_pdf_url?: string;
  video_created_at?: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

type ViewerType = "pdf" | "video" | "audio" | "smart_pdf";

interface Viewer {
  type: ViewerType;
  item: PDFItem;
}

interface VideoJob {
  jobId: string;
  dashboardId: string;
  startedAt: number;
  status: "polling" | "completed" | "failed" | "timeout";
  message?: string;
}

interface SmartUpload {
  status: "idle" | "uploading" | "success" | "error";
  message?: string;
}

// ── NEW: simple toast ──────────────────────────────────────
interface Toast {
  id: number;
  message: string;
  type: "info" | "warning" | "error" | "success";
}

// ============================================================
// HELPERS
// ============================================================

function getNum(s: string): number {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0]) : 999;
}

function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const diff = getNum(a) - getNum(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

// ── Detect mobile (narrow viewport or touch) ─────────────────
function isMobileDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
  );
}

// ============================================================
// TOAST HOOK
// ============================================================

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "info", duration = 4000) => {
      const id = ++counterRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

// ============================================================
// TOAST RENDERER
// ============================================================

const TOAST_COLORS: Record<Toast["type"], { bg: string; border: string; color: string; icon: string }> = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "ℹ️" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "⚠️" },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "❌" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "✅" },
};

const ToastContainer: React.FC<{
  toasts: Toast[];
  onDismiss: (id: number) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 74,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 360,
        width: "calc(100vw - 40px)",
      }}
    >
      {toasts.map((t) => {
        const c = TOAST_COLORS[t.type];
        return (
          <div
            key={t.id}
            style={{
              background: c.bg,
              border: `1.5px solid ${c.border}`,
              color: c.color,
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              animation: "toastIn 0.25s ease",
            }}
          >
            <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
            <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.45 }}>
              {t.message}
            </span>
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontSize: "0.9rem",
                opacity: 0.6,
                padding: "0 2px",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// PDF BLOB HOOK
// ============================================================

function usePdfBlobUrl(url: string | undefined): {
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
} {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!url) { setBlobUrl(null); return; }

    let revoked = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    (async () => {
      try {
        const res = await api.get("/dashboard/pdf-proxy", {
          params:       { url },
          responseType: "blob",
        });
        if (revoked) return;
        const blob   = new Blob([res.data], { type: "application/pdf" });
        const objUrl = URL.createObjectURL(blob);
        setBlobUrl(objUrl);
      } catch (err: any) {
        if (!revoked) setError(err?.message ?? "Failed to load PDF");
      } finally {
        if (!revoked) setLoading(false);
      }
    })();

    return () => {
      revoked = true;
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [url]);

  return { blobUrl, loading, error };
}

// ============================================================
// PDF VIEWER COMPONENT
// ============================================================

interface PdfViewerProps {
  url: string;
  title: string;
  className?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  title,
  className = "multimedia-frame pdf-frame",
}) => {
  const { blobUrl, loading, error } = usePdfBlobUrl(url);
  const [mobile] = useState(() => isMobileDevice());

  if (loading)
    return (
      <div className="pdf-loading-state" style={loadingStyle}>
        <div className="loader" />
        <span className="loader-text">Loading PDF…</span>
      </div>
    );

  if (error)
    return (
      <div style={errorWrapStyle}>
        <span style={{ fontSize: "2rem" }}>⚠️</span>
        <p style={{ fontWeight: 600, color: "#991b1b" }}>Could not load PDF</p>
        <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>{error}</p>
        {/* Always offer a direct-open link as fallback */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={openLinkStyle}
        >
          Open PDF in new tab ↗
        </a>
      </div>
    );

  if (!blobUrl) return null;

  // ── MOBILE: browsers (especially iOS Safari) block iframe PDFs.
  //    Instead render a full-screen friendly view with an open button
  //    + an <object> fallback which works on most Android browsers.
  if (mobile) {
    return (
      <div style={mobilePdfWrapStyle}>
        {/* Primary: <object> works on Android Chrome */}
        <object
          data={blobUrl}
          type="application/pdf"
          style={{ width: "100%", height: "100%", border: "none" }}
        >
          {/* Fallback for iOS Safari and other blockers */}
          <div style={mobileFallbackStyle}>
            <span style={{ fontSize: "3rem" }}>📄</span>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "#1a2744" }}>{title}</p>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", textAlign: "center", maxWidth: 280 }}>
              Your browser does not support inline PDF viewing.
              Tap the button below to open the PDF.
            </p>
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={openLinkStyle}
            >
              Open PDF ↗
            </a>
            <a
              href={blobUrl}
              download={`${title.replace(/[^a-z0-9]/gi, "_")}.pdf`}
              style={{ ...openLinkStyle, background: "#1a2744", color: "#fff", borderColor: "#1a2744", marginTop: 6 }}
            >
              ⬇ Download PDF
            </a>
          </div>
        </object>
      </div>
    );
  }

  // ── DESKTOP: standard iframe ──────────────────────────────
  return (
    <iframe
      src={`${blobUrl}#toolbar=1&view=FitH`}
      title={title}
      className={className}
      allowFullScreen
    />
  );
};

// small style objects to keep JSX clean
const loadingStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: 14, minHeight: 200, width: "100%",
};
const errorWrapStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: 12, padding: 40, textAlign: "center", width: "100%",
};
const mobilePdfWrapStyle: React.CSSProperties = {
  width: "100%", height: "100%", overflow: "hidden",
  display: "flex", flexDirection: "column",
};
const mobileFallbackStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: 14, padding: 40, textAlign: "center",
  background: "#f9fafb", height: "100%", width: "100%",
};
const openLinkStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "10px 22px", background: "#c9a84c", color: "#1a2744",
  borderRadius: 8, fontWeight: 700, fontSize: "0.9rem",
  textDecoration: "none", border: "2px solid #c9a84c",
  marginTop: 4, transition: "all 0.2s",
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const CADashboard: React.FC = () => {
  const [selected, setSelected]       = useState<Level | null>(null);
  const [tree, setTree]               = useState<any>({});
  const [viewer, setViewer]           = useState<Viewer | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [treeLoading, setTreeLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin]         = useState(false);
  // ── NEW: store the logged-in user's ca_level for level-card filtering ──────
  const [userCaLevel, setUserCaLevel] = useState<string | null>(null);

  const [videoJobs, setVideoJobs]     = useState<Record<string, VideoJob>>({});
  const videoJobsRef                  = useRef<Record<string, VideoJob>>({});
  videoJobsRef.current                = videoJobs;

  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const [smartUploads, setSmartUploads] = useState<Record<string, SmartUpload>>({});
  const smartPdfRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Toast ────────────────────────────────────────────────
  const { toasts, showToast, dismissToast } = useToast();

  // ============================================================
  // CLEANUP
  // ============================================================
  useEffect(() => {
    return () => { Object.values(pollTimers.current).forEach(clearInterval); };
  }, []);

  // ============================================================
  // LOAD
  // ============================================================
  useEffect(() => {
    checkAdminStatus();
    loadDashboardTree();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const res = await api.get("/auth/me");
      setIsAdmin(res.data.role === "admin");
      // ── Store ca_level so we can filter level cards for students ──────────
      setUserCaLevel(res.data.ca_level ?? null);
    } catch {
      setIsAdmin(false);
    }
  };

  const loadDashboardTree = () => {
    api
      .get("/dashboard/tree")
      .then((res) => setTree(res.data))
      .catch((err) => console.error(err))
      .finally(() => setTreeLoading(false));
  };

  // ============================================================
  // LEVEL VISIBILITY HELPER
  // ── Admins see all 5 levels.
  // ── Students see only their own level + Self Paced + Others.
  // ============================================================
  const isLevelVisible = useCallback(
    (lvl: Level): boolean => {
      if (isAdmin) return true;
      if (ALWAYS_VISIBLE_LEVELS.has(lvl)) return true;
      if (!userCaLevel) return true; // profile not loaded yet — show all temporarily
      const mappedLevel = CA_LEVEL_MAP[userCaLevel] ?? (userCaLevel as Level);
      return lvl === mappedLevel;
    },
    [isAdmin, userCaLevel]
  );

  // ============================================================
  // TREE PATCH HELPER
  // ============================================================
  const patchTreeItem = useCallback(
    (dashboardId: string, patch: Partial<PDFItem>) => {
      setTree((prev: any) => {
        const next = JSON.parse(JSON.stringify(prev));
        for (const level in next) {
          for (const subject in next[level]) {
            for (const mod in next[level][subject]) {
              for (const chapter in next[level][subject][mod]) {
                const items: PDFItem[] = next[level][subject][mod][chapter];
                const idx = items.findIndex((it) => it._id === dashboardId);
                if (idx !== -1) {
                  items[idx] = { ...items[idx], ...patch };
                  return next;
                }
              }
            }
          }
        }
        return prev;
      });
      setViewer((v) =>
        v && v.item._id === dashboardId ? { ...v, item: { ...v.item, ...patch } } : v
      );
    },
    []
  );

  // ============================================================
  // POLLING
  // ============================================================
  const startPolling = useCallback(
    (dashboardId: string, _jobId: string) => {
      if (pollTimers.current[dashboardId]) clearInterval(pollTimers.current[dashboardId]);

      const startedAt = Date.now();

      const timer = setInterval(async () => {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          clearInterval(pollTimers.current[dashboardId]);
          delete pollTimers.current[dashboardId];
          setVideoJobs((prev) => ({
            ...prev,
            [dashboardId]: { ...prev[dashboardId], status: "timeout", message: "Timed out after 15 min." },
          }));
          patchTreeItem(dashboardId, { status: "failed" });
          return;
        }

        try {
          const res = await api.get(`/dashboard/item/${dashboardId}`);
          const item: PDFItem = res.data;

          if (item.video_url && (item.status === "completed" || !item.status)) {
            clearInterval(pollTimers.current[dashboardId]);
            delete pollTimers.current[dashboardId];
            patchTreeItem(dashboardId, {
              video_url:          item.video_url,
              audio_url:          item.audio_url,
              simplified_pdf_url: item.simplified_pdf_url,
              status:             "completed",
              video_created_at:   item.video_created_at,
            });
            setVideoJobs((prev) => ({
              ...prev,
              [dashboardId]: { ...prev[dashboardId], status: "completed", message: "Video ready!" },
            }));
            showToast("🎬 Video is ready!", "success");
          } else if (item.status === "failed") {
            clearInterval(pollTimers.current[dashboardId]);
            delete pollTimers.current[dashboardId];
            setVideoJobs((prev) => ({
              ...prev,
              [dashboardId]: { ...prev[dashboardId], status: "failed", message: "Video generation failed." },
            }));
            patchTreeItem(dashboardId, { status: "failed" });
          }
        } catch (err) {
          console.warn("[poll] Error:", err);
        }
      }, POLL_INTERVAL_MS);

      pollTimers.current[dashboardId] = timer;
    },
    [patchTreeItem, showToast]
  );

  // ============================================================
  // CREATE VIDEO — GUARD: Smart PDF must exist first
  // ============================================================
  const handleCreateVideo = async (item: PDFItem) => {
    const dashboardId = item._id;

    // ── TASK 1: block if no smart PDF ───────────────────────
    if (!item.simplified_pdf_url) {
      showToast(
        "Please upload a Smart PDF first before creating a video.",
        "warning",
        5000
      );
      return;
    }

    if (videoJobs[dashboardId]?.status === "polling") return;

    patchTreeItem(dashboardId, { status: "processing" });
    setVideoJobs((prev) => ({
      ...prev,
      [dashboardId]: {
        jobId: "", dashboardId, startedAt: Date.now(),
        status: "polling", message: "Submitting job…",
      },
    }));

    try {
      const payload = {
        pdf_s3_url:   item.pdf_url,
        dashboard_id: dashboardId,
        platform:     "ca",
        use_gemini:   true,
        use_openai:   true,
      };

      const res = await fetch(`${VIDEO_API_BASE}/api/process`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Video API returned ${res.status}: ${errText}`);
      }

      const data: { job_id: string; dashboard_id: string; status: string; message: string } =
        await res.json();

      setVideoJobs((prev) => ({
        ...prev,
        [dashboardId]: {
          jobId:     data.job_id,
          dashboardId,
          startedAt: Date.now(),
          status:    "polling",
          message:   data.message || "Processing…",
        },
      }));

      startPolling(dashboardId, data.job_id);
    } catch (err: any) {
      console.error("[video] Job submission failed:", err);
      setVideoJobs((prev) => ({
        ...prev,
        [dashboardId]: {
          ...(prev[dashboardId] ?? { jobId: "", dashboardId, startedAt: Date.now() }),
          status:  "failed",
          message: err?.message ?? "Submission failed. Try again.",
        },
      }));
      patchTreeItem(dashboardId, { status: "failed" });
      showToast("Video job submission failed. Please try again.", "error");

      setTimeout(() => {
        setVideoJobs((prev) => {
          const next = { ...prev };
          delete next[dashboardId];
          return next;
        });
        patchTreeItem(dashboardId, { status: undefined });
      }, 5000);
    }
  };

  // ============================================================
  // SMART PDF UPLOAD
  // ============================================================
  const handleSmartPdfSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    item: PDFItem,
  ) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are accepted for Smart PDF upload.");
      return;
    }

    const id = item._id;
    setSmartUploads((prev) => ({ ...prev, [id]: { status: "uploading", message: "Uploading…" } }));

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await api.post(
        `/admin/materials/${id}/upload_smart_pdf`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const { simplified_pdf_url } = res.data as { simplified_pdf_url: string };
      patchTreeItem(id, { simplified_pdf_url });

      setSmartUploads((prev) => ({
        ...prev,
        [id]: { status: "success", message: "Smart PDF saved!" },
      }));
      showToast("🧠 Smart PDF uploaded successfully!", "success");

      setTimeout(() => {
        setSmartUploads((prev) => ({ ...prev, [id]: { status: "idle" } }));
      }, 4000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      setSmartUploads((prev) => ({ ...prev, [id]: { status: "error", message: detail } }));
      showToast(`Smart PDF upload failed: ${detail}`, "error");
      setTimeout(() => {
        setSmartUploads((prev) => ({ ...prev, [id]: { status: "idle" } }));
      }, 4000);
    }
  };

  // ============================================================
  // NAVIGATION HELPERS
  // ============================================================
  const toggleModule = (key: string) =>
    setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));

  const expandAll = () => {
    if (!selected || !tree[selected]) return;
    const keys: Record<string, boolean> = {};
    Object.keys(tree[selected]).forEach((subject) => {
      Object.keys(tree[selected][subject]).forEach((mod) => {
        keys[`${subject}-${mod}`] = true;
      });
    });
    setOpenModules(keys);
  };

  const collapseAll = () => setOpenModules({});

  const goBack = () => {
    setSelected(null);
    setSearchQuery("");
    setOpenModules({});
  };

  const openViewer = (item: PDFItem, type: ViewerType = "pdf") =>
    setViewer({ type, item });

  const closeViewer = () => setViewer(null);

  const handleDownloadAudio = async (item: PDFItem) => {
    if (!item.audio_url) return;
    try {
      const res = await api.get("/dashboard/audio-proxy", {
        params: { url: item.audio_url }, responseType: "blob",
      });
      const blob     = new Blob([res.data], { type: "audio/mpeg" });
      const objUrl   = URL.createObjectURL(blob);
      const anchor   = document.createElement("a");
      const filename = item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_audio.mp3";
      anchor.href = objUrl; anchor.download = filename;
      document.body.appendChild(anchor); anchor.click();
      document.body.removeChild(anchor); URL.revokeObjectURL(objUrl);
    } catch (err: any) {
      console.error("[download audio]", err);
      alert("Could not download audio. Please try again.");
    }
  };

  const getFilteredChapters = (subject: string, module: string) => {
    const chapters = tree[selected!]?.[subject]?.[module] ?? {};
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    const filtered: Record<string, any[]> = {};
    Object.entries(chapters).forEach(([ch, items]: [string, any]) => {
      const matched = items.filter(
        (it: any) =>
          it.title?.toLowerCase().includes(q) ||
          ch.toLowerCase().includes(q) ||
          it.unit?.toLowerCase().includes(q)
      );
      if (matched.length > 0) filtered[ch] = matched;
    });
    return filtered;
  };

  const countLevelPdfs = (lvl: string) => {
    if (!tree[lvl]) return 0;
    let count = 0;
    Object.values(tree[lvl]).forEach((subjects: any) =>
      Object.values(subjects).forEach((modules: any) =>
        Object.values(modules).forEach((items: any) => { count += items.length; })
      )
    );
    return count;
  };

  // ============================================================
  // VIDEO BUTTON RENDERER
  // ============================================================
  const renderVideoButton = (item: PDFItem) => {
    const dashboardId = item._id;
    const job         = videoJobs[dashboardId];
    const hasVideo    = !!item.video_url || job?.status === "completed";

    if (hasVideo) {
      return (
        <>
          <button
            className="resource-action-btn resource-action-video resource-action-watch"
            onClick={() => openViewer(item, "video")}
            title="Watch generated video lecture"
          >
            ▶ Watch Video
          </button>
          {isAdmin && (
            <button
              className="resource-action-btn resource-action-recreate-video"
              onClick={() => handleCreateVideo(item)}
              title="Regenerate AI video lecture (Admin only)"
            >
              🔄 Recreate Video
            </button>
          )}
        </>
      );
    }

    if (job?.status === "polling" || item.status === "processing") {
      return (
        <button
          className="resource-action-btn resource-action-create-video loading"
          disabled
          title={job?.message ?? "Generating video…"}
        >
          <span className="spinner-mini" />
          {job?.message ?? "Processing…"}
        </button>
      );
    }

    if (job?.status === "failed" || job?.status === "timeout") {
      return (
        <button
          className="resource-action-btn resource-action-create-video resource-action-failed"
          onClick={() => handleCreateVideo(item)}
          title={job?.message ?? "Failed — click to retry"}
        >
          ⚠ Retry Video
        </button>
      );
    }

    // ── Admin: show Create Video button (will be blocked by guard if no Smart PDF) ──
    if (isAdmin && !item.video_url) {
      const hasSmartPdf = !!item.simplified_pdf_url;
      return (
        <button
          className="resource-action-btn resource-action-create-video"
          onClick={() => handleCreateVideo(item)}
          title={
            hasSmartPdf
              ? "Generate AI video lecture (Admin only)"
              : "Upload Smart PDF first to enable video creation"
          }
          style={
            !hasSmartPdf
              ? { opacity: 0.55, cursor: "not-allowed", filter: "grayscale(0.4)" }
              : undefined
          }
        >
          {hasSmartPdf ? "🤖 Create Video" : "🔒 Create Video"}
        </button>
      );
    }

    return null;
  };

  // ============================================================
  // SMART PDF UPLOAD BUTTON RENDERER
  // ============================================================
  const renderSmartPdfUploadButton = (item: PDFItem) => {
    if (!isAdmin) return null;

    const id  = item._id;
    const job = smartUploads[id] ?? { status: "idle" };

    const label =
      job.status === "uploading" ? "⏫ Uploading…"        :
      job.status === "success"   ? "✅ Saved!"             :
      job.status === "error"     ? "❌ Retry"              :
      item.simplified_pdf_url    ? "🧠 Replace Smart PDF" :
                                   "🧠 Upload Smart PDF";

    const titleText =
      job.status === "uploading" ? "Uploading Smart PDF to S3…"                      :
      job.status === "error"     ? (job.message ?? "Upload failed — click to retry") :
      item.simplified_pdf_url    ? "Smart PDF exists — click to replace"             :
                                   "Upload a simplified PDF for students (Admin only)";

    return (
      <>
        <input
          ref={(el) => { smartPdfRefs.current[id] = el; }}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: "none" }}
          onChange={(e) => handleSmartPdfSelect(e, item)}
        />
        <button
          className="resource-action-btn resource-action-smart-pdf-upload"
          disabled={job.status === "uploading"}
          title={titleText}
          onClick={() => smartPdfRefs.current[id]?.click()}
          style={{
            opacity:     job.status === "uploading" ? 0.65 : 1,
            cursor:      job.status === "uploading" ? "not-allowed" : "pointer",
            background:
              job.status === "success" ? "rgba(16,185,129,0.15)" :
              job.status === "error"   ? "rgba(239,68,68,0.12)"  :
              item.simplified_pdf_url  ? "rgba(16,185,129,0.08)" :
                                         "rgba(139,92,246,0.12)",
            borderColor:
              job.status === "success" ? "rgba(16,185,129,0.5)"  :
              job.status === "error"   ? "rgba(239,68,68,0.5)"   :
              item.simplified_pdf_url  ? "rgba(16,185,129,0.35)" :
                                         "rgba(139,92,246,0.4)",
            color:
              job.status === "success" ? "#10b981" :
              job.status === "error"   ? "#ef4444"  :
              item.simplified_pdf_url  ? "#10b981"  :
                                         "#a78bfa",
          }}
        >
          {label}
        </button>
      </>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="ca-dashboard">

      {/* ── TOAST CONTAINER ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── HEADER ── */}
      <div className="ca-header">
        <div className="ca-header-inner">
          <div>
            <h1>CA Study Dashboard</h1>
            <p>Explore curated modules, ICAI PDFs &amp; video lectures</p>
          </div>
          {selected && (
            <div className="ca-search-wrap">
              <span className="ca-search-icon">🔍</span>
              <input
                className="ca-search-input"
                type="search"
                placeholder="Search chapters, units or topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── LEVEL SELECTOR ── */}
      {!selected && (
        <div className="level-selector-section">
          <p className="level-selector-hint">Select your CA level to begin</p>

          {treeLoading ? (
            <div className="app-full-center" style={{ marginTop: 60 }}>
              <div className="loader" />
              <span className="loader-text">Loading study materials…</span>
            </div>
          ) : (
            <div className="level-cards-grid">
              {(["Foundation", "Intermediate", "Final", "Self Paced", "Others"] as Level[]).map((lvl) => {
                // ── Students only see their own level + Self Paced + Others ──
                if (!isLevelVisible(lvl)) return null;

                const meta         = LEVEL_META[lvl];
                const subjectCount = tree[lvl] ? Object.keys(tree[lvl]).length : 0;
                const pdfCount     = countLevelPdfs(lvl);
                return (
                  <button
                    key={lvl}
                    className="level-card"
                    onClick={() => setSelected(lvl)}
                    aria-label={`Select ${lvl} level`}
                  >
                    <span className="level-card-icon">{meta.icon}</span>
                    <span className="level-card-name">{lvl}</span>
                    <span className="level-card-desc">{meta.desc}</span>
                    {subjectCount > 0 ? (
                      <div className="level-card-stats">
                        <span className="level-card-badge">{subjectCount} subjects</span>
                        <span className="level-card-badge level-card-badge-pdf">{pdfCount} PDFs</span>
                      </div>
                    ) : (
                      <span className="level-card-empty">No content yet</span>
                    )}
                    <span className="level-card-arrow">→</span>
                  </button>
                );
              })}
            </div>
          )}

          {!treeLoading && (
            <div className="dashboard-stats">
              {(["Foundation", "Intermediate", "Final", "Self Paced", "Others"] as Level[]).map((lvl) => {
                // ── Stats bar also respects level visibility ──────────────
                if (!isLevelVisible(lvl)) return null;
                const pdfCount = countLevelPdfs(lvl);
                if (!pdfCount) return null;
                return (
                  <div className="dash-stat" key={lvl}>
                    <span className="dash-stat-num">{pdfCount}</span>
                    <span className="dash-stat-label">{lvl} PDFs</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── LEVEL CONTENT ── */}
      {selected && (
        <div className="level-content">
          <div className="level-toolbar">
            <button className="back-btn" onClick={goBack}>← All Levels</button>
            <div className="level-toolbar-meta">
              <span className="level-toolbar-icon">{LEVEL_META[selected].icon}</span>
              <h2 className="level-toolbar-title">{selected}</h2>
            </div>
            <div className="level-toolbar-actions">
              <button className="toolbar-btn" onClick={expandAll}>Expand All</button>
              <button className="toolbar-btn" onClick={collapseAll}>Collapse</button>
            </div>
          </div>

          {!tree[selected] || Object.keys(tree[selected]).length === 0 ? (
            <div className="ca-empty-state">
              <span className="ca-empty-icon">📭</span>
              <p>No content available for <strong>{selected}</strong> yet.</p>
              <p className="ca-empty-hint">Ask your admin to upload PDFs for this level.</p>
            </div>
          ) : (
            <div className="premium-tree">
              {sortKeys(Object.keys(tree[selected])).map((subject) => (
                <div key={subject} className="subject-card">
                  <div className="subject-card-header">
                    <h3>{subject}</h3>
                    <span className="subject-module-count">
                      {Object.keys(tree[selected][subject]).length} modules
                    </span>
                  </div>

                  {sortKeys(Object.keys(tree[selected][subject])).map((module) => {
                    const moduleKey        = `${subject}-${module}`;
                    const isOpen           = openModules[moduleKey];
                    const filteredChapters = getFilteredChapters(subject, module);
                    const chapterKeys      = sortKeys(Object.keys(filteredChapters));

                    if (searchQuery && chapterKeys.length === 0) return null;

                    return (
                      <div key={module} className="module-block">
                        <button
                          className="module-toggle"
                          onClick={() => toggleModule(moduleKey)}
                          aria-expanded={isOpen}
                        >
                          <span className="module-toggle-text">
                            <span className="module-toggle-arrow">{isOpen ? "▾" : "▸"}</span>
                            {module}
                          </span>
                          <span className="module-toggle-count">{chapterKeys.length} ch.</span>
                        </button>

                        {isOpen && (
                          <div className="module-chapters">
                            {chapterKeys.map((chapter) => (
                              <div key={chapter} className="chapter-block">
                                <div className="chapter-header">
                                  <span className="chapter-dot" />
                                  <h4>{chapter}</h4>
                                </div>

                                <div className="resource-list">
                                  {filteredChapters[chapter].map((item: PDFItem) => (
                                    <div key={item._id} className="resource-item">
                                      {item.unit && (
                                        <div className="resource-unit-label">📎 {item.unit}</div>
                                      )}

                                      <button
                                        className="pdf-btn"
                                        onClick={() => openViewer(item, "pdf")}
                                        title={`Open: ${item.title}`}
                                      >
                                        <span className="pdf-btn-icon">📄</span>
                                        <span className="pdf-btn-text">{item.title}</span>
                                      </button>

                                      <div className="resource-actions">
                                        <button
                                          className="resource-action-btn resource-action-read"
                                          onClick={() => openViewer(item, "pdf")}
                                          title="Read PDF"
                                        >
                                          📖 Read
                                        </button>

                                        {item.simplified_pdf_url && (
                                          <button
                                            className="resource-action-btn resource-action-smart-pdf"
                                            onClick={() => openViewer(item, "smart_pdf")}
                                            title="View AI-enhanced Smart PDF"
                                          >
                                            🧠 Smart PDF
                                          </button>
                                        )}

                                        {renderVideoButton(item)}

                                        {item.audio_url && (
                                          <button
                                            className="resource-action-btn resource-action-audio"
                                            onClick={() => openViewer(item, "audio")}
                                            title="Listen to audio explanation"
                                          >
                                            🎵 Audio
                                          </button>
                                        )}

                                        <button
                                          className="resource-action-btn resource-action-chat"
                                          onClick={() => (window as any).goChat?.()}
                                          title="Ask AI about this topic"
                                        >
                                          💬 Ask AI
                                        </button>

                                        {renderSmartPdfUploadButton(item)}
                                      </div>

                                      {/* Status messages */}
                                      {smartUploads[item._id]?.status === "uploading" && (
                                        <div className="video-job-status" style={{ color: "#a78bfa" }}>
                                          <span className="spinner-mini" />
                                          <span>Uploading Smart PDF…</span>
                                        </div>
                                      )}
                                      {smartUploads[item._id]?.status === "error" && (
                                        <div className="video-job-status" style={{ color: "#ef4444" }}>
                                          ⚠ {smartUploads[item._id].message}
                                        </div>
                                      )}
                                      {videoJobs[item._id]?.status === "polling" && (
                                        <div className="video-job-status">
                                          <span className="spinner-mini" />
                                          <span>{videoJobs[item._id].message ?? "Generating video…"}</span>
                                          <span className="video-job-elapsed">
                                            {Math.floor((Date.now() - videoJobs[item._id].startedAt) / 1000)}s
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VIEWER MODAL ── */}
      {viewer && (
        <div
          className="multimedia-modal"
          role="dialog"
          aria-modal="true"
          aria-label={viewer.item.title}
          onClick={(e) => { if (e.target === e.currentTarget) closeViewer(); }}
        >
          <div className="multimedia-container">
            <div className="multimedia-header">
              <div className="multimedia-header-info">
                <button className="multimedia-back-btn" onClick={closeViewer} aria-label="Go back">
                  ← Back
                </button>
                <span className="multimedia-header-icon">
                  {viewer.type === "pdf"       && "📄"}
                  {viewer.type === "smart_pdf" && "🧠"}
                  {viewer.type === "video"     && "🎬"}
                  {viewer.type === "audio"     && "🎵"}
                </span>
                <div>
                  <h3 className="multimedia-header-title">{viewer.item.title}</h3>
                  {viewer.item.chapter && (
                    <span className="multimedia-header-sub">{viewer.item.chapter}</span>
                  )}
                  {viewer.item.unit && (
                    <span className="multimedia-header-unit">📎 {viewer.item.unit}</span>
                  )}
                </div>
              </div>

              <div className="multimedia-header-actions">
                {viewer.item.pdf_url && viewer.type !== "pdf" && (
                  <button
                    className="resource-action-btn resource-action-read"
                    onClick={() => setViewer((v) => v ? { ...v, type: "pdf" } : null)}
                  >
                    📖 Read PDF
                  </button>
                )}
                {viewer.item.simplified_pdf_url && viewer.type !== "smart_pdf" && (
                  <button
                    className="resource-action-btn resource-action-smart-pdf"
                    onClick={() => setViewer((v) => v ? { ...v, type: "smart_pdf" } : null)}
                  >
                    🧠 Smart PDF
                  </button>
                )}
                {viewer.item.video_url && viewer.type !== "video" && (
                  <button
                    className="resource-action-btn resource-action-video"
                    onClick={() => setViewer((v) => v ? { ...v, type: "video" } : null)}
                  >
                    🎬 Watch Video
                  </button>
                )}
                {viewer.item.audio_url && viewer.type !== "audio" && (
                  <button
                    className="resource-action-btn resource-action-audio"
                    onClick={() => setViewer((v) => v ? { ...v, type: "audio" } : null)}
                  >
                    🎵 Audio
                  </button>
                )}
                <button
                  className="resource-action-btn resource-action-chat"
                  onClick={() => { closeViewer(); (window as any).goChat?.(); }}
                >
                  💬 Chat
                </button>
                <button className="multimedia-close-btn" onClick={closeViewer} aria-label="Close">
                  ✕
                </button>
              </div>
            </div>

            <div className="multimedia-content">
              {/* PDF */}
              {viewer.type === "pdf" && (
                <PdfViewer url={viewer.item.pdf_url} title={viewer.item.title} />
              )}

              {/* Smart PDF */}
              {viewer.type === "smart_pdf" && viewer.item.simplified_pdf_url && (
                <PdfViewer
                  url={viewer.item.simplified_pdf_url}
                  title={`Smart PDF – ${viewer.item.title}`}
                />
              )}

              {/* Video */}
              {viewer.type === "video" && viewer.item.video_url && (
                <video
                  controls
                  autoPlay
                  className="multimedia-frame video-frame"
                  controlsList="nodownload"
                  key={viewer.item.video_url}
                  playsInline          // ← important for iOS
                >
                  <source src={viewer.item.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}

              {/* Audio */}
              {viewer.type === "audio" && viewer.item.audio_url && (
                <div className="audio-player-container">
                  <audio
                    controls
                    autoPlay
                    className="audio-player"
                    controlsList="nodownload"
                    key={viewer.item.audio_url}
                    playsInline          // ← important for iOS
                  >
                    <source src={viewer.item.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="audio-player-info">
                    <h4>{viewer.item.title}</h4>
                    <p>Now listening to audio lecture</p>
                  </div>
                  <button
                    className="resource-action-btn resource-action-download-audio"
                    onClick={() => handleDownloadAudio(viewer.item)}
                    title="Download audio as MP3"
                  >
                    ⬇ Download MP3
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CADashboard;

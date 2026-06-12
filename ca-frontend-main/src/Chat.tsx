import React, { useEffect, useRef, useState, useCallback } from "react";
import api from "./api";
import "./App.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ============================================================
   TYPES
   ============================================================ */
type Source = {
  id?: string;
  score?: number;
  source?: string;
  doc_title?: string;
  page_start?: number | string;
  page_end?: number | string;
  chapter?: string | null;
  topic?: string | null;
  note?: string | null;
  table_csv_url?: string;
  thumb_url?: string;
  type?: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts?: string;
  sources?: Source[];
  attachmentPreview?: string; // base64 data URL for image preview in bubble
  attachmentName?: string;    // file name for doc preview
};

// Attachment states
type AttachStatus = "idle" | "reading" | "ready" | "invalid";

interface Attachment {
  file: File;
  status: AttachStatus;
  previewUrl?: string;    // data URL for image preview
  extractedText?: string; // text extracted from image/pdf
  errorMsg?: string;
  fileType: "image" | "pdf" | "doc";
}

/* ============================================================
   HELPERS
   ============================================================ */
const isDialogue = (text: string) =>
  /(^|\n)\s*User\s*[AB]\s*:/i.test(text);

const parseDialogueLines = (text: string) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((ln) => {
    const mA = ln.match(/^\s*User\s*A\s*:\s*(.*)$/i);
    const mB = ln.match(/^\s*User\s*B\s*:\s*(.*)$/i);
    if (mA) return { speaker: "A" as const, text: mA[1].trim() };
    if (mB) return { speaker: "B" as const, text: mB[1].trim() };
    return { speaker: null, text: ln };
  });
};

const stripSourcesText = (answer: string) => {
  const re = /(?:Sources\s*Used\s*:)/i;
  const split = answer.split(re);
  return split.length <= 1
    ? { body: answer.trim(), sourcesText: "" }
    : { body: split[0].trim(), sourcesText: split.slice(1).join("").trim() };
};

const stripMarkdown = (text: string): string => {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`[^`]*`/g, (m) => m.slice(1, -1))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*{3}|_{3})(.*?)\1/g, "$2")
    .replace(/(\*{2}|_{2})(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/^\|[-| :]+\|$/gm, "")
    .replace(/\|/g, " ")
    .replace(/[#@$^&*~`\\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

/** Read file as base64 data URL */
const readAsDataURL = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = () => rej(new Error("File read failed"));
    reader.readAsDataURL(file);
  });

/** Read file as plain text (for txt, doc-like files) */
const readAsText = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = () => rej(new Error("File read failed"));
    reader.readAsText(file);
  });

/** Extract text from image via OpenAI vision endpoint through our API */
const extractTextFromImage = async (base64DataUrl: string): Promise<string> => {
  const res = await api.post("/chat/extract-file-text", {
    type: "image",
    data: base64DataUrl,
  });
  return res.data.text || "";
};

/** Extract text from PDF base64 via our API */
const extractTextFromPdf = async (base64DataUrl: string): Promise<string> => {
  const res = await api.post("/chat/extract-file-text", {
    type: "pdf",
    data: base64DataUrl,
  });
  return res.data.text || "";
};

/** Rough CA relevance check on extracted text (client-side pre-filter) */
const CA_KEYWORDS = [
  "gst","tax","audit","accounting","balance sheet","tds","income",
  "ca foundation","ca inter","ca final","icai","as ","ind as","ifrs",
  "revenue","depreciation","provision","debit","credit","journal","ledger",
  "financial","company","directors","sebi","capital","liability","asset",
  "cost","budget","variance","profit","loss","trial balance","invoice",
  "input tax credit","itc","section","act 20","companies act",
];
const looksLikeCA = (text: string): boolean => {
  const lower = text.toLowerCase();
  return CA_KEYWORDS.some((kw) => lower.includes(kw));
};

const SUGGESTIONS = [
  "What is the Companies Act, 2013?",
  "Explain AS 9 – Revenue Recognition",
  "What are GST input tax credits?",
  "Describe audit procedures for inventory",
];

// Accepted file types
const ACCEPTED_MIME = [
  "image/jpeg","image/jpg","image/png","image/gif","image/webp",
  "application/pdf",
  "text/plain",
];
const MAX_FILE_MB = 8;

/* ============================================================
   ATTACHMENT PREVIEW COMPONENT
   ============================================================ */
interface AttachPreviewProps {
  attachment: Attachment;
  onRemove: () => void;
}

const AttachPreview: React.FC<AttachPreviewProps> = ({ attachment, onRemove }) => {
  const isImage = attachment.fileType === "image";

  const statusColor: Record<AttachStatus, string> = {
    idle:    "#6b7280",
    reading: "#f59e0b",
    ready:   "#10b981",
    invalid: "#ef4444",
  };
  const statusLabel: Record<AttachStatus, string> = {
    idle:    "Pending",
    reading: "Reading…",
    ready:   "Ready",
    invalid: "Invalid",
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      background: attachment.status === "invalid" ? "#fef2f2" : "#f0fdf4",
      border: `1.5px solid ${attachment.status === "invalid" ? "#fecaca" : "#bbf7d0"}`,
      borderRadius: 10,
      marginBottom: 6,
      position: "relative",
      maxWidth: "100%",
    }}>
      {/* Thumbnail or icon */}
      {isImage && attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt="attachment"
          style={{ width: 44, height: 44, borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: 7,
          background: "#e0e7ff", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "1.5rem", flexShrink: 0,
        }}>
          {attachment.fileType === "pdf" ? "📄" : "📝"}
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "0.82rem", fontWeight: 600, color: "#1f2937",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {attachment.file.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          {attachment.status === "reading" ? (
            <span style={{ fontSize: "0.72rem", color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                border: "2px solid #f59e0b", borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite",
              }} />
              Reading file…
            </span>
          ) : (
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, color: statusColor[attachment.status],
            }}>
              ● {statusLabel[attachment.status]}
            </span>
          )}
          {attachment.errorMsg && (
            <span style={{ fontSize: "0.72rem", color: "#ef4444" }}>— {attachment.errorMsg}</span>
          )}
        </div>
        {attachment.status === "invalid" && (
          <div style={{ fontSize: "0.72rem", color: "#dc2626", marginTop: 2 }}>
            This file doesn't appear to contain CA/business content.
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#6b7280", fontSize: "1rem", padding: "2px 4px",
          borderRadius: 4, flexShrink: 0, lineHeight: 1,
        }}
        title="Remove attachment"
      >
        ✕
      </button>
    </div>
  );
};

/* ============================================================
   MESSAGE ATTACHMENT BUBBLE  (shown inside sent message)
   ============================================================ */
const MsgAttachBubble: React.FC<{ previewUrl?: string; name?: string }> = ({ previewUrl, name }) => {
  if (previewUrl && previewUrl.startsWith("data:image")) {
    return (
      <img
        src={previewUrl}
        alt={name || "attachment"}
        style={{
          maxWidth: 200, maxHeight: 160, borderRadius: 8,
          border: "2px solid rgba(255,255,255,0.2)", marginBottom: 6,
          display: "block",
        }}
      />
    );
  }
  if (name) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "5px 10px", borderRadius: 7,
        background: "rgba(255,255,255,0.15)",
        fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.9)",
        marginBottom: 6,
      }}>
        📄 {name}
      </div>
    );
  }
  return null;
};

/* ============================================================
   COMPONENT
   ============================================================ */
const Chat: React.FC = () => {
  const [messages, setMessages]           = useState<Msg[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [sttSupported, setSttSupported]   = useState(false);
  const [rec, setRec]                     = useState<any>(null);
  const [mode, setMode]                   = useState<"qa" | "discussion">("qa");
  const [openSources, setOpenSources]     = useState<Record<number, boolean>>({});
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused]           = useState(false);
  const [scrollVisible, setScrollVisible] = useState(false);
  const [copiedIndex, setCopiedIndex]     = useState<number | null>(null);

  // ── Attachment state ─────────────────────────────────────
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const utterRef    = useRef<SpeechSynthesisUtterance | null>(null);
  const chatRef     = useRef<HTMLDivElement | null>(null);
  const bottomRef   = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* ---- Auto-scroll ---- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---- Scroll visibility ---- */
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const onScroll = () => {
      setScrollVisible(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* ---- STT setup ---- */
  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => setInput(e.results[0][0].transcript);
    setRec(recognition);
    setSttSupported(true);
  }, []);

  /* ---- Auto-resize textarea ---- */
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 130)}px`;
  }, []);

  /* ============================================================
     FILE ATTACHMENT HANDLER
     ============================================================ */
  const handleFileSelect = useCallback(async (file: File) => {
    // Size guard
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`File too large. Max ${MAX_FILE_MB} MB allowed.`);
      return;
    }
    // Type guard
    if (!ACCEPTED_MIME.includes(file.type)) {
      alert("Unsupported file type. Please upload an image (JPG/PNG/WEBP), PDF, or TXT file.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isPdf   = file.type === "application/pdf";
    const fileType: Attachment["fileType"] = isImage ? "image" : isPdf ? "pdf" : "doc";

    // Start reading state
    const base: Attachment = { file, status: "reading", fileType };
    setAttachment(base);

    try {
      const dataUrl = await readAsDataURL(file);

      // ── IMAGE: use backend vision extraction ──────────────────────────────
      if (isImage) {
        setAttachment((prev) => prev ? { ...prev, previewUrl: dataUrl } : prev);
        try {
          const text = await extractTextFromImage(dataUrl);
          if (!text || text.trim().length < 10) {
            setAttachment((prev) => prev ? {
              ...prev, status: "invalid",
              errorMsg: "Could not extract readable text from this image.",
            } : prev);
            return;
          }
          const valid = looksLikeCA(text);
          setAttachment((prev) => prev ? {
            ...prev,
            status:        valid ? "ready" : "invalid",
            extractedText: valid ? text : undefined,
            previewUrl:    dataUrl,
            errorMsg:      valid ? undefined : "Image doesn't appear to contain CA/business content.",
          } : prev);
        } catch {
          // If backend vision fails, still allow the image but mark as ready
          // — validation will happen server-side during chat
          setAttachment((prev) => prev ? {
            ...prev, status: "ready", previewUrl: dataUrl, extractedText: undefined,
          } : prev);
        }
      }

      // ── PDF: use backend extraction ────────────────────────────────────────
      else if (isPdf) {
        try {
          const text = await extractTextFromPdf(dataUrl);
          if (!text || text.trim().length < 20) {
            setAttachment((prev) => prev ? {
              ...prev, status: "invalid",
              errorMsg: "Could not extract text from this PDF.",
            } : prev);
            return;
          }
          const valid = looksLikeCA(text);
          setAttachment((prev) => prev ? {
            ...prev,
            status:        valid ? "ready" : "invalid",
            extractedText: valid ? text.slice(0, 3000) : undefined,
            errorMsg:      valid ? undefined : "PDF doesn't appear to contain CA/business content.",
          } : prev);
        } catch {
          setAttachment((prev) => prev ? {
            ...prev, status: "invalid", errorMsg: "Failed to read PDF.",
          } : prev);
        }
      }

      // ── TXT: direct read ────────────────────────────────────────────────────
      else {
        try {
          const text = await readAsText(file);
          const valid = looksLikeCA(text);
          setAttachment((prev) => prev ? {
            ...prev,
            status:        valid ? "ready" : "invalid",
            extractedText: valid ? text.slice(0, 3000) : undefined,
            errorMsg:      valid ? undefined : "File doesn't appear to contain CA/business content.",
          } : prev);
        } catch {
          setAttachment((prev) => prev ? {
            ...prev, status: "invalid", errorMsg: "Failed to read text file.",
          } : prev);
        }
      }
    } catch (err) {
      setAttachment((prev) => prev ? {
        ...prev, status: "invalid", errorMsg: "File could not be read.",
      } : prev);
    }
  }, []);

  /* ---- Drag-and-drop on the chat area ---- */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  /* ============================================================
     SPEECH SYNTHESIS
     ============================================================ */
  const speakStart = (text: string, idx: number) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-IN";
    utt.onend = utt.onerror = () => {
      setSpeakingIndex(null);
      setIsPaused(false);
      utterRef.current = null;
    };
    utterRef.current = utt;
    setSpeakingIndex(idx);
    setIsPaused(false);
    window.speechSynthesis.speak(utt);
  };

  const pauseSpeech  = () => { window.speechSynthesis.pause();  setIsPaused(true);  };
  const resumeSpeech = () => { window.speechSynthesis.resume(); setIsPaused(false); };
  const stopSpeech   = () => {
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    setIsPaused(false);
    utterRef.current = null;
  };

  const handleSpeakToggle = (idx: number, text: string) => {
    if (speakingIndex === null) { speakStart(text, idx); return; }
    if (speakingIndex === idx) {
      window.speechSynthesis.paused ? resumeSpeech() : pauseSpeech();
      return;
    }
    stopSpeech();
    speakStart(text, idx);
  };

  const speakLabel = (idx: number) => {
    if (speakingIndex !== idx) return "🔊 Speak";
    return isPaused ? "▶ Resume" : "⏸ Pause";
  };

  /* ============================================================
     SEND MESSAGE  (with optional attachment)
     ============================================================ */
  const sendMessage = async (overrideInput?: string) => {
    const typedText = (overrideInput ?? input).trim();

    // ── Determine what we're sending ──────────────────────────────────────────
    // Case A: attachment ready — use file content as primary prompt
    // Case B: typed text only
    // Case C: both — combine

    const hasReadyAttachment =
      attachment && attachment.status === "ready";

    // Must have at least something to send
    if (!typedText && !hasReadyAttachment) return;
    if (loading) return;

    let finalPrompt = typedText;
    let attachmentContext = "";

    if (hasReadyAttachment) {
      if (attachment!.extractedText) {
        // Text-based extraction available
        attachmentContext = attachment!.extractedText;
        finalPrompt = typedText
          ? `${typedText}\n\n[Attached file content]:\n${attachment!.extractedText}`
          : `Please read the following content from an uploaded file and answer any CA/accounting question in it:\n\n${attachment!.extractedText}`;
      } else if (attachment!.fileType === "image" && attachment!.previewUrl) {
        // Vision-based — we'll send image + text to backend
        // Backend handles it via the existing OpenAI vision call
        attachmentContext = "[IMAGE_ATTACHED]";
        finalPrompt = typedText
          ? typedText
          : "Please read the question or content in this image and answer it from a CA exam perspective.";
      }
    }

    // If attachment is invalid, block send and warn
    if (attachment && attachment.status === "invalid") {
      alert(
        "This file doesn't contain CA/business-related content. " +
        "Please upload a file with CA exam questions, accounting content, or business topics."
      );
      return;
    }

    const now = new Date().toISOString();
    const userMsg: Msg = {
      role: "user",
      content: typedText || "(File uploaded — see attachment)",
      ts: now,
      attachmentPreview: hasReadyAttachment ? attachment!.previewUrl : undefined,
      attachmentName:    hasReadyAttachment && !attachment!.previewUrl ? attachment!.file.name : undefined,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = "44px";

    setLoading(true);
    try {
      const history = newMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

      // ── Vision path (image with no extracted text) ──────────────────────────
      if (hasReadyAttachment && attachment!.fileType === "image" && !attachment!.extractedText && attachment!.previewUrl) {
        const res = await api.post("/chat", {
          message: finalPrompt,
          history,
          mode,
          image_data: attachment!.previewUrl,   // backend will use vision
        });
        const rawAnswer = (res.data.answer as string) || "";
        const { body: displayAnswer } = stripSourcesText(rawAnswer);
        const sources: Source[] = Array.isArray(res.data.sources) ? res.data.sources : [];
        setMessages((msgs) => [
          ...msgs,
          { role: "assistant", content: displayAnswer, ts: new Date().toISOString(), sources },
        ]);
      } else {
        // ── Standard text path ────────────────────────────────────────────────
        const res = await api.post("/chat", {
          message: finalPrompt,
          history,
          mode,
        });
        const rawAnswer = (res.data.answer as string) || "";
        const { body: displayAnswer } = stripSourcesText(rawAnswer);
        const sources: Source[] = Array.isArray(res.data.sources) ? res.data.sources : [];
        setMessages((msgs) => [
          ...msgs,
          { role: "assistant", content: displayAnswer, ts: new Date().toISOString(), sources },
        ]);
      }
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ||
        e?.message ||
        "Sorry, couldn't process that. Please try again.";
      setMessages((msgs) => [
        ...msgs,
        { role: "assistant", content: detail, ts: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setOpenSources({});
    setInput("");
    setAttachment(null);
    stopSpeech();
  };

  const handleCopy = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1400);
    } catch {}
  };

  const startVoiceInput = () => {
    if (!rec) return;
    window.speechSynthesis.cancel();
    try { rec.start(); } catch {}
  };

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div
      className="chat-card"
      role="region"
      aria-label="CA Tutor Chat"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >

      {/* ── Header ── */}
      <div className="chat-card-header">
        <div className="chat-header-row1">
          <div className="header-left">
            <h2 className="chat-title">Dhvani CA Tutor</h2>
            <p className="chat-subtitle">Exam-focused answers from your study materials</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={clearChat} title="Clear chat">
            Clear
          </button>
        </div>

        <div className="chat-header-row2">
          <div className="chat-mode-toggle" role="tablist" aria-label="Answer mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "qa"}
              className={`chat-mode-btn${mode === "qa" ? " chat-mode-btn-active" : ""}`}
              onClick={() => setMode("qa")}
            >
              Simple Q&amp;A
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "discussion"}
              className={`chat-mode-btn${mode === "discussion" ? " chat-mode-btn-active" : ""}`}
              onClick={() => setMode("discussion")}
            >
              Discussion
            </button>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages" aria-live="polite" ref={chatRef}>

        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="empty-title">Ask your CA question</p>
            <p className="empty-sub">Grounded answers from ICAI study materials</p>
            {/* ── Upload hint ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              margin: "10px auto 14px",
              padding: "9px 16px",
              background: "rgba(201,168,76,0.1)",
              border: "1.5px dashed rgba(201,168,76,0.4)",
              borderRadius: 10,
              maxWidth: 380,
              fontSize: "0.82rem",
              color: "#6b4f12",
              fontWeight: 500,
            }}>
              <span style={{ fontSize: "1.2rem" }}>📎</span>
              Upload an image or PDF with CA questions — I'll read and answer them!
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isAssistant = m.role === "assistant";
          const dialogue =
            isAssistant && isDialogue(m.content) ? parseDialogueLines(m.content) : null;

          return (
            <div
              key={i}
              className={`chat-bubble-row ${m.role === "user" ? "chat-bubble-row-user" : "chat-bubble-row-assistant"}`}
            >
              {isAssistant && (
                <div className="chat-avatar-video" aria-hidden="true">
                  <div className={`chat-avatar-wave${speakingIndex === i ? " chat-avatar-video-active" : ""}`} />
                </div>
              )}

              <div className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                <div className="chat-bubble-role">
                  {m.role === "user" ? "You" : "CA Tutor"}
                </div>

                {/* Attachment preview inside user bubble */}
                {m.role === "user" && (m.attachmentPreview || m.attachmentName) && (
                  <MsgAttachBubble previewUrl={m.attachmentPreview} name={m.attachmentName} />
                )}

                {dialogue ? (
                  <div className="dialogue-block">
                    {dialogue.map((ln, di) => (
                      <div
                        key={di}
                        className={`dialogue-line dialogue-line-${ln.speaker === "A" ? "a" : ln.speaker === "B" ? "b" : "neutral"}`}
                        aria-label={ln.speaker ? `User ${ln.speaker}` : "Dialogue"}
                      >
                        {ln.speaker && <span className="dialogue-speaker">User {ln.speaker}:</span>}
                        <span>{ln.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chat-bubble-content markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Footer */}
                <div className="chat-bubble-footer">
                  {m.ts && (
                    <div className="chat-bubble-time">
                      {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}

                  {isAssistant && (
                    <div className="message-actions" role="group" aria-label="Message actions">
                      <button
                        className="action-btn"
                        onClick={() => handleSpeakToggle(i, stripMarkdown(m.content))}
                        title="Text to speech"
                      >
                        {speakLabel(i)}
                      </button>
                      {speakingIndex === i && (
                        <button className="action-btn" onClick={stopSpeech} title="Stop audio">
                          ⏹ Stop
                        </button>
                      )}
                      <button
                        className="action-btn"
                        onClick={() => setOpenSources((p) => ({ ...p, [i]: !p[i] }))}
                        title={openSources[i] ? "Hide sources" : "Show sources"}
                      >
                        {openSources[i] ? "📚 Hide" : "📚 Sources"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Sources */}
                {isAssistant && m.sources && m.sources.length > 0 && openSources[i] && (
                  <div className="chat-sources" aria-label="Sources">
                    <div className="chat-sources-title">Sources Used</div>
                    <ul className="chat-sources-list">
                      {m.sources.map((s, si) => {
                        const title = s.doc_title || s.source || "Unknown source";
                        const page =
                          s.page_start
                            ? s.page_end && s.page_end !== s.page_start
                              ? `Pages ${s.page_start}–${s.page_end}`
                              : `Page ${s.page_start}`
                            : null;
                        const tag = [s.chapter, s.topic].filter(Boolean).join(" • ");
                        return (
                          <li key={si} className="chat-source-item">
                            <div className="chat-source-title">{title}</div>
                            <div className="chat-source-meta">
                              {tag  && <span className="chat-source-meta-item">{tag}</span>}
                              {page && <span className="chat-source-meta-item">{page}</span>}
                              {typeof s.score === "number" && (
                                <span className="chat-source-meta-item">Score {s.score.toFixed(3)}</span>
                              )}
                              {s.note && <span className="chat-source-meta-item">{s.note}</span>}
                              {s.table_csv_url && (
                                <span className="chat-source-meta-item">
                                  <a href={s.table_csv_url} target="_blank" rel="noreferrer">Open CSV ↗</a>
                                </span>
                              )}
                              {s.thumb_url && (
                                <img
                                  src={s.thumb_url}
                                  alt="Figure"
                                  style={{ maxWidth: 160, borderRadius: 6, marginTop: 6, border: "1px solid #eee", display: "block" }}
                                />
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="chat-bubble-row chat-bubble-row-assistant">
            <div className="chat-avatar-video chat-avatar-video-active" aria-hidden="true">
              <div className="chat-avatar-wave" />
            </div>
            <div className="chat-bubble chat-bubble-assistant">
              <div className="chat-bubble-role">CA Tutor</div>
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="chat-input-bar" role="search" aria-label="Ask a question">

        {/* ── Attachment preview (above input bar) ── */}
        {attachment && (
          <div style={{ width: "100%", order: -1, marginBottom: 2 }}>
            <AttachPreview
              attachment={attachment}
              onRemove={() => {
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = "";
          }}
        />

        {/* Paperclip button */}
        <button
          type="button"
          className="btn-icon"
          onClick={() => fileInputRef.current?.click()}
          title="Attach image or PDF with CA questions"
          aria-label="Attach file"
          style={{
            background: attachment?.status === "ready"
              ? "rgba(16,185,129,0.12)"
              : attachment?.status === "invalid"
              ? "rgba(239,68,68,0.1)"
              : undefined,
            borderColor: attachment?.status === "ready"
              ? "rgba(16,185,129,0.4)"
              : attachment?.status === "invalid"
              ? "rgba(239,68,68,0.35)"
              : undefined,
          }}
        >
          {attachment?.status === "ready"   ? "✅" :
           attachment?.status === "reading" ? "⏳" :
           attachment?.status === "invalid" ? "❌" :
           "📎"}
        </button>

        <textarea
          ref={textareaRef}
          className="chat-input chat-textarea"
          value={input}
          onChange={(e) => { setInput(e.target.value); autoResize(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder={
            attachment?.status === "ready"
              ? "Add a follow-up question (or press Send to answer the file)…"
              : "Type your CA question… (Shift+Enter for new line)"
          }
          aria-label="Question input"
          rows={1}
        />

        {sttSupported && (
          <button
            type="button"
            className="btn-icon"
            onClick={startVoiceInput}
            title="Voice input"
            aria-label="Voice input"
          >
            🎙
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => sendMessage()}
          disabled={
            loading ||
            (!input.trim() && !attachment) ||
            attachment?.status === "reading" ||
            attachment?.status === "invalid"
          }
          aria-label="Send message"
        >
          {loading ? "…" : "Send"}
        </button>

        {scrollVisible && (
          <button
            type="button"
            className="scroll-bottom-btn"
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            aria-label="Jump to latest message"
          >
            ↓ Latest
          </button>
        )}
      </div>
    </div>
  );
};

export default Chat;

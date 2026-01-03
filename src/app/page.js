"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Link as LinkIcon,
  FileText,
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Settings
} from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [resume, setResume] = useState(null);
  const [manualDescription, setManualDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  const [status, setStatus] = useState({ step: 0, message: "" }); // { step: 1|2|3, message: "" }

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setResume(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus({ step: 1, message: "Initializing..." });
    setResult("");

    const formData = new FormData();
    formData.append("url", url);
    formData.append("resume", resume);
    formData.append("manualDescription", manualDescription);
    formData.append("apiKey", apiKey);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Try to get error text if standard error
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || response.statusText);
      }

      // Stream handling
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Process all complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          try {
            const update = JSON.parse(line);

            if (update.type === 'status') {
              setStatus({ step: update.step, message: update.message });
            } else if (update.type === 'result') {
              setResult(update.data);
            } else if (update.type === 'error') {
              throw new Error(update.message);
            }
          } catch (e) {
            console.error("Error parsing stream line:", e);
            // If manual parsing fails, we might just continue or throw if critical
            if (e.message !== "Unexpected end of JSON input") {
              // only throw actual errors from the stream payload
              if (line.includes('"type":"error"')) throw new Error(JSON.parse(line).message);
            }
          }
        }
        // Keep the last partial line in buffer
        buffer = lines[lines.length - 1];
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStatus({ step: 0, message: "" });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Enhanced PDF export
  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4', // Standard format
    });

    const margin = 25.4; // 1 inch margins
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    doc.setFont("times", "normal"); // Professional standard font
    doc.setFontSize(11); // Requested 11pt size

    // Split text to fit width
    const textLines = doc.splitTextToSize(result, contentWidth);

    // Page height check to avoid cutoff
    const pageHeight = doc.internal.pageSize.getHeight();
    const lineHeight = 5; // Approx line height for 11pt
    let cursorY = margin;

    textLines.forEach(line => {
      // Check if we need a new page
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    });

    doc.save("cover-letter.pdf");
  };

  const downloadWord = async () => {
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const { saveAs } = await import("file-saver");

    const doc = new Document({
      sections: [{
        properties: {},
        children: result.split('\n').map(line => new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 22, // 22 half-points = 11pt
              font: "Times New Roman" // Professional font
            })
          ],
          spacing: {
            after: 120, // Small spacing between paragraphs
            line: 276, // 1.15 line spacing approximation
          }
        })),
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "cover-letter.docx");
  };

  return (
    <main className="min-h-screen w-full px-4 py-12 md:p-24 flex flex-col items-center font-sans">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <span className="px-4 py-1.5 rounded-full glass text-[#6366f1] text-sm font-medium mb-4 inline-block">
          AI-Powered Career Assistant
        </span>
        <h1 className="text-4xl md:text-6xl mb-6 font-display font-extrabold tracking-tight">
          Your Next Career Move, <br />
          <span className="text-[#6366f1]">Perfected in Seconds.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Paste a job link, upload your resume, and let our AI craft a bespoke
          cover letter that highlights your unique strengths.
        </p>
      </motion.div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Input Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-8 flex flex-col gap-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="text-accent w-5 h-5" />
              <h2 className="text-xl font-display font-semibold">Create your Letter</h2>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"
              title="Settings"
            >
              <Settings className={`transition-transform ${showSettings ? 'rotate-90' : ''}`} size={18} />
            </button>
          </div>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-white/10 pb-6"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Sparkles size={14} className="text-[#6366f1]" /> Gemini API Key
                  </label>
                  <input
                    type="password"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/20 transition-all shadow-inner"
                    placeholder="Enter your Gemini API Key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500">
                    Get your free key at <a href="https://aistudio.google.com/" target="_blank" className="text-[#6366f1] underline hover:text-[#8b5cf6]">Google AI Studio</a>. Keys are only used for generation.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Job Posting URL */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold"><LinkIcon size={14} /> Job Posting URL</span>
                <button
                  type="button"
                  onClick={() => setIsManual(!isManual)}
                  className="text-xs text-[#6366f1] hover:text-[#8b5cf6] hover:underline"
                >
                  {isManual ? "Use URL instead" : "Paste manually"}
                </button>
              </label>
              {isManual ? (
                <textarea
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/20 transition-all min-h-[120px] resize-none shadow-inner"
                  placeholder="Paste the job requirements here..."
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
              ) : (
                <input
                  type="url"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-[#6366f1]/20 transition-all shadow-inner"
                  placeholder="https://linkedin.com/jobs/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required={!isManual}
                />
              )}
            </div>

            {/* Resume Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2 font-semibold">
                <FileText size={14} /> Resume (PDF/DOCX)
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all text-center
                  ${resume ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-accent'}
                `}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className={`${resume ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-sm text-slate-300">
                    {resume ? resume.name : "Drag and drop or click to upload"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              disabled={loading || !resume || (!url && !manualDescription) || !apiKey}
              type="submit"
              className="w-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:scale-[1.02] active:scale-[0.98] py-4 px-6 rounded-xl font-bold text-white shadow-[0_8px_25px_-5px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-2 w-full">
                  <div className="flex items-center gap-3 text-sm font-medium text-white/90">
                    <Loader2 className="animate-spin text-[#6366f1]" size={20} />
                    {status.message}
                  </div>
                  {/* Progress Bars */}
                  <div className="flex gap-2 w-full max-w-[200px]">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-500
                           ${status.step >= step ? 'bg-[#6366f1]' : 'bg-white/10'} 
                           ${status.step === step ? 'animate-pulse' : ''}
                         `}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  Generate Cover Letter
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Preview Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-6 md:sticky md:top-8"
        >
          <div className="glass p-8 min-h-[500px] flex flex-col rounded-2xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <FileText size={18} />
                Preview
              </h3>
              {result && (
                <div className="flex gap-2">
                  <button onClick={copyToClipboard} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-slate-200">
              {result ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {result}
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <p>Your generated letter will appear here.</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex gap-3"
                >
                  <button
                    onClick={downloadPDF}
                    className="flex-1 py-3 px-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                  <button
                    onClick={downloadWord}
                    className="flex-1 py-3 px-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <FileText size={16} />
                    Word Doc
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

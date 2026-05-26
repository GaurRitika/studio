import { useState, useEffect } from "react";
import { X, Download, FileText, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { RenderSlide } from "./slides/SlideLayouts";
import type { SlideData, SlideStyle } from "./slides/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  slides: SlideData[];
  style: SlideStyle;
  accent: string;
  watermark?: string;
};

type ExportStatus = "idle" | "loading_scripts" | "rendering" | "success" | "error";

export function ExportModal({ isOpen, onClose, slides, style, accent, watermark }: Props) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStatus("idle");
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Dynamically load a script from a CDN
  const loadScript = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already exists
      const existing = document.querySelector(`script[src="${url}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${url}`));
      document.body.appendChild(script);
    });
  };

  const ensureLibraries = async () => {
    setStatus("loading_scripts");
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
    } catch (err) {
      console.error(err);
      throw new Error("Failed to load export engines. Please check your internet connection.");
    }
  };

  const triggerDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPNG = async () => {
    try {
      await ensureLibraries();
      setStatus("rendering");
      setProgress(0);

      const html2canvas = (window as any).html2canvas;
      if (!html2canvas) throw new Error("Exporter engine not fully loaded.");

      // Iterate and render each slide
      for (let i = 0; i < slides.length; i++) {
        setProgress(Math.round(((i) / slides.length) * 100));
        
        // Select the hidden full-size slide element
        const element = document.getElementById(`export-slide-target-${i}`);
        if (!element) continue;

        // Perform canvas capture with high-resolution scale (2x for retina quality)
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        });

        const dataUrl = canvas.toDataURL("image/png");
        triggerDownload(dataUrl, `carousel-slide-${i + 1}.png`);
      }

      setProgress(100);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "An error occurred during PNG compilation.";
      if (errMsg.toLowerCase().includes("oklch")) {
        errMsg = "Your premium template uses modern Tailwind v4 OKLCH colors, which legacy client-side canvas renderers cannot parse. Please ensure your backend worker is running ('npm run dev' inside backend-worker) for high-fidelity Playwright captures.";
      }
      setErrorMessage(errMsg);
      setStatus("error");
    }
  };

  const handleExportPDF = async () => {
    try {
      await ensureLibraries();
      setStatus("rendering");
      setProgress(0);

      const html2canvas = (window as any).html2canvas;
      const jspdfModule = (window as any).jspdf;

      if (!html2canvas || !jspdfModule) {
        throw new Error("Export engines not fully loaded.");
      }

      // Initialize PDF (Premium 4:5 Portrait aspect ratio)
      const pdf = new jspdfModule.jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [1080, 1350],
      });

      for (let i = 0; i < slides.length; i++) {
        setProgress(Math.round(((i) / slides.length) * 100));

        const element = document.getElementById(`export-slide-target-${i}`);
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");

        if (i > 0) {
          pdf.addPage([1080, 1350], "portrait");
        }
        
        // Render canvas image to fill the entire page dimensions
        pdf.addImage(imgData, "PNG", 0, 0, 1080, 1350);
      }

      setProgress(100);
      setStatus("success");
      pdf.save("carousel-studio.pdf");
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "An error occurred during PDF assembly.";
      if (errMsg.toLowerCase().includes("oklch")) {
        errMsg = "Your premium template uses modern Tailwind v4 OKLCH colors, which legacy client-side canvas renderers cannot parse. Please ensure your backend worker is running ('npm run dev' inside backend-worker) for high-fidelity Playwright captures.";
      }
      setErrorMessage(errMsg);
      setStatus("error");
    }
  };

  const handleServerExport = async (format: "png" | "pdf") => {
    try {
      setStatus("rendering");
      setProgress(10);

      // Collect all slide HTML markups in a single loop
      const htmls: string[] = [];
      for (let i = 0; i < slides.length; i++) {
        const element = document.getElementById(`export-slide-target-${i}`);
        if (element) {
          htmls.push(element.innerHTML);
        }
      }

      if (htmls.length === 0) {
        throw new Error("No slides found to compile.");
      }

      setProgress(30);

      // Instantiated a single optimized 60-second AbortController timeout to safeguard backend operations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const fontUrl = style.font.includes("Space")
        ? "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
        : "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

      try {
        const response = await fetch("http://localhost:5000/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            htmls,
            format,
            fontUrl
          })
        });

        clearTimeout(timeoutId);
        setProgress(70);

        if (!response.ok) {
          throw new Error("Server engine returned a failure status.");
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.success) {
            if (format === "pdf" && data.fileUrl) {
              triggerDownload(data.fileUrl, "carousel-studio.pdf");
            } else if (format === "png" && Array.isArray(data.fileUrls)) {
              data.fileUrls.forEach((url: string, idx: number) => {
                triggerDownload(url, `carousel-slide-${idx + 1}.png`);
              });
            } else if (data.fileUrl) {
              triggerDownload(data.fileUrl, `carousel-slide.${format}`);
            } else {
              throw new Error("Invalid output received from server engine.");
            }
          } else {
            throw new Error(data.error || "Server failed to compile designs.");
          }
        } else {
          // Direct binary fallback
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          triggerDownload(url, format === "pdf" ? "carousel-studio.pdf" : "carousel-slide.png");
          window.URL.revokeObjectURL(url);
        }

        setProgress(100);
        setStatus("success");
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err: any) {
      console.warn("⚠️ Playwright backend is offline. Running client-side canvas fallback...", err.message || err);
      if (format === "pdf") {
        await handleExportPDF();
      } else {
        await handleExportPNG();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={status !== "rendering" && status !== "loading_scripts" ? onClose : undefined}
      />
      
      {/* Modal Card */}
      <div className="relative glass-strong border border-border w-[min(100%-1rem,540px)] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden float-in max-h-[90vh] flex flex-col">
        {/* Glow overlay */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative">
          <div>
            <h3 className="font-display font-semibold text-xl text-foreground">Export Studio</h3>
            <p className="text-xs text-muted-foreground mt-0.5">High-fidelity 1080×1350 client exports</p>
          </div>
          {status !== "rendering" && status !== "loading_scripts" && (
            <button 
              onClick={onClose}
              className="size-8 rounded-full bg-white/5 border border-border hover:bg-white/10 text-muted-foreground hover:text-foreground grid place-items-center transition cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin py-2">
          {status === "idle" && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-border rounded-2xl p-4 flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Carousel Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Slides Count</span>
                    <span className="text-foreground text-sm font-semibold">{slides.length} slides</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Visual Template</span>
                    <span className="text-foreground text-sm font-semibold">{style.font.includes("Space") ? "Cyber Grotesk" : "Minimalist Editorial"}</span>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* PNG Card */}
                <button
                  onClick={() => handleServerExport("png")}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border border-border bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/50 text-center transition group cursor-pointer"
                >
                  <div className="size-12 rounded-xl gradient-primary text-white grid place-items-center mb-4 shadow glow-shadow group-hover:scale-110 transition-transform">
                    <Download className="size-5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Individual PNGs</span>
                  <span className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                    High-res exports rendered via Playwright Chrome. Perfect for Instagram.
                  </span>
                </button>

                {/* PDF Card */}
                <button
                  onClick={() => handleServerExport("pdf")}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border border-border bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/50 text-center transition group cursor-pointer"
                >
                  <div className="size-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white grid place-items-center mb-4 shadow group-hover:scale-110 transition-transform">
                    <FileText className="size-5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Document PDF</span>
                  <span className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                    Combines all slides in order into a premium single document. Ideal for LinkedIn.
                  </span>
                </button>
              </div>
            </div>
          )}

          {(status === "loading_scripts" || status === "rendering") && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="size-10 text-primary animate-spin mb-4" />
              <h4 className="text-sm font-semibold text-foreground">
                {status === "loading_scripts" ? "Loading export engines…" : "Compiling design slides…"}
              </h4>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                {status === "loading_scripts" 
                  ? "Initializing local vector engines. Please wait."
                  : `Capturing frames locally at 2x resolution. Progress: ${progress}%`}
              </p>

              {status === "rendering" && (
                <div className="w-full max-w-xs bg-white/5 border border-border rounded-full h-2 mt-6 overflow-hidden">
                  <div 
                    className="gradient-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-bounce-short">
              <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 grid place-items-center mb-4">
                <CheckCircle2 className="size-8" />
              </div>
              <h4 className="text-base font-bold text-foreground">Export completed!</h4>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                Files compiled and delivered to your downloads. Your designs are ready to publish!
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-xs cursor-pointer shadow hover:scale-[1.02] active:scale-95 transition"
              >
                Return to Editor
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="size-14 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 grid place-items-center mb-4">
                <AlertTriangle className="size-8" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Export crashed</h4>
              <p className="text-xs text-red-400 mt-2 max-w-xs px-4 bg-red-500/5 rounded-xl border border-red-500/10 py-3 font-mono text-left text-[10px]">
                {errorMessage}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStatus("idle")}
                  className="px-5 py-2 rounded-xl glass border border-border text-xs font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 
        HIDDEN RENDERING LAYER
        This mounts full-size 1080x1080 slides absolute offscreen.
        Since they are rendered at true 1080x1080 without scale overrides, 
        html2canvas grabs pixel-perfect details at true size.
      */}
      <div 
        className="absolute"
        style={{
          width: "1080px",
          height: "1350px",
          top: "-9999px",
          left: "-9999px",
          pointerEvents: "none",
        }}
      >
        {slides.map((slide, idx) => (
          <div 
            key={idx} 
            id={`export-slide-target-${idx}`}
            className="w-[1080px] h-[1350px] overflow-hidden"
          >
            <RenderSlide data={slide} style={style} accent={accent} watermark={watermark} />
          </div>
        ))}
      </div>
    </div>
  );
}

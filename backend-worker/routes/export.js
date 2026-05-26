import express from "express";

const router = express.Router();

/**
 * @route   POST /api/export
 * @desc    Render slide HTML markup and capture a high-resolution 1080x1080 screenshot
 *          Uses the global warm Playwright browser (Gotcha B) and waits for custom fonts (Gotcha A).
 * @access  Public
 */
router.post("/", async (req, res) => {
  const { html, format = "png", fontUrl } = req.body;

  // 1. Validation check on required HTML markup
  if (!html || typeof html !== "string" || html.trim().length === 0) {
    return res.status(400).json({
      error: "Renderable HTML markup is required to export slides.",
    });
  }

  // 2. Fetch the warm shared Playwright browser instance from Express locals
  const browser = req.app.locals.browser;
  if (!browser) {
    return res.status(500).json({
      error: "Headless rendering service is offline. Please try restarting the server.",
    });
  }

  console.log(`📸 Export Request received: Capturing ${format.toUpperCase()} screenshot.`);

  let context = null;
  let page = null;

  try {
    // 3. Open a lightweight, sandboxed browser context (Tab isolation optimization)
    context = await browser.newContext({
      viewport: { width: 1080, height: 1080 },
      deviceScaleFactor: 2, // Retains high-fidelity sharpness for standard displays (2x retina)
    });

    page = await context.newPage();

    // 4. Wrap HTML with full viewport constraints, standard fonts, and reset styles
    // Injects Google Web Fonts dynamically if a custom font link is supplied (Gotcha A)
    const fontStyles = fontUrl 
      ? `<link rel="preconnect" href="https://fonts.googleapis.com">
         <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
         <link rel="stylesheet" href="${fontUrl}">`
      : "";

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          ${fontStyles}
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 1080px;
              height: 1080px;
              overflow: hidden;
              background-color: transparent;
            }
          </style>
        </head>
        <body>
          <div style="width: 1080px; height: 1080px; position: relative;">
            ${html}
          </div>
        </body>
      </html>
    `;

    // 5. Inject the content and wait for network assets to settle
    await page.setContent(fullHtml, { waitUntil: "networkidle" });

    // 6. Gotcha A: Wait for custom Google Fonts to load fully before screenshotting
    // Prevents text falling back to standard Courier/Arial in headless Linux containers
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    let buffer;
    if (format.toLowerCase() === "pdf") {
      // PDF layout sizing
      buffer = await page.pdf({
        width: "1080px",
        height: "1080px",
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
    } else {
      // Standard sharp PNG export
      buffer = await page.screenshot({
        type: "png",
        omitBackground: true, // Allows transparent overlays if design uses transparent gradients
      });
    }

    console.log("✅ Screenshot captured successfully.");

    // 7. Check if Supabase keys are configured. If yes, upload to Storage Bucket (REST client)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucketName = process.env.SUPABASE_BUCKET_NAME || "carousel-exports";

    if (supabaseUrl && supabaseKey) {
      const fileExt = format.toLowerCase() === "pdf" ? "pdf" : "png";
      const fileName = `export_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

      try {
        console.log("☁️ Supabase: Uploading screenshot buffer via native REST client...");
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": fileExt === "pdf" ? "application/pdf" : "image/png",
            "x-upsert": "true"
          },
          body: buffer
        });

        if (uploadResponse.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
          console.log(`☁️ Supabase: Export successfully uploaded to CDN: ${publicUrl}`);
          
          return res.json({
            success: true,
            fileUrl: publicUrl,
            format: format
          });
        } else {
          const errorText = await uploadResponse.text();
          console.warn("⚠️ Supabase Storage REST upload failed. Streaming binary buffer fallback. Details:", errorText);
        }
      } catch (supabaseError) {
        console.error("🔴 Supabase Connection Failed. Streaming binary buffer fallback. Details:", supabaseError.message);
      }
    }

    // 8. Default Local Fallback: Stream binary buffer directly with download headers
    if (format.toLowerCase() === "pdf") {
      res.set("Content-Type", "application/pdf");
      res.set("Content-Disposition", "attachment; filename=carousel-slide.pdf");
    } else {
      res.set("Content-Type", "image/png");
      res.set("Content-Disposition", "attachment; filename=carousel-slide.png");
    }

    console.log("📦 Local Streaming: Direct binary streamed to browser.");
    return res.send(buffer);

  } catch (err) {
    console.error("🔴 Playwright screenshot crash:", err.message);
    return res.status(500).json({
      error: "Headless render engine crashed while screenshotting slide layout.",
    });
  } finally {
    // 7. Clean up browser tabs immediately to reclaim RAM memory (Scale optimization)
    if (page) await page.close();
    if (context) await context.close();
    console.log("🧹 Export context closed and garbage collected.");
  }
});

export default router;

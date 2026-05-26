import express from "express";

const router = express.Router();

/**
 * @route   POST /api/export
 * @desc    Render slide HTML markup and capture a high-resolution 1080x1080 screenshot
 *          Uses the global warm Playwright browser (Gotcha B) and waits for custom fonts (Gotcha A).
 * @access  Public
 */
router.post("/", async (req, res) => {
  const { html, htmls, format = "png", fontUrl } = req.body;

  // 1. Validation check on required HTML markup (either single html string or htmls array)
  if ((!html || typeof html !== "string" || html.trim().length === 0) && (!htmls || !Array.isArray(htmls) || htmls.length === 0)) {
    return res.status(400).json({
      error: "Renderable HTML markup or an array of slide HTMLs is required to export slides.",
    });
  }

  // Treat single html input as a single-element array internally
  const activeHtmls = htmls && Array.isArray(htmls) ? htmls : [html];

  // 2. Fetch the warm shared Playwright browser instance from Express locals
  const browser = req.app.locals.browser;
  if (!browser) {
    return res.status(500).json({
      error: "Headless rendering service is offline. Please try restarting the server.",
    });
  }

  console.log(`📸 Export Request received: Capturing ${activeHtmls.length} slide(s) in ${format.toUpperCase()} format.`);

  let context = null;
  let page = null;

  try {
    // 3. Open a lightweight, sandboxed browser context (Tab isolation optimization)
    // Adjusted viewport size to 1080x1350 (Premium 4:5 vertical aspect ratio) to prevent bottom CTA cutoff
    context = await browser.newContext({
      viewport: { width: 1080, height: 1350 },
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

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucketName = process.env.SUPABASE_BUCKET_NAME || "carousel-exports";

    // --- CASE A: MULTI-PAGE PDF GENERATION ---
    if (format.toLowerCase() === "pdf" && activeHtmls.length > 1) {
      const compiledSlides = activeHtmls.map(slideHtml => `
        <div class="slide-page">
          ${slideHtml}
        </div>
      `).join("\n");

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
                background-color: transparent;
              }
              .slide-page {
                width: 1080px;
                height: 1350px;
                page-break-after: always;
                break-after: page;
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
              }
            </style>
          </head>
          <body>
            ${compiledSlides}
          </body>
        </html>
      `;

      await page.setContent(fullHtml, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const buffer = await page.pdf({
        width: "1080px",
        height: "1350px",
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });

      console.log("✅ Multi-page PDF compiled successfully.");

      if (supabaseUrl && supabaseKey) {
        const fileName = `export_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.pdf`;
        const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

        try {
          console.log("☁️ Supabase: Uploading PDF buffer via native REST client...");
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/pdf",
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
              format: "pdf"
            });
          }
        } catch (err) {
          console.warn("⚠️ Supabase Storage upload failed. Streaming binary buffer instead.", err);
        }
      }

      // Stream PDF directly as fallback
      res.set("Content-Type", "application/pdf");
      res.set("Content-Disposition", "attachment; filename=carousel-studio.pdf");
      return res.send(buffer);
    }

    // --- CASE B: MULTI-IMAGE PNG GENERATION ---
    if (format.toLowerCase() === "png" && activeHtmls.length > 1) {
      const fileUrls = [];

      for (let i = 0; i < activeHtmls.length; i++) {
        const slideHtml = activeHtmls[i];
        const singleHtml = `
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
                  height: 1350px;
                  overflow: hidden;
                  background-color: transparent;
                }
              </style>
            </head>
            <body>
              <div style="width: 1080px; height: 1350px; position: relative;">
                ${slideHtml}
              </div>
            </body>
          </html>
        `;

        await page.setContent(singleHtml, { waitUntil: "networkidle" });
        await page.evaluate(async () => {
          await document.fonts.ready;
        });

        const slideBuffer = await page.screenshot({
          type: "png",
          omitBackground: true,
        });

        if (supabaseUrl && supabaseKey) {
          const fileName = `export_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}.png`;
          const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

          console.log(`☁️ Supabase: Uploading PNG slide ${i + 1}/${activeHtmls.length} via native REST client...`);
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "image/png",
              "x-upsert": "true"
            },
            body: slideBuffer
          });

          if (uploadResponse.ok) {
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
            fileUrls.push(publicUrl);
          } else {
            const errorText = await uploadResponse.text();
            throw new Error(`Supabase upload failed for slide ${i + 1}: ${errorText}`);
          }
        } else {
          // Local fallback base64
          const base64 = slideBuffer.toString("base64");
          fileUrls.push(`data:image/png;base64,${base64}`);
        }
      }

      console.log(`✅ All ${activeHtmls.length} PNGs compiled successfully.`);
      return res.json({
        success: true,
        fileUrls: fileUrls,
        format: "png"
      });
    }

    // --- CASE C: SINGLE SLIDE PNG/PDF GENERATION (BACKWARDS COMPATIBILITY) ---
    const singleHtml = `
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
              height: 1350px;
              overflow: hidden;
              background-color: transparent;
            }
          </style>
        </head>
        <body>
          <div style="width: 1080px; height: 1350px; position: relative;">
            ${activeHtmls[0]}
          </div>
        </body>
      </html>
    `;

    await page.setContent(singleHtml, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    let buffer;
    if (format.toLowerCase() === "pdf") {
      buffer = await page.pdf({
        width: "1080px",
        height: "1350px",
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
    } else {
      buffer = await page.screenshot({
        type: "png",
        omitBackground: true,
      });
    }

    console.log("✅ Single slide captured successfully.");

    if (supabaseUrl && supabaseKey) {
      const fileExt = format.toLowerCase() === "pdf" ? "pdf" : "png";
      const fileName = `export_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

      try {
        console.log("☁️ Supabase: Uploading single screenshot buffer via REST client...");
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
        }
      } catch (supabaseError) {
        console.warn("⚠️ Supabase Storage REST upload failed. Streaming binary buffer fallback.");
      }
    }

    // Default Local Fallback
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
    if (page) await page.close();
    if (context) await context.close();
    console.log("🧹 Export context closed and garbage collected.");
  }
});

export default router;

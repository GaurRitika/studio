/**
 * Validation & Constraint Fixer (Stage 4)
 * Hard-guards template layouts by truncating any characters or lists that exceed 
 * structural constraints. This guarantees templates never break or clip.
 * 
 * @param {Array} slides - Array of raw slide objects returned by the LLM
 * @param {object} constraints - Selected template limits (maxTitleChars, maxBodyChars, etc.)
 * @returns {Array} - Cleaned, layout-safe slide array
 */
export function validateAndFix(slides, constraints = {}) {
  // Setup safe defaults matching the master schema
  const c = {
    maxTitleChars: constraints.maxTitleChars || 45,
    maxBodyChars: constraints.maxBodyChars || 120,
    maxBullets: constraints.maxBullets || 3,
    maxBulletChars: constraints.maxBulletChars || 45,
  };

  if (!Array.isArray(slides)) {
    console.warn("⚠️ Validator received a non-array slide parameter. Returning empty array.");
    return [];
  }

  return slides.map(slide => {
    const cleaned = { ...slide };

    // 1. Clean Title (applies to all slide types)
    if (cleaned.title && typeof cleaned.title === "string") {
      if (cleaned.title.length > c.maxTitleChars) {
        cleaned.title = cleaned.title.slice(0, c.maxTitleChars - 1).trim() + "…";
      }
    }

    // 2. Clean Subtitle / Tag
    if (cleaned.subtitle && typeof cleaned.subtitle === "string") {
      if (cleaned.subtitle.length > 25) {
        cleaned.subtitle = cleaned.subtitle.slice(0, 24).trim() + "…";
      }
    }

    // 3. Clean Body description
    if (cleaned.body && typeof cleaned.body === "string") {
      if (cleaned.body.length > c.maxBodyChars) {
        cleaned.body = cleaned.body.slice(0, c.maxBodyChars - 1).trim() + "…";
      }
    }

    // 4. Clean Bullets (only for "bullets" slide kind)
    if (cleaned.kind === "bullets") {
      const bulletList = Array.isArray(cleaned.bullets) ? cleaned.bullets : [];
      cleaned.bullets = bulletList
        .slice(0, c.maxBullets) // Guard bullet count
        .map(bullet => {
          if (typeof bullet !== "string") return "";
          if (bullet.length > c.maxBulletChars) {
            return bullet.slice(0, c.maxBulletChars - 1).trim() + "…";
          }
          return bullet;
        })
        .filter(b => b.length > 0);
    }

    // 5. Clean Quote & Attribution (only for "quote" slide kind)
    if (cleaned.kind === "quote") {
      if (cleaned.quote && typeof cleaned.quote === "string") {
        const maxQuote = 150; // Quotes need a safe absolute threshold
        if (cleaned.quote.length > maxQuote) {
          cleaned.quote = cleaned.quote.slice(0, maxQuote - 1).trim() + "…";
        }
      }
      if (cleaned.author && typeof cleaned.author === "string") {
        if (cleaned.author.length > 40) {
          cleaned.author = cleaned.author.slice(0, 39).trim() + "…";
        }
      }
    }

    // 6. Clean Stat numbers (only for "stat" slide kind)
    if (cleaned.kind === "stat") {
      if (cleaned.stat && typeof cleaned.stat === "string") {
        if (cleaned.stat.length > 8) {
          cleaned.stat = cleaned.stat.slice(0, 7) + "…";
        }
      }
      if (cleaned.statLabel && typeof cleaned.statLabel === "string") {
        if (cleaned.statLabel.length > 60) {
          cleaned.statLabel = cleaned.statLabel.slice(0, 59).trim() + "…";
        }
      }
    }

    return cleaned;
  });
}

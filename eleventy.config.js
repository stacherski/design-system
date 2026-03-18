const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

module.exports = function (eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");

  // ─── FILTERS ──────────────────────────────────────────────────────────────

  eleventyConfig.addFilter("byComponent", (collection, componentName) => {
    return collection.filter((item) => item.componentName === componentName);
  });

  eleventyConfig.addFilter("byCategory", (tokens, categorySlug) => {
    return tokens.filter((t) => t.categorySlug === categorySlug);
  });

  eleventyConfig.addFilter("slugify", (str) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  });

  // ─── COLLECTIONS ──────────────────────────────────────────────────────────

  eleventyConfig.addCollection("componentPages", (collectionApi) => {
    const components = require("./src/_data/components.json");
    return components;
  });

  eleventyConfig.addCollection("tokenCategoryPages", (collectionApi) => {
    const categories = require("./src/_data/tokenCategories.json");
    return categories;
  });

  const componentsDir = "src/assets/js/components";
  const componentsCssDir = "src/assets/css/components";

  eleventyConfig.addCollection("components", () => {
    return fs.readdirSync(componentsDir)
      .filter(f => f.endsWith("-component.js"));
  });

  eleventyConfig.addWatchTarget(componentsDir);
  eleventyConfig.addWatchTarget(componentsCssDir);

  // ─── BUILD ────────────────────────────────────────────────────────────────

  eleventyConfig.on("eleventy.before", async ({ runMode }) => {

    // Delete previous bundled assets before rebuilding
    for (const staleFile of [
      "_site/assets/js/components.js",
      "_site/assets/js/components.js.map",
      "_site/assets/css/components.css",
      "_site/assets/css/components.css.map",
    ]) {
      fs.rmSync(staleFile, { force: true });
    }

    const jsFiles = fs.readdirSync(componentsDir)
      .filter(f => f.endsWith("-component.js"));
    const cssFiles = fs.readdirSync(componentsCssDir)
      .filter(f => f.endsWith("-component.css"));

    const jsImports = jsFiles.map(f => `import "./${f}"`).join("\n");
    const cssImports = cssFiles.map(f => `@import "./${f}";`).join("\n");

    fs.mkdirSync("_site/assets/js", { recursive: true });
    fs.mkdirSync("_site/assets/css", { recursive: true });

    await Promise.all([
      esbuild.build({
        stdin: {
          contents: jsImports,
          resolveDir: componentsDir,
          sourcefile: "components-entry.js",
        },
        bundle: true,
        outfile: "_site/assets/js/components.js",
        format: "esm",
        minify: runMode === "build",
        sourcemap: runMode !== "build",
      }),
      esbuild.build({
        stdin: {
          contents: cssImports,
          resolveDir: componentsCssDir,
          loader: "css",
          sourcefile: "components-entry.css",
        },
        bundle: true,
        outfile: "_site/assets/css/components.css",
        minify: runMode === "build",
        sourcemap: runMode !== "build",
      }),
    ]);
  });

  // ─── PAGEFIND INDEX ───────────────────────────────────────────────────────

  eleventyConfig.on("eleventy.after", async function ({ dir }) {
    const outputPath = path.join(dir.output, "pagefind");

    // Delete stale index so old pages don't linger
    fs.rmSync(outputPath, { recursive: true, force: true });

    console.log("[pagefind] Indexing %s…", dir.output);
    const pagefind = await import("pagefind");
    const { index } = await pagefind.createIndex();
    const { page_count } = await index.addDirectory({ path: dir.output });
    await index.writeFiles({ outputPath });
    console.log("[pagefind] Indexed %i page(s) → %s", page_count, outputPath);
  });

  // ─── ELEVENTY CONFIG ──────────────────────────────────────────────────────

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
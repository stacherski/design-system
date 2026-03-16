const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");

const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')
const componentsDir = "src/assets/js/components"

module.exports = function (eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");

  // ─── FILTERS ────────────────────────────────────────────────────────────────

  // Filter components' related data by component name
  eleventyConfig.addFilter("byComponent", (collection, componentName) => {
    return collection.filter((item) => item.componentName === componentName);
  });

  // Filter tokens by category slug
  eleventyConfig.addFilter("byCategory", (tokens, categorySlug) => {
    return tokens.filter((t) => t.categorySlug === categorySlug);
  });

  // Slugify a string
  eleventyConfig.addFilter("slugify", (str) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  });

  // Safely render raw HTML (Nunjucks auto-escapes, use | safe)
  // Already built-in as `| safe` in Nunjucks.

  // ─── COLLECTIONS ────────────────────────────────────────────────────────────

  // One collection entry per component (so we can paginate / generate routes)
  eleventyConfig.addCollection("componentPages", (collectionApi) => {
    // We derive the list from the JSON data file at build time
    const components = require("./src/_data/components.json");
    return components;
  });

  // One collection entry per token category
  eleventyConfig.addCollection("tokenCategoryPages", (collectionApi) => {
    const categories = require("./src/_data/tokenCategories.json");
    return categories;
  });

  const componentsDir = "src/assets/js/components"

  eleventyConfig.addCollection("components", () => {
    return fs.readdirSync(componentsDir)
      .filter(f => f.endsWith("-component.js"))
  })

  eleventyConfig.addWatchTarget(componentsDir)

  eleventyConfig.on("eleventy.before", async ({ runMode }) => {

    const files = fs.readdirSync(componentsDir)
      .filter(f => f.endsWith("-component.js"))

    const imports = files
      .map(f => `import "./${f}"`)
      .join("\n")

    fs.mkdirSync("_site/assets", { recursive: true })

    await esbuild.build({
      stdin: {
        contents: imports,
        resolveDir: componentsDir,
        sourcefile: "components-entry.js"
      },
      bundle: true,
      outfile: "_site/assets/js/components.js",
      format: "esm",
      minify: runMode === "build",
      sourcemap: runMode !== "build"
    })

  })

  eleventyConfig.addWatchTarget("src/assets/js/components")

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

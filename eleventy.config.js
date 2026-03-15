const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");

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

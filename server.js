const express = require("express");
const RSSParser = require("rss-parser");
const NodeCache = require("node-cache");

const app = express();
const PORT = process.env.PORT || 3000;
const rssParser = new RSSParser();
const cache = new NodeCache({ stdTTL: 900 }); // 15 minutes

const FEEDS = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "Wired", url: "https://www.wired.com/feed/rss" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/" },
  { name: "Ars Technica", url: "http://feeds.arstechnica.com/arstechnica/index" },
  { name: "Reuters Technology", url: "http://feeds.reuters.com/reuters/technologyNews" },
  { name: "Bloomberg Technology", url: "https://www.bloomberg.com/feed/podcast/etf-report.xml" }, // Bloomberg RSS can be spotty
  { name: "Business Insider Tech", url: "https://www.businessinsider.com/rss/tech" },
  { name: "Financial Times Tech", url: "https://www.ft.com/technology?format=rss" },
  { name: "Hacker News", url: "https://news.ycombinator.com/rss" },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
  { name: "Synced Review", url: "https://syncedreview.com/feed/" },
  { name: "Inc42", url: "https://inc42.com/feed/" },
  { name: "YourStory", url: "https://yourstory.com/feed" },
  { name: "Economic Times Tech", url: "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms" },
];

function normalizeItem(item, source) {
  return {
    title: item.title || "",
    link: item.link || item.guid || "",
    source,
    publishedDate: item.isoDate || item.pubDate || "",
    summary: item.contentSnippet || item.summary || item.content || "",
  };
}

async function fetchAllFeeds() {
  const allArticles = [];
  for (const feed of FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      parsed.items.forEach(item => {
        const normalized = normalizeItem(item, feed.name);
        allArticles.push(normalized);
      });
    } catch (err) {
      console.error(`Error fetching ${feed.name}: ${err.message}`);
    }
  }
  // Sort and limit
  return allArticles
    .filter(a => a.title && a.link && a.publishedDate)
    .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))
    .slice(0, 20);
}

app.get("/news", async (req, res) => {
  try {
    let articles = cache.get("latest-news");
    if (!articles) {
      articles = await fetchAllFeeds();
      cache.set("latest-news", articles);
    }
    res.json({ success: true, total: articles.length, articles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Tech RSS News API is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/news`);
});

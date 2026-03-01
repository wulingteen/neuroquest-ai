import { OpenAI } from "openai";

export const RSS_FEEDS_LIST = [
    { name: "WIRED – Artificial Intelligence", url: "https://www.wired.com/feed/tag/ai/latest/rss" },
    { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml" },
    { name: "AI Trends", url: "https://www.aitrends.com/feed" },
    { name: "ScienceDaily – Artificial Intelligence", url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml" },
    { name: "Artificial-Intelligence. Blog – AI News", url: "https://www.artificial-intelligence.blog/ai-news?format=rss" },
    { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml" },
    { name: "Google AI Blog", url: "http://feeds.feedburner.com/blogspot/gJZg" },
    { name: "Google Research Blog", url: "https://research.google/blog/rss/" },
    { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
    { name: "TechCrunch AI", url: "https://techcrunch.com/tag/artificial-intelligence/feed/" },
    { name: "Amazon Science Blog", url: "https://www.amazon.science/index.rss" },
    { name: "Berkeley AI Research (BAIR) Blog", url: "https://bair.berkeley.edu/blog/feed.xml" },
    { name: "AI Weirdness", url: "https://aiweirdness.com/rss" },
    { name: "Medium – Artificial Intelligence Magazine", url: "https://becominghuman.ai/feed" },
    { name: "MIT AI News", url: "http://news.mit.edu/rss/topic/artificial-intelligence2" },
    { name: "NVIDIA AI Blog", url: "http://feeds.feedburner.com/nvidiablog" },
    { name: "AI Paper Review – David Stutz", url: "http://davidstutz.de/feed" },
    { name: "Microsoft Research Blog", url: "https://www.microsoft.com/en-us/research/feed" },
    { name: "fast.ai (NLP focus)", url: "https://www.fast.ai/index.xml" },
    { name: "JMLR recent papers", url: "http://www.jmlr.org/jmlr.xml" },
    { name: "Blog Distill", url: "https://distill.pub/rss.xml" },
    { name: "Blog inFERENCe", url: "https://www.inference.vc/rss/" },
    { name: "AI Reddit", url: "https://www.reddit.com/r/artificial/.rss" },
    { name: "Reddit NN, DL, ML", url: "https://www.reddit.com/r/neuralnetworks/.rss?format=xml" },
    { name: "Seita's Place (AI/ML)", url: "https://danieltakeshi.github.io/feed.xml" },
    { name: "Vitalab Literature Review", url: "https://vitalab.github.io/feed.xml" },
    { name: "Andrej Karpathy", url: "https://medium.com/feed/@karpathy" },
];

export const RANKER_MODEL = "minimax/minimax-m2.5";
export const EXAMINER_MODEL = "minimax/minimax-m2.5";

export const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "dummy_key",
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "https://neuroquest.ai",
        "X-Title": "NeuroQuest AI",
    },
});

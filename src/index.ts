import { alphabet, outputDir } from "./constants";
import { getLink, INTERVAL, ITUNES_SEARCH_MAX } from "./itunes";
import { PodcastSearchResult, SearchReturn } from "./types";
import { Queue } from "./queue";
import fs from "fs";

// Ensure output directory exists
if (!(fs.existsSync(outputDir) && fs.lstatSync(outputDir).isDirectory)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create write streams
const datePrefix = Date.now().toString();
const feedsStream = fs.createWriteStream(
  `${outputDir}/${datePrefix}-feeds.txt`,
  {
    flags: "w",
  }
);
const podcastsStream = fs.createWriteStream(
  `${outputDir}/${datePrefix}-podcasts.json`,
  {
    flags: "w",
  }
);
const noFeedStream = fs.createWriteStream(
  `${outputDir}/${datePrefix}-nofeed.json`,
  {
    flags: "w",
  }
);

// Queue fetch and perform callback when done
// Fetch podcast data
const fetchPodcastData = async (link: URL): Promise<SearchReturn> => {
  try {
    return (await (await fetch(link)).json()) as SearchReturn;
  } catch (error) {
    console.error(error);
    console.log(
      "Rate limit possibly reached. Waiting for 1 minute before retrying"
    );
    await new Promise(() =>
      setTimeout(() => console.log("Attempting to continue....", 60000))
    );
    return fetchPodcastData(link);
  }
};

const q = new Queue<{
  link: URL;
  callback: (resultPromise: Promise<SearchReturn>) => void;
}>();

const scrapedData = new Map<string, PodcastSearchResult>();

const defaultCallback = async (
  terms: string,
  tokens: string[],
  resultPromise: Promise<SearchReturn>
) => {
  const data = await resultPromise;
  console.log(`${data.resultCount} result(s) found`);
  for (const result of data.results) {
    console.log(`Saving data for feed: ${result.feedUrl}`);
    // Dedupe and save feeds and objects
    if (result.feedUrl) {
      const prevLength = scrapedData.size;
      scrapedData.set(result.feedUrl, result);
      if (scrapedData.size > prevLength) {
        feedsStream.write(`${result.feedUrl}\n`);
        podcastsStream.write(`${JSON.stringify(result)},\n`);
      }
    }
    // Track podcasts without feeds
    else {
      noFeedStream.write(`${JSON.stringify(result)},\n`);
    }
  }

  if (data.resultCount >= ITUNES_SEARCH_MAX) {
    console.log(`Fetched ${ITUNES_SEARCH_MAX} or more results`);
    console.log(`Adding items to queue with increased specificity`);
    q.enqueueBulk(
      tokens.map((letter, index) => {
        const newTerms = `${terms}${letter}`;
        const link = getLink(newTerms);
        console.log(
          `  [${index + 1}/${tokens.length}] Term: ${newTerms}, URL: ${link}`
        );
        return {
          link,
          callback: (resultPromise: Promise<SearchReturn>) =>
            defaultCallback(newTerms, tokens, resultPromise),
        };
      })
    );
    console.log("Done");
  }
};

const intervalCallback = () => {
  const item = q.dequeue();
  if (item) {
    console.log(`Fetching url: ${item.link}`);
    item.callback(fetchPodcastData(item.link));
  } else {
    console.log("No item in queue");
  }
};

const staggeredFetch = () => {
  console.log("Starting staggered fetch...");
  setInterval(intervalCallback, INTERVAL);
};

const scrape = async (tokens: string[]) => {
  console.log("Setting up initial queue...");
  q.enqueueBulk(
    tokens.map((letter, index) => {
      const link = getLink(letter);
      console.log(
        `  [${index + 1}/${tokens.length}] Term: ${letter}, URL: ${link}`
      );
      return {
        link,
        callback: (resultPromise: Promise<SearchReturn>) =>
          defaultCallback(letter, tokens, resultPromise),
      };
    })
  );
  console.log("Done\n");
  staggeredFetch();
};

scrape(alphabet);

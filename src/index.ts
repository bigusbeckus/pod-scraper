import { alphabet } from "./constants";
import { getLink, INTERVAL, ITUNES_SEARCH_MAX } from "./itunes";
import { PodcastSearchResult, SearchReturn } from "./types";
import { Queue } from "./queue";

// Queue fetch and perform callback when done
// Fetch podcast data
const fetchPodcastData = async (link: URL) => {
  return (await (await fetch(link)).json()) as SearchReturn;
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
    scrapedData.set(result.feedUrl, result);
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

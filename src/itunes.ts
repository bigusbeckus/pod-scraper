export const ITUNES_SEARCH_MAX = 200;
export const ITUNES_LINK_BASE =
  "https://itunes.apple.com/search?media=podcast&entity=podcast&attribute=titleTerm";

export const getLink = (terms: string, limit = ITUNES_SEARCH_MAX) => {
  return `${ITUNES_LINK_BASE}&limit=${limit}&term=${terms}`;
};

// Rate limit values (20 calls per minute)
export const INTERVAL = 3000; // Interval between api calls in ms

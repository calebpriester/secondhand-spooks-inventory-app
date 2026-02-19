export function buildThriftbooksUrl(title: string, author?: string): string {
  const query = author ? `${title} ${author}` : title;
  return `https://www.thriftbooks.com/browse/?b.search=${encodeURIComponent(query)}`;
}

export function buildEbaySoldUrl(title: string, author?: string): string {
  const query = author ? `${title} ${author}` : title;
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Complete=1&LH_Sold=1&_sacat=267`;
}

export function buildGoodreadsUrl(title: string, author?: string): string {
  const query = author ? `${title} ${author}` : title;
  return `https://www.goodreads.com/search?q=${encodeURIComponent(query)}`;
}

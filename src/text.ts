const separators = ["\n\n", "\n", " ", ""];

export function trim(html: string) {
  return html.replace(/(\r\n|\n|\r)/gm, '')
      .replace(/\s+/g, ' ')
      .replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')
      .trim();
}

/**
 * splitText() was obtained from langchainjs.
 * https://github.com/hwchase17/langchainjs/blob/dfffba1ba1896a6c54f83792d3cdd930d68f9d83/langchain/src/text_splitter.ts
 */
export function splitText(
  text: string,
  chunkSize = 1000,
  chunkOverlap = 200
): string[] {
  const finalChunks: string[] = [];

  // Get appropriate separator to use
  let separator: string = separators[separators.length - 1];
  for (const s of separators) {
    if (s === "") {
      separator = s;
      break;
    }
    if (text.includes(s)) {
      separator = s;
      break;
    }
  }

  // Now that we have the separator, split the text
  let splits: string[];
  if (separator) {
    splits = text.split(separator);
  } else {
    splits = text.split("");
  }

  // Now go merging things, recursively splitting longer texts.
  let goodSplits: string[] = [];
  for (const s of splits) {
    if (s.length < chunkSize) {
      goodSplits.push(s);
    } else {
      if (goodSplits.length) {
        const mergedText = mergeSplits(goodSplits, separator, chunkSize, chunkOverlap);
        finalChunks.push(...mergedText);
        goodSplits = [];
      }
      const otherInfo = splitText(s);
      finalChunks.push(...otherInfo);
    }
  }
  if (goodSplits.length) {
    const mergedText = mergeSplits(goodSplits, separator, chunkSize, chunkOverlap);
    finalChunks.push(...mergedText);
  }
  return finalChunks;
}

function mergeSplits(splits: string[], separator: string, chunkSize: number, chunkOverlap: number): string[] {
  const docs: string[] = [];
  const currentDoc: string[] = [];
  let total = 0;
  for (const d of splits) {
    const _len = d.length;
    if (total + _len >= chunkSize) {
      if (total > chunkSize) {
        console.warn(
          `Created a chunk of size ${total}, +
which is longer than the specified ${chunkSize}`
        );
      }
      if (currentDoc.length > 0) {
        const doc = joinDocs(currentDoc, separator);
        if (doc !== null) {
          docs.push(doc);
        }
        // Keep on popping if:
        // - we have a larger chunk than in the chunk overlap
        // - or if we still have any chunks and the length is long
        while (
          total > chunkOverlap ||
          (total + _len > chunkSize && total > 0)
        ) {
          total -= currentDoc[0].length;
          currentDoc.shift();
        }
      }
    }
    currentDoc.push(d);
    total += _len;
  }
  const doc = joinDocs(currentDoc, separator);
  if (doc !== null) {
    docs.push(doc);
  }
  return docs;
}

function joinDocs(docs: string[], separator: string): string | null {
  const text = docs.join(separator).trim();
  return text === "" ? null : text;
}
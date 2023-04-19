import * as path from 'node:path';
import { OpenAIApi, Configuration } from 'openai';
import { loadDocstore } from '../src/store.js';

function chunkPromisess(array: Promise<any>[], size: number) {
    const chunkedArr = [];
    let index = 0;
    while (index < array.length) {
        chunkedArr.push(array.slice(index, size + index));
        index += size;
    }
    return chunkedArr;
};

async function buildIndex() {
    const {
        default: { HierarchicalNSW },
    } = await import("hnswlib-node");
    const index = new HierarchicalNSW('cosine', 1536);

    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const api = new OpenAIApi(configuration);

    const docstore = loadDocstore();

    const indexPath = path.join('data', "hnswlib.index");
    index.initIndex(docstore.length);

    const promises = docstore.map(async (doc, i) => {
        try {
            const res = await api.createEmbedding({ model: 'text-embedding-ada-002', input: doc.body });
            const embedding = res.data.data[0].embedding;
            index.addPoint(embedding, i);
            console.log(`Added Point: i=${i} name=${doc.name} length=${doc.body.length}`);
        } catch (e) {
            console.error(e);
            console.log(`Error: i=${i} name=${doc.name} length=${doc.body.length}`);
        }
    });

    const chunkedPromises = chunkPromisess(promises, 3);
    for (const chunk of chunkedPromises) {
        await Promise.all(chunk);
    }
    index.writeIndexSync(indexPath);
}

buildIndex()
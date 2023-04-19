import * as fs from 'node:fs'
import * as path from 'node:path'
import * as url from 'node:url'
import { Configuration, OpenAIApi } from "openai";
import { splitText, trim } from './text.js';

export async function findDocs(query: string, k=10) {
    const {
        default: { HierarchicalNSW },
    } = await import("hnswlib-node");
    const index = new HierarchicalNSW('cosine', 1536)

    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const api = new OpenAIApi(configuration);

    const docstore = loadDocstore();

    const indexPath = path.join('data', "hnswlib.index")
    index.initIndex(docstore.length)
    await index.readIndexSync(indexPath)


    const res = await api.createEmbedding({ model: 'text-embedding-ada-002', input: query });
    const embedding = res.data.data[0].embedding;
    const result = index.searchKnn(embedding, k)
    return result.neighbors.map((docIndex, resultIndex) => ({
        doc: docstore[docIndex],
        distance: result.distances[resultIndex],
    }))
}

function load(path: string) {
    const text = fs.readFileSync(path, 'utf-8')
    const json = JSON.parse(text)

    return splitText(trim(json.body), 1000, 200).map((text) => ({
        name: json.name,
        body: text
    }))
}

export function loadDocstore() {
    const docstore = []
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(path.dirname(__filename));
    const directoryPath = path.join(__dirname, 'data', 'note');
    const files = fs.readdirSync(directoryPath)
    for (const file of files) {
        if (!file.includes('.json')) continue;
        const filePath = path.join(directoryPath, file);
        const docs = load(filePath)
        docstore.push(...docs)
    }
    return docstore
}
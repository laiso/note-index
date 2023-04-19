import { OpenAIApi, Configuration } from 'openai';
import { findDocs } from '../src/store.js';

async function main(query: string) {
    const docs = await findDocs(query, 5)

    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const api = new OpenAIApi(configuration);

    const systemPrompt = "あなたはnoteの著者です。ユーザーの質問に答えるために、以下のnoteの断片を使用してください。" + 
        "答えばnoteの文体を真似てください。" +
        "答えがわからない場合は、「わからない」とだけ答え、答えを作ろうとしないでください。" +
        "\n----------------\n" +
        docs.map((doc) => `「${doc.doc.name}」${doc.doc.body}`).join(`\n`)
    const res = await api.createChatCompletion({
        model: 'gpt-4',
        // model: 'gpt-3.5-turbo',
        temperature: 0,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
        ]
    })
    console.log(res.data.choices[0].message?.content)
}

main(process.argv[2])
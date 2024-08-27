import { IContent } from "matrix-js-sdk";
import cons from "../../client/state/cons";

export async function translateText(text: string, provider: 'deepl' | 'google'): Promise<string> {
    const f = await fetch(`${cons.ecs_base_url}/translate/${provider}/auto/${getLanguage()}`, {
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text
        }),
        method: 'POST'
    });
    if (!f.ok) {
        return 'Translation error';
    }
    const json = await f.json();
    return json.text;
}

export async function translateContent(content: IContent): Promise<IContent> {
    const clonedContent = {
        ...content
    };
    if (typeof clonedContent.body === 'string') {
        clonedContent.body = await translateText(clonedContent.body, 'google');
    }
    if (typeof clonedContent.formatted_body === 'string' && clonedContent.format === 'org.matrix.custom.html') {
        clonedContent.formatted_body = await translateText(clonedContent.formatted_body, 'google');
    }
    return clonedContent;
}

export function getLanguage() {
    return navigator.language.slice(0, 2);
}
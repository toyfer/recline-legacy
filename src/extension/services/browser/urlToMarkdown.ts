import { fetch } from "undici";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import sanitizeHtml from "sanitize-html";
import remarkStringify from "remark-stringify";


export async function urlToMarkdown(url: string): Promise<string> {
  const response = await fetch(url);
  const content = sanitizeHtml(await response.text());

  const markdown = await unified()
    .use(rehypeParse)
    .use(rehypeRemark)
    .use(remarkStringify)
    .process(content);

  return markdown.toString();
}

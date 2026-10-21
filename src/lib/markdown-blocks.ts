// Редакторын Markdown-ийг build үед энгийн блок болгоно (SPEC §6.2).
// Дэмжих: догол мөр, `- ` жагсаалт, `### ` дэд гарчиг. HTML коммент хасна. **тод** тэмдэглэгээг цэвэрлэнэ.
import type { Block } from '@/types/schemas';

const clean = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

export function markdownToBlocks(md: string): Block[] {
  const text = md.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: clean(para.join(' ')) });
    para = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('### ')) {
      flush();
      blocks.push({ type: 'h3', text: clean(line.slice(4)) });
    } else if (/^[-*] /.test(line)) {
      flush();
      blocks.push({ type: 'li', text: clean(line.slice(2)) });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks.filter((b) => b.text.length > 0);
}

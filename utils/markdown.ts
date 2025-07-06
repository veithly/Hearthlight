export const MARKDOWN_SHORTCUTS = [
  { label: 'H1', syntax: '# ', description: 'Heading 1' },
  { label: 'H2', syntax: '## ', description: 'Heading 2' },
  { label: 'H3', syntax: '### ', description: 'Heading 3' },
  { label: 'B', syntax: '**text**', description: 'Bold' },
  { label: 'I', syntax: '*text*', description: 'Italic' },
  { label: 'Link', syntax: '[text](url)', description: 'Link' },
  { label: 'Code', syntax: '`code`', description: 'Inline code' },
  { label: 'Quote', syntax: '> ', description: 'Blockquote' },
  { label: 'List', syntax: '- ', description: 'Bullet list' },
  { label: 'Task', syntax: '- [ ] ', description: 'Task list' },
];

export const insertMarkdownSyntax = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  syntax: string
): { newText: string; newCursorPosition: number } => {
  const beforeSelection = text.substring(0, selectionStart);
  const selectedText = text.substring(selectionStart, selectionEnd);
  const afterSelection = text.substring(selectionEnd);

  let newText: string;
  let newCursorPosition: number;

  if (syntax.includes('text')) {
    // Replace 'text' with selected text or position cursor there
    if (selectedText) {
      newText = beforeSelection + syntax.replace('text', selectedText) + afterSelection;
      newCursorPosition = selectionStart + syntax.length;
    } else {
      newText = beforeSelection + syntax + afterSelection;
      newCursorPosition = selectionStart + syntax.indexOf('text');
    }
  } else {
    // Simple prefix syntax (like headers, lists)
    if (syntax.endsWith(' ')) {
      newText = beforeSelection + syntax + selectedText + afterSelection;
      newCursorPosition = selectionStart + syntax.length;
    } else {
      newText = beforeSelection + syntax + selectedText + afterSelection;
      newCursorPosition = selectionEnd + syntax.length;
    }
  }

  return { newText, newCursorPosition };
};

export const getMarkdownPreview = (text: string): string => {
  // Basic markdown to HTML conversion for preview
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`(.*)`/gim, '<code>$1</code>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
    .replace(/\n/gim, '<br>');
};
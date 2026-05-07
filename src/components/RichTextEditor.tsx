'use client';
import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';

/* ── Toolbar button ─────────────────────────────────────────────────── */
function Btn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={[
        'inline-flex items-center justify-center w-7 h-7 rounded-md text-sm transition-colors select-none',
        active
          ? 'bg-indigo-600 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        disabled ? 'opacity-30 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />;
}

/* ── Main component ─────────────────────────────────────────────────── */
interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder = 'გაკვეთილის ტექსტი...', minHeight = 220 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-600 underline cursor-pointer' } }),
    ],
    immediatelyRender: false,
    content: value || '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[inherit] prose prose-sm max-w-none text-gray-800 px-4 py-3',
        'data-placeholder': placeholder,
      },
    },
    onUpdate({ editor }) {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
  });

  /* Sync external value changes (e.g. file extract) */
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href ?? '';
    const url = window.prompt('ბმულის URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent overflow-hidden bg-white">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">

        {/* History */}
        <Btn title="უკან (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clipRule="evenodd" /></svg>
        </Btn>
        <Btn title="წინ (Ctrl+Shift+Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M12.207 2.232a.75.75 0 0 0 .025 1.06l4.146 3.958H6.375a5.375 5.375 0 0 0 0 10.75H9.25a.75.75 0 0 0 0-1.5H6.375a3.875 3.875 0 0 1 0-7.75h10.003l-4.146 3.957a.75.75 0 0 0 1.036 1.085l5.5-5.25a.75.75 0 0 0 0-1.085l-5.5-5.25a.75.75 0 0 0-1.06.025Z" clipRule="evenodd" /></svg>
        </Btn>

        <Divider />

        {/* Headings */}
        <Btn title="სათაური 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <span className="font-bold text-[11px] leading-none">H1</span>
        </Btn>
        <Btn title="სათაური 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <span className="font-bold text-[11px] leading-none">H2</span>
        </Btn>
        <Btn title="სათაური 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <span className="font-bold text-[10px] leading-none">H3</span>
        </Btn>

        <Divider />

        {/* Inline marks */}
        <Btn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-black text-[13px] leading-none">B</span>
        </Btn>
        <Btn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic font-semibold text-[13px] leading-none">I</span>
        </Btn>
        <Btn title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline font-semibold text-[13px] leading-none">U</span>
        </Btn>

        <Divider />

        {/* Lists */}
        <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 15.25a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 10a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1V10Z" clipRule="evenodd" /></svg>
        </Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4 2a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-5.06L2.566 4.573a.75.75 0 0 1-.824-1.25l1.5-1a.75.75 0 0 1 .758-.024ZM6.75 5.25A.75.75 0 0 1 7.5 4.5h10a.75.75 0 0 1 0 1.5h-10a.75.75 0 0 1-.75-.75Zm0 5A.75.75 0 0 1 7.5 9.5h10a.75.75 0 0 1 0 1.5h-10a.75.75 0 0 1-.75-.75Zm0 5a.75.75 0 0 1 .75-.75h10a.75.75 0 0 1 0 1.5h-10a.75.75 0 0 1-.75-.75ZM3 14.5a.5.5 0 0 0-.5.5v.25c0 .138.112.25.25.25H3a.5.5 0 0 0 0-1Zm-1.5.5A1.5 1.5 0 0 1 3 13.5h.25A1.25 1.25 0 0 1 4.5 14.75V15a1.25 1.25 0 0 1-.094.469l-.672 1.656H4.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.557-1.252l1.276-1.538A.25.25 0 0 0 3 15.625V15.5a.25.25 0 0 0-.25-.25H2.5a.5.5 0 0 0-.5.5.75.75 0 0 1-1.5 0Z" clipRule="evenodd" /></svg>
        </Btn>

        <Divider />

        {/* Alignment */}
        <Btn title="მარცხნივ" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
        </Btn>
        <Btn title="ცენტრში" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM5.25 10a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm-3.25 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
        </Btn>
        <Btn title="მარჯვნივ" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM8.25 10a.75.75 0 0 1 .75-.75h8.25a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM2 15.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
        </Btn>
        <Btn title="გასწორება" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
        </Btn>

        <Divider />

        {/* Link */}
        <Btn title="ბმული" active={editor.isActive('link')} onClick={setLink}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" /><path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" /></svg>
        </Btn>
      </div>

      {/* ── Editor area ─────────────────────────────────────────────── */}
      <div style={{ minHeight }} className="relative">
        <EditorContent editor={editor} className="h-full" />
        {/* Placeholder — shown only when editor is empty */}
        {editor.isEmpty && (
          <p className="absolute top-3 left-4 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
      </div>

      {/* ── Prose styles injected via <style> tag ────────────────────── */}
      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror p { margin: 0 0 0.5em; }
        .ProseMirror p:last-child { margin-bottom: 0; }
        .ProseMirror h1 { font-size: 1.35em; font-weight: 700; margin: 0.75em 0 0.35em; line-height: 1.3; }
        .ProseMirror h2 { font-size: 1.15em; font-weight: 700; margin: 0.65em 0 0.3em; line-height: 1.35; }
        .ProseMirror h3 { font-size: 1em;    font-weight: 600; margin: 0.55em 0 0.25em; }
        .ProseMirror ul  { list-style: disc;    padding-left: 1.4em; margin: 0.4em 0; }
        .ProseMirror ol  { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
        .ProseMirror li  { margin: 0.15em 0; }
        .ProseMirror a   { color: #4f46e5; text-decoration: underline; cursor: pointer; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em     { font-style: italic; }
        .ProseMirror u      { text-decoration: underline; }
      `}</style>
    </div>
  );
}

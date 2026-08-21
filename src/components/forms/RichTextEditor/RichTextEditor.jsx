import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Link2, List, ListOrdered, Quote, Redo, Underline as UnderlineIcon, Undo } from 'lucide-react';
import styles from './RichTextEditor.module.scss';

const RichTextEditor = ({ label, value, onChange, placeholder = 'Materials, use cases, care instructions, and product story', disabled = false }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  // Keep the editor in sync when the form is hydrated from an existing product
  // (editor initializes once; external value changes — e.g. opening a different
  // product — must be pushed in explicitly).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current && !editor.isFocused) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Tiptap only reads `editable` at init — the fieldset-based edit lock toggles at
  // runtime (Edit/Cancel), so that has to be pushed in via setEditable() explicitly.
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes('link').href;
    // eslint-disable-next-line no-alert
    const url = window.prompt('Link URL', previous || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className={styles.field}>
      {label ? <label>{label}</label> : null}
      <div className={styles.shell}>
        <fieldset disabled={disabled} className={styles.toolbar}>
          <select
            value={editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
            onChange={(event) => {
              const v = event.target.value;
              if (v === 'p') editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: v === 'h2' ? 2 : 3 }).run();
            }}
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
          </select>

          <span className={styles.divider} />

          <button type="button" className={editor.isActive('bold') ? styles.active : ''} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <Bold size={15} />
          </button>
          <button type="button" className={editor.isActive('italic') ? styles.active : ''} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <Italic size={15} />
          </button>
          <button type="button" className={editor.isActive('underline') ? styles.active : ''} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <UnderlineIcon size={15} />
          </button>

          <span className={styles.divider} />

          <button type="button" className={editor.isActive('bulletList') ? styles.active : ''} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bulleted list">
            <List size={15} />
          </button>
          <button type="button" className={editor.isActive('orderedList') ? styles.active : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered size={15} />
          </button>
          <button type="button" className={editor.isActive('blockquote') ? styles.active : ''} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
            <Quote size={15} />
          </button>
          <button type="button" className={editor.isActive('link') ? styles.active : ''} onClick={setLink} title="Link">
            <Link2 size={15} />
          </button>

          <span className={styles.divider} />

          <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo size={15} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo size={15} />
          </button>
        </fieldset>
        <EditorContent editor={editor} className={styles.content} />
      </div>
    </div>
  );
};

export default RichTextEditor;

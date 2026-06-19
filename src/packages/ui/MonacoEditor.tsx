import { Editor, EditorProps, OnMount } from "@monaco-editor/react";
import { Menu } from "@tauri-apps/api/menu";
import { useState, useRef, useCallback } from "react";

export const MonacoEditor = (props: EditorProps) => {
  const [wordWrap, setWordWrap] = useState<"on" | "off">(props.options?.wordWrap === "on" ? "on" : "off");
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const showContextMenu = useCallback(async () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const selection = editor.getSelection();
    const hasSelection = selection && !selection.isEmpty();
    const selectedText = hasSelection ? editor.getModel()?.getValueInRange(selection) : "";

    try {
      const isReadOnly = editor.getOption(monaco.editor.EditorOption.readOnly);

      const items = [
        {
          id: "cut",
          text: "Cut",
          enabled: hasSelection && !isReadOnly,
          action: async () => {
            if (selectedText) {
              await navigator.clipboard.writeText(selectedText);
              editor.executeEdits("clipboard", [
                {
                  range: selection,
                  text: "",
                  forceMoveMarkers: true,
                },
              ]);
            }
          },
        },
        {
          id: "copy",
          text: "Copy",
          enabled: hasSelection,
          action: async () => {
            if (selectedText) {
              await navigator.clipboard.writeText(selectedText);
            }
          },
        },
        {
          id: "paste",
          text: "Paste",
          enabled: !isReadOnly,
          action: async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                const selection = editor.getSelection();
                editor.executeEdits("clipboard", [
                  {
                    range: selection,
                    text: text,
                    forceMoveMarkers: true,
                  },
                ]);
              }
            } catch (err) {
              console.error("Paste failed", err);
            }
          },
        },
        {
          id: "format",
          text: "Format Document",
          enabled: !isReadOnly,
          action: () => {
            editor.getAction("editor.action.formatDocument")?.run();
          },
        },
        {
          item: "Separator",
        } as any,
        {
          id: "word_wrap",
          text: "Word Wrap",
          checked: wordWrap === "on",
          action: () => {
            setWordWrap(prev => prev === "on" ? "off" : "on");
          },
        },
        {
          item: "Separator",
        } as any,
        {
          id: "select_all",
          text: "Select All",
          action: () => {
            editor.focus();
            editor.setSelection(editor.getModel().getFullModelRange());
          },
        },
        {
          id: "copy_all",
          text: "Copy All",
          action: async () => {
            const allText = editor.getValue();
            await navigator.clipboard.writeText(allText);
          },
        },
      ];

      const menu = await Menu.new({ items });
      await menu.popup();
    } catch (err) {
      console.error("Failed to show context menu", err);
    }
  }, [wordWrap]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onContextMenu((e: any) => {
      e.event.preventDefault();
      showContextMenu();
    });

    if (props.onMount) {
      props.onMount(editor, monaco);
    }
  };

  const editorOptions = {
    ...props.options,
    wordWrap,
    contextmenu: false,
  };

  return (
    <div className="h-full w-full relative">
      <Editor
        {...props}
        onMount={handleEditorDidMount}
        options={editorOptions}
      />
    </div>
  );
};

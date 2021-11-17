// This is just a copy of https://github.com/codemirror/basic-setup/blob/main/src/basic-setup.ts
//
// Importing @codemirror/basic-setup, either within @energetics/lr-util, or within a module that
// consumes @energetics/lr-util seems to create a duplicate instance of @codemirror/state; at least,
// when @energetics/lr-util is consumed by a NextJS app. This causes `new CollectionEditor()` to
// fail. Details: https://github.com/codemirror/codemirror.next/issues/528
//
// Defining basicSetup here is a workaround for the issue

import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
} from '@codemirror/view'
import {Extension, EditorState} from '@codemirror/state'
import {history, historyKeymap} from '@codemirror/history'
import {foldGutter, foldKeymap} from '@codemirror/fold'
import {indentOnInput} from '@codemirror/language'
import {lineNumbers, highlightActiveLineGutter} from '@codemirror/gutter'
import {defaultKeymap} from '@codemirror/commands'
import {bracketMatching} from '@codemirror/matchbrackets'
import {closeBrackets, closeBracketsKeymap} from '@codemirror/closebrackets'
import {searchKeymap, highlightSelectionMatches} from '@codemirror/search'
import {autocompletion, completionKeymap} from '@codemirror/autocomplete'
import {commentKeymap} from '@codemirror/comment'
import {rectangularSelection} from '@codemirror/rectangular-selection'
import {defaultHighlightStyle} from '@codemirror/highlight'
import {lintKeymap} from '@codemirror/lint'

export const basicSetup: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  defaultHighlightStyle.fallback,
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...commentKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
]

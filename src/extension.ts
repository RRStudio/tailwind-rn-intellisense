import { FSWatcher, readFileSync, watch } from "fs";
import * as md5 from "md5";
import * as vscode from "vscode";

const FILE_SELECTOR = [
  {
    scheme: "file",
    language: "typescriptreact",
  },
];

let classes: any = {};
let classDocumentations: any = {};
let classFile = "styles.json";
let classFileWatch: FSWatcher;

export function activate(context: vscode.ExtensionContext) {
  indexClasses()
    .then((result) => {})
    .catch((error) => {});
  context.subscriptions.push(tailwindCompletions());
}

export function deactivate() {}

function tailwindCompletions(): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(FILE_SELECTOR, {
    provideCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken,
      context: vscode.CompletionContext
    ) {
      if (!classes || classes === {}) {
        return [];
      } else {
        const regex = new RegExp("tailwind\\('(.*?)'\\)");
        const { text } = document.lineAt(position.line);
        const matches = text.match(regex);

        if (!matches) {
          return [];
        }

        let inMatch = false;
        for (const match of matches) {
          const startIndex = text.indexOf(match);
          const endIndex = startIndex + match.length;
          if (
            position.character >= startIndex &&
            position.character <= endIndex
          ) {
            inMatch = true;
            break;
          }
        }

        if (!inMatch) {
          return [];
        }

        const items = Object.keys(classes).map((key, index) => {
          if (classes.hasOwnProperty(key)) {
            const item = new vscode.CompletionItem(
              key,
              vscode.CompletionItemKind.Constant
            );
            item.detail = classDocumentations[key] as string;
            return item;
          } else {
            return null;
          }
        });

        return items.filter((i) => i !== null) as vscode.CompletionItem[];
      }
    },
  });
}

async function indexClasses() {
  try {
    const folders = vscode.workspace.workspaceFolders;
    if (folders === null || folders?.length === 0) {
      return [];
    }

    if (!folders) {
      return {};
    }

    classes = await readFile(`${folders[0].uri.fsPath}\\${classFile}`);
    classDocumentations = { ...classes };
    Object.keys(classDocumentations).forEach((twClass) => {
      const _class = classes[twClass];
      const styles = Object.keys(_class);
      const styleDocs = styles.map(
        (inlineStyle) => `${inlineStyle}: ${_class[inlineStyle]}`
      );
      classDocumentations[twClass] = styleDocs.join("; ");
    });

    watchFileChanges();
  } catch (e) {
    vscode.window.showErrorMessage(e);
  }
}

function readFile(file: string): any {
  try {
    const fileBuffer = readFileSync(file);
    const json = JSON.parse(fileBuffer as any);
    return json;
  } catch (e) {
    vscode.window.showErrorMessage(e);
  }
}

function watchFileChanges() {
  classFileWatch?.close();

  let md5Previous: string = "";
  classFileWatch = watch(classFile, (event, filename) => {
    if (filename) {
      const md5Current = md5(readFileSync(filename));
      if (md5Current === md5Previous) {
        return;
      }
      md5Previous = md5Current;
      indexClasses()
        .then((result) => {})
        .catch((error) => {});
    }
  });
}

// Trusted compiler entry point. Generated sources are parsed/typechecked as data;
// all TypeScript parsing, policy checks and diagnostics stay inside the worker's
// timeout/heap/output limits. No source file is imported or emitted.
import ts from "typescript";
import { dirname } from "node:path";

const formatHost = {
  getCanonicalFileName: (file) => file,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => "\n",
};

function checkSourcePolicy(source) {
  if (source.referencedFiles.length || source.typeReferenceDirectives.length || source.libReferenceDirectives.length || source.hasNoDefaultLib) {
    throw new Error(`Reference directives are not allowed: ${source.fileName}`);
  }
  const checkComments = (pos) => {
    const comments = [...(ts.getLeadingCommentRanges(source.text, pos) ?? []), ...(ts.getTrailingCommentRanges(source.text, pos) ?? [])];
    for (const range of comments) {
      const text = source.text.slice(range.pos, range.end);
      if (/(?:^|\n)\s*(?:\/\/\/?|\/\*|\*)?\s*@ts-(?:nocheck|ignore|expect-error)\b/.test(text)) {
        throw new Error(`Checking suppression is not allowed: ${source.fileName}`);
      }
    }
  };
  const visit = (node) => {
    checkComments(node.pos);
    checkComments(node.end);
    if (node.kind === ts.SyntaxKind.AnyKeyword) throw new Error(`Explicit any types are not allowed: ${source.fileName}`);
    if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) {
      // The real Register augmentation is the sole supported ambient declaration.
      // It must augment an imported module, never replace its SDK exports.
      const statement = node.body?.statements?.[0];
      const member = statement?.members?.[0];
      const registerAugmentation = ts.isModuleDeclaration(node)
        && ts.isExternalModule(source)
        && node.name.text === "@mysten/dapp-kit-react"
        && node.body?.statements?.length === 1
        && ts.isInterfaceDeclaration(statement) && statement.name.text === "Register"
        && !statement.heritageClauses && statement.members.length === 1
        && ts.isPropertySignature(member) && member.name.getText(source) === "dAppKit"
        && member.type && ts.isTypeQueryNode(member.type);
      if (!registerAugmentation) throw new Error(`Ambient stubs/placeholders are not allowed: ${source.fileName}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

try {
  const configPath = process.argv[2];
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.formatDiagnostics([config.error], formatHost));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  if (parsed.errors.length) throw new Error(ts.formatDiagnostics(parsed.errors, formatHost));
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const setupDiagnostics = [...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics()];
  if (setupDiagnostics.length) throw new Error(ts.formatDiagnostics(setupDiagnostics, formatHost));
  for (const file of parsed.fileNames) {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`Source file could not be read: ${file}`);
    checkSourcePolicy(source);
  }
  const diagnostics = ts.getPreEmitDiagnostics(program);
  process.stdout.write(JSON.stringify({ success: diagnostics.length === 0, diagnostics: ts.formatDiagnostics(diagnostics, formatHost) }));
} catch (err) {
  // Keep harness failures distinct from valid compiler verdicts, including when
  // an eval expects a particular source compilation failure.
  console.error(err.message);
  process.exitCode = 2;
}

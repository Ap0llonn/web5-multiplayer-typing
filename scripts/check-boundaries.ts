import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function checkImports(files: Record<string, string>): string[] {
  const errors: string[] = [];
  const graph = new Map<string, string[]>();
  for (const [file, source] of Object.entries(files)) {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const imports: string[] = [];
    function visit(node: ts.Node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        imports.push(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        imports.push(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(ast);
    const own = file.match(/^src\/modules\/([^/]+)/)?.[1];
    const edges: string[] = [];
    for (const path of imports) {
      const base = path.startsWith("@/")
        ? `src/${path.slice(2)}`
        : path.startsWith(".")
          ? posix.normalize(posix.join(posix.dirname(file), path))
          : path;
      const target =
        Object.keys(files).find((f) =>
          [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].includes(f),
        ) ?? base;
      edges.push(target);
      const targetModule = target.match(/^src\/modules\/([^/]+)\/(.+)$/);
      if (
        own &&
        (target.startsWith("src/app/") ||
          target.startsWith("src/composition/") ||
          (targetModule && targetModule[1] !== own))
      )
        errors.push(`${file}: forbidden module dependency ${path}`);
      else if (file.startsWith("src/shared/") && targetModule)
        errors.push(`${file}: shared imports module ${path}`);
      else if (
        !own &&
        targetModule &&
        !/^(public(\.ts)?$|server(\.ts)?$|presentation\/)/.test(targetModule[2])
      )
        errors.push(`${file}: deep module import ${path}`);
      if (
        own &&
        /\/(supervisors|domain)\//.test(file) &&
        /^(next|react|better-auth|@prisma|@\/generated)(\/|$)/.test(path)
      )
        errors.push(`${file}: framework in business layer ${path}`);
    }
    if (
      /\/public\.ts$/.test(file) &&
      ast.statements.some((s) => !ts.isExportDeclaration(s) || !s.isTypeOnly)
    )
      errors.push(`${file}: public entry must export types only`);
    graph.set(file, edges);
  }
  for (const [file, source] of Object.entries(files))
    if (/^\s*['"]use client['"]/.test(source)) {
      const seen = new Set<string>();
      function reachesServer(node: string): boolean {
        if (seen.has(node)) return false;
        seen.add(node);
        return (
          node === "server-only" ||
          /^(?:@prisma(?:\/|$)|src\/generated\/|next\/(?:headers|server)$)/.test(
            node,
          ) ||
          /\/(server|container)\.ts$/.test(node) ||
          (graph.get(node) ?? []).some(reachesServer)
        );
      }
      if (reachesServer(file))
        errors.push(`${file}: client transitively imports server-only code`);
    }
  return errors;
}
function collect(dir: string, result: Record<string, string> = {}) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (path === "src/generated") continue;
    if (entry.isDirectory()) collect(path, result);
    else if (/\.tsx?$/.test(path)) result[path] = readFileSync(path, "utf8");
  }
  return result;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = checkImports(collect("src"));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Module boundaries verified");
}

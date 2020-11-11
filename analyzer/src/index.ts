import * as ts from "typescript";
import * as fs from "fs";

const util = require('util')
const log = util.debuglog('fortest')

// log((node.parent as any).fileName)
// if ((node.parent as any).fileName === '/Users/hobofan/stuff/rust-typescript-bridge/analyzer/src/__test__/foo-indirect_function_inferred.tsx') {
  // log(node.kind);
// }

interface DocEntry {
  name?: string;
  fileName?: string;
  documentation?: string;
  type?: string;
  constructors?: DocEntry[];
  parameters?: DocEntry[];
  returnType?: string;
}

interface SimpleType {
  name: string,
  properties: Array<{
    name: string,
    optional: boolean,
    intrinsicType?: string,
    complexType?: string,
  }>
}

interface Component {
  name: string,
  props: string,
}

/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions
): [Component[], SimpleType[]] {
  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();
  let output: DocEntry[] = [];
  const types: SimpleType[] = [];
  const components = [];

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    // if (sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, visit);
    // }
  }

  return [components, types];

  /** visit nodes finding exported classes */
  function visit(node: ts.Node) {
    // Only consider exported nodes
    if (!isNodeExported(node)) {
      return;
    }

    if (ts.isClassDeclaration(node) && node.name) {
      // This is a top level class, get its symbol
      let symbol = checker.getSymbolAtLocation(node.name);
      if (symbol) {
        output.push(serializeClass(symbol));
      }
      // No need to walk any further, class expressions/inner declarations
      // cannot be exported
    } else if (ts.isModuleDeclaration(node)) {
      // This is a namespace, visit its children
      ts.forEachChild(node, visit);
    }

    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((subnode) => {
        const initializer = subnode.initializer || subnode.type;
        if (initializer && (initializer as any).parameters && isFunctionalComponent(initializer)) {
          let propsName;
          (initializer as any).parameters.forEach((param) => {
            const typeNode = param.type;
            const typ = checker.getTypeFromTypeNode(typeNode);
            const simpleType = typeToSimpleType(typ);

            types.push(simpleType);
            propsName = simpleType.name;
          });

          const component = {
            name: (subnode.name as any).escapedText,
            propsName,
          }
          components.push(component);
        }
      })
    }

    if (ts.isFunctionDeclaration(node)) {
      if(isFunctionalComponent(node)) {
        let propsName;
        node.parameters.forEach((param) => {
          const typeNode = param.type;
          const typ = checker.getTypeFromTypeNode(typeNode);
          const simpleType = typeToSimpleType(typ);

          types.push(simpleType);
          propsName = simpleType.name;
        })

        const component = {
          name: node.name.escapedText,
          propsName,
        }
        components.push(component);
      }
    }

  }

  function isFunctionalComponent(node: ts.Node): boolean {
    const signatureDeclaration = node as ts.SignatureDeclaration;
    const isElementSymbolWithJsxParent = (returnType) => {
      if (
        returnType.symbol &&
        returnType.symbol.parent &&
        returnType.symbol.escapedText === 'Element' &&
        returnType.symbol.parent.escapedText === 'JSX'
      ) {
        return true;
      }
      if (
        returnType.symbol &&
        returnType.symbol.parent &&
        returnType.symbol.escapedName === 'Element' &&
        returnType.symbol.parent.escapedName === 'JSX'
      ) {
        return true;
      }

      return false;
    }

    if (ts.isFunctionLike(node)) {
      const returnType = checker.getSignatureFromDeclaration(signatureDeclaration).getReturnType();
      if (isElementSymbolWithJsxParent(returnType)) {
        return true;
      }
    }

    const typeName = (node as any).type.typeName;
    if (typeName && ts.isQualifiedName(typeName)) {
      if (
        ts.isIdentifier(typeName.left) &&
        typeName.left.escapedText === 'JSX' &&
        typeName.right.escapedText === 'Element'
      ) {
        return true;
      }
    }

    return false;
  }

  function typeToSimpleType(type: ts.Type): SimpleType {
    let typeName;
    if (type.aliasSymbol) {
      typeName = type.aliasSymbol.escapedName;
    }
    if (!typeName) {
      typeName = type.symbol.escapedName as string
    }

    const simpleType: SimpleType = {
      name: typeName,
      properties: [],
    };

    type.symbol.members.forEach((symbol, key) => {
      const checkedType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!) as any;
      const {intrinsicName} = checkedType;
      const optional = checker.isOptionalParameter((symbol as any).declarations[0]);
      let complexType;
      if (checkedType.aliasSymbol) {
        complexType = checkedType.aliasSymbol.escapedName;

        const simpleType = typeToSimpleType(checkedType);
        types.push(simpleType);
      }

      const property = {
        name: key as string,
        intrinsicType: intrinsicName,
        complexType,
        optional,
      };
      simpleType.properties.push(property);
    });

    return simpleType;
  }

  /** Serialize a symbol into a json object */
  function serializeSymbol(symbol: ts.Symbol): DocEntry {
    return {
      name: symbol.getName(),
      documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
      )
    };
  }

  /** Serialize a class symbol information */
  function serializeClass(symbol: ts.Symbol) {
    let details = serializeSymbol(symbol);

    // Get the construct signatures
    let constructorType = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration!
    );
    details.constructors = constructorType
      .getConstructSignatures()
      .map(serializeSignature);
    return details;
  }

  /** Serialize a signature (call or construct) */
  function serializeSignature(signature: ts.Signature) {
    return {
      parameters: signature.parameters.map(serializeSymbol),
      returnType: checker.typeToString(signature.getReturnType()),
      documentation: ts.displayPartsToString(signature.getDocumentationComment(checker))
    };
  }

  /** True if this is visible outside this file, false otherwise */
  function isNodeExported(node: ts.Node): boolean {
    return (
      (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }
}

if (require.main === module) {
  const [components, types] = generateDocumentation(process.argv.slice(2), {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
  });

  // print out the doc
  const nullPrinter = (key, value) => typeof value === 'undefined' ? null : value;
  console.log(JSON.stringify({
    "types": types,
    "components": components,
  }, nullPrinter, 4));
  // fs.writeFileSync(
    // "types.json",
    // JSON.stringify(types, nullPrinter, 4)
  // );
  // fs.writeFileSync(
    // "components.json",
    // JSON.stringify(components, nullPrinter, 4)
  // );
}

export { generateDocumentation };

"use strict";
exports.__esModule = true;
exports.generateDocumentation = void 0;
var ts = require("./typescript.js");
var util = require('util');
var log = util.debuglog('fortest');
/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(fileNames, options) {
    // Build a program using the set of root file names in fileNames
    var program = ts.createProgram(fileNames, options);
    // Get the checker, we will use it to find more about classes
    var checker = program.getTypeChecker();
    var output = [];
    var types = [];
    var components = [];
    // Visit every sourceFile in the program
    for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
        var sourceFile = _a[_i];
        // if (sourceFile.isDeclarationFile) {
        // Walk the tree to search for classes
        ts.forEachChild(sourceFile, visit);
        // }
    }
    return [components, types];
    /** visit nodes finding exported classes */
    function visit(node) {
        // Only consider exported nodes
        if (!isNodeExported(node)) {
            return;
        }
        if (ts.isClassDeclaration(node) && node.name) {
            // This is a top level class, get its symbol
            var symbol = checker.getSymbolAtLocation(node.name);
            if (symbol) {
                output.push(serializeClass(symbol));
            }
            // No need to walk any further, class expressions/inner declarations
            // cannot be exported
        }
        else if (ts.isModuleDeclaration(node)) {
            // This is a namespace, visit its children
            ts.forEachChild(node, visit);
        }
        if (ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach(function (subnode) {
                var initializer = subnode.initializer || subnode.type;
                if (initializer && initializer.parameters && isFunctionalComponent(initializer)) {
                    var propsName_1;
                    initializer.parameters.forEach(function (param) {
                        var typeNode = param.type;
                        var typ = checker.getTypeFromTypeNode(typeNode);
                        var simpleType = typeToSimpleType(typ);
                        types.push(simpleType);
                        propsName_1 = simpleType.name;
                    });
                    var component = {
                        name: subnode.name.escapedText,
                        propsName: propsName_1
                    };
                    components.push(component);
                }
            });
        }
        if (ts.isFunctionDeclaration(node)) {
            if (isFunctionalComponent(node)) {
                var propsName_2;
                node.parameters.forEach(function (param) {
                    var typeNode = param.type;
                    var typ = checker.getTypeFromTypeNode(typeNode);
                    var simpleType = typeToSimpleType(typ);
                    types.push(simpleType);
                    propsName_2 = simpleType.name;
                });
                var component = {
                    name: node.name.escapedText,
                    propsName: propsName_2
                };
                components.push(component);
            }
        }
    }
    function isFunctionalComponent(node) {
        var signatureDeclaration = node;
        var isElementSymbolWithJsxParent = function (returnType) {
            if (returnType.symbol &&
                returnType.symbol.parent &&
                returnType.symbol.escapedText === 'Element' &&
                returnType.symbol.parent.escapedText === 'JSX') {
                return true;
            }
            if (returnType.symbol &&
                returnType.symbol.parent &&
                returnType.symbol.escapedName === 'Element' &&
                returnType.symbol.parent.escapedName === 'JSX') {
                return true;
            }
            return false;
        };
        if (ts.isFunctionLike(node)) {
            var returnType = checker.getSignatureFromDeclaration(signatureDeclaration).getReturnType();
            if (isElementSymbolWithJsxParent(returnType)) {
                return true;
            }
        }
        var typeName = node.type.typeName;
        if (typeName && ts.isQualifiedName(typeName)) {
            if (ts.isIdentifier(typeName.left) &&
                typeName.left.escapedText === 'JSX' &&
                typeName.right.escapedText === 'Element') {
                return true;
            }
        }
        return false;
    }
    function typeToSimpleType(type) {
        var simpleType = {
            name: type.symbol.escapedName,
            properties: []
        };
        type.symbol.members.forEach(function (symbol, key) {
            var intrinsicName = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration).intrinsicName;
            var optional = checker.isOptionalParameter(symbol.declarations[0]);
            var property = {
                name: key,
                intrinsicType: intrinsicName,
                optional: optional
            };
            simpleType.properties.push(property);
        });
        return simpleType;
    }
    /** Serialize a symbol into a json object */
    function serializeSymbol(symbol) {
        return {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
            type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
        };
    }
    /** Serialize a class symbol information */
    function serializeClass(symbol) {
        var details = serializeSymbol(symbol);
        // Get the construct signatures
        var constructorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
        details.constructors = constructorType
            .getConstructSignatures()
            .map(serializeSignature);
        return details;
    }
    /** Serialize a signature (call or construct) */
    function serializeSignature(signature) {
        return {
            parameters: signature.parameters.map(serializeSymbol),
            returnType: checker.typeToString(signature.getReturnType()),
            documentation: ts.displayPartsToString(signature.getDocumentationComment(checker))
        };
    }
    /** True if this is visible outside this file, false otherwise */
    function isNodeExported(node) {
        return ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
            (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile));
    }
}
exports.generateDocumentation = generateDocumentation;
if (require.main === module) {
    var _a = generateDocumentation(process.argv.slice(2), {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS
    }), components = _a[0], types = _a[1];
    // print out the doc
    var nullPrinter = function (key, value) { return typeof value === 'undefined' ? null : value; };
    console.log(JSON.stringify({
        "types": types,
        "components": components
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

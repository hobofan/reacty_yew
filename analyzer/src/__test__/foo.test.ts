import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { generateDocumentation } from '../index';

const nullPrinter = (key, value) => typeof value === 'undefined' ? null : value;

const testFoo = (caseName, fileName) => {
  test(caseName, () => {
    let [components, types] = generateDocumentation(
      [path.join(__dirname, fileName)],
      {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS
      }
    );

    components = JSON.parse(JSON.stringify(components, nullPrinter, 4));
    types = JSON.parse(JSON.stringify(types, nullPrinter, 4));

    const expectedComponents = JSON.parse(fs.readFileSync(path.join(__dirname, "./foo.components.json"), 'utf8'));
    const expectedTypes = JSON.parse(fs.readFileSync(path.join(__dirname, "./foo.types.json"), 'utf8'));

    expect(components).toEqual(expectedComponents);
    expect(types).toEqual(expectedTypes);
  });
}

testFoo(
  'direct export - arrow function - explicit return type',
  './foo-direct_arrow_explicit.tsx',
);

testFoo(
  'direct export - arrow function - explicit return type - via .d.ts',
  './foo-direct_arrow_explicit.d.ts',
);

testFoo(
  'indirect export - arrow function - explicit return type',
  './foo-indirect_arrow_explicit.tsx',
);

testFoo(
  'indirect export - normal function - explicit return type',
  './foo-indirect_function_explicit.tsx',
);

testFoo(
  'indirect export - normal function - inferred return type',
  './foo-indirect_function_inferred.tsx',
);

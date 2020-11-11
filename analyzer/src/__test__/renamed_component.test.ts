import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { generateDocumentation } from '../index';

const nullPrinter = (key, value) => typeof value === 'undefined' ? null : value;

test('Renamed component', () => {
  let [components, types] = generateDocumentation(
    [path.join(__dirname, './renamed_component.tsx')],
    {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.CommonJS
    }
  );

  components = JSON.parse(JSON.stringify(components, nullPrinter, 4));
  types = JSON.parse(JSON.stringify(types, nullPrinter, 4));

  const expectedComponents = [
    {
      name: "RenamedComponent",
      propsName: "OriginalNamedProps",
    }
  ];
  const expectedTypes = [
    {
      name: "OriginalNamedProps",
      properties: [
        {
          complexType: null,
          intrinsicType: "number",
          name: "radius",
          optional: false,
        }
      ]
    }
  ];

  expect(components).toEqual(expectedComponents);
  expect(types).toEqual(expectedTypes);
});

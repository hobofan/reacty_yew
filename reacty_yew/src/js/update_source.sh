#! /bin/bash
set -euxo pipefail

cp ../../../analyzer/src/index.js .
cp ../../../analyzer/src/typescript.js .

echo 'You need to manually edit the require("typescript") -> require("./typescript.js")'

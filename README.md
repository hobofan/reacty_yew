## reacty_yew - Generate Yew components from React component Typescript type definitions

This is a proof of concept for automatically generating [Yew](https://yew.rs/) components from React components that have Typescript type definitions. Many parts are missing and this **likely shouldn't be used in production!**

## Showcase

For the full example see [./examples/bad_button](./examples/bad_button).

Given a React component:

```tsx
import * as React from "react";

interface BadButtonProps {
  color?: string,
  text: string,
}

const BadButton = (props: BadButtonProps): JSX.Element => {
  return (
    <button
      style={{ backgroundColor: props.color }}
      onClick={() => window.alert("Click!")}
    >
      {props.text}
    </button>
  );

};

export { BadButton };
```

An invocation of the `react_component_mod!` macro (takes as input the name of the module to generate, path to the type declarations and the JS global (UMD) that holds the React components) generates a module:

```rust
react_component_mod!(
    bad_button;
    types = "../js_package/dist/index.d.ts",
    global = "BadButtonLib"
);
```

You can directly use the generated component `BadButton` in a Yew component:

```rust
use yew::prelude::*;
use crate::bad_button::BadButton;

// ...
fn view(&self) -> Html {
    html! {
        <div>
            <BadButton text="Actual props" />
        </div>
    }
}
// ...
```

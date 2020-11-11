import * as React from "react";

interface OriginalNamedProps {
  radius: number,
}

const Foo = (props: OriginalNamedProps): JSX.Element => {
  return (
    <div>
      {props.radius.toString()}
    </div>
  );
}

export { Foo as RenamedComponent }

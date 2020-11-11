import * as React from "react";

export const Foo = (props: { radius: number }): JSX.Element => {
  return (
    <div>
      {props.radius.toString()}
    </div>
  );
}

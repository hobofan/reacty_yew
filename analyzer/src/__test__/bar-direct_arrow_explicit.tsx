import * as React from "react";

interface MyPlanetProps {
  radius: number,
  radius2?: number,
  complex?: OtherType,
}

interface OtherType {
  foo: string,
}

export const Foo = (props: MyPlanetProps): JSX.Element => {
  return (
    <div>
      {props.radius.toString()}
    </div>
  );
}

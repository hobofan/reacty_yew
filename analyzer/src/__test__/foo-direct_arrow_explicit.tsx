import * as React from "react";
// import type { FunctionComponent } from "react";
// import { Planet } from 'react-planet';

interface MyPlanetProps {
  radius: number,
  radius2?: number,
  complex?: OtherType,
}

type OtherType = {
  foo: string,
}

export const Foo = (props: MyPlanetProps): JSX.Element => {
  return (
    <div>
      {props.radius.toString()}
    </div>
  );
}

// export { Foo }

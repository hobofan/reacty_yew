/// <reference types="react" />
interface MyPlanetProps {
  radius: number,
  radius2?: number,
  complex?: OtherType,
}

type OtherType = {
  foo: string,
}

export declare const Foo: (props: MyPlanetProps) => JSX.Element;
export {};

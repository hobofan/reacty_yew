import * as React from "react";

interface BadButtonProps {
  color?: string,
  text: string,
  foo: any,
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

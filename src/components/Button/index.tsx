import { ReactNode } from "react";

import "./styles.scss";

type ButtonProps = {
  onClick?: () => void;
  actionType?: string;
  children: ReactNode;
};

function Button({ onClick, actionType = "primary", children }: ButtonProps) {
  return (
    <button className={`button button--${actionType}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default Button;

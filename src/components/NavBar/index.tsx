import { NavLink } from "react-router-dom";

import "./styles.scss";

const NavBar = () => {
  return (
    <nav className="nav">
      <ul>
        <li>
          <NavLink to="/">Home</NavLink>
        </li>
        <li>
          <NavLink to="about">About</NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default NavBar;

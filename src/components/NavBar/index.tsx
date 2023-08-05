import { useState } from "react";
import { NavLink } from "react-router-dom";
import Logo from "@/assets/jitjots.svg";

import "./styles.scss";

const routes = [
  {
    name: "Home",
    to: "/",
  },
  {
    name: "About",
    to: "about",
  },
  {
    name: "Booking",
    to: "booking",
  },
];

function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  const primaryNav = document.querySelector(".navbar__primary-nav");
  const navToggle = document.querySelector(".navbar__mobile-toggle");

  const getRoutes = () => {
    return routes.map((route) => (
      <li key={route.to} onClick={handleNavToggle}>
        <NavLink
          to={route.to}
          className={({ isActive }) =>
            `navbar__primary-nav-route ${
              isActive && "navbar__primary-nav-route--active"
            }`
          }
        >
          {route.name}
        </NavLink>
      </li>
    ));
  };

  const handleNavToggle = () => {
    const visibility = primaryNav?.getAttribute("data-visible");

    if (visibility === "false") {
      primaryNav?.setAttribute("data-visible", "true");
      navToggle?.setAttribute("aria-expanded", "true");
    } else {
      primaryNav?.setAttribute("data-visible", "false");
      navToggle?.setAttribute("aria-expanded", "false");
    }

    setIsOpen((prev) => !prev);
  };

  return (
    <header className="navbar">
      <NavLink to="/">
        <img className="navbar__logo" src={Logo} alt="Jit Jots Logo" />
      </NavLink>

      <button
        className={`navbar__mobile-toggle ${
          isOpen && "navbar__mobile-toggle--open"
        }`}
        aria-controls="primary-navigation"
        aria-expanded="false"
        onClick={handleNavToggle}
      >
        <span className="sr-only">Menu</span>
      </button>

      <nav>
        <ul
          className={`navbar__primary-nav ${
            isOpen && "navbar__primary-nav--open"
          }`}
          id="primary-navigation"
          data-visible="false"
        >
          {getRoutes()}
        </ul>
      </nav>
    </header>
  );
}

export default NavBar;

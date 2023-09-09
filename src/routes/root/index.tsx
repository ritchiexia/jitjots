import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";

import "./styles.scss";

function Root() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 100) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    });
  }, []);

  return (
    <>
      <NavBar />
      <main>
        <Outlet />
        <BackToTop showBackToTop={showBackToTop} />
      </main>
      <Footer />
    </>
  );
}

export default Root;

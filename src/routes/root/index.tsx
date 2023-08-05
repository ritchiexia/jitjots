import { Outlet } from "react-router-dom";
import NavBar from "../../components/NavBar";
import "./styles.scss";
import Footer from "../../components/Footer";

function Root() {
  return (
    <>
      <NavBar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default Root;

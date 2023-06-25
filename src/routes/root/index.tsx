import { Outlet } from "react-router-dom";
import NavBar from "../../components/NavBar";
import "./styles.scss";

function Root() {
  return (
    <div>
      <NavBar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Root;

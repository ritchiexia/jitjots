import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./routes/root";
import AboutPage from "./routes/about";
import BookingPage from "./routes/booking";
import ErrorPage from "./error-page";
import "./index.scss";
import HomePage from "./routes/home/index";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "booking",
        element: <BookingPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RouterProvider router={router} />
);

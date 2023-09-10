import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./routes/root";
import AboutPage from "./routes/about";
import EventsPage from "./routes/events";
import HomePage from "./routes/home/index";
import GetInvolvedPage from "./routes/get-involved";
import ErrorPage from "./error-page";
import "./index.scss";

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
        path: "events",
        element: <EventsPage />,
      },
      {
        path: "get-involved",
        element: <GetInvolvedPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RouterProvider router={router} />
);

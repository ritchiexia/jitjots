import { Link } from "react-router-dom";
import Button from "@/components/Button";
import WorkshopBookings1 from "@/assets/WorkshopBookings1.png";
import WorkshopBookings2 from "@/assets/WorkshopBookings2.png";
import Worksheets1 from "@/assets/Worksheets1.png";
import Worksheets2 from "@/assets/Worksheets2.png";

import "./styles.scss";

function EventsPage() {
  return (
    <div className="eventspage">
      <div className="eventspage__section">
        <h1>Workshop Bookings</h1>
        <p>
          Jit Jots workshops aim to present various science topics through fun
          activities and engaging demonstrations. From dry ice bubbles to
          extracting DNA from strawberries, children can expect to participate
          in various science plays! Workshops are typically an hour long, but
          can be booked for longer upon requests. Workshops can be booked in
          advance and are completely free.
        </p>
        <div className="imagegroup">
          <img
            src={WorkshopBookings1}
            alt="Workshop Bookings 1"
            className="image"
          />
          <img
            src={WorkshopBookings2}
            alt="Workshop Bookings 2"
            className="image"
          />
        </div>
        {/* <Link to="/" target="_blank">
          <Button>Book a Workshop</Button>
        </Link> */}
      </div>

      <div className="eventspage__section">
        <h1>Activity Sheets Bank</h1>
        <p>
          Jit Jots activity sheets contain educational yet fun activities with
          the aim of teaching elementary school students various educational
          topics. Take a look at our selection and feel free to make some
          copies! We're always cooking up new worksheets, so be sure to come
          back and check!
        </p>
        <div className="imagegroup">
          <img src={Worksheets1} alt="Worksheets 1" className="image" />
          <img src={Worksheets2} alt="Worksheets 2" className="image" />
        </div>
        <Link to="https://drive.google.com" target="_blank">
          <Button>View Worksheets</Button>
        </Link>
      </div>
    </div>
  );
}

export default EventsPage;

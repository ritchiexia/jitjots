import { Link } from "react-router-dom";
import "./styles.scss";
import Button from "@/components/Button";

function EventsPage() {
  return (
    <div className="eventspage">
      <h1>Workshop Bookings</h1>
      <p>
        Jit Jots workshops aim to present various science topics through fun
        activities and engaging demonstrations. From dry ice bubbles to
        extracting DNA from strawberries, children can expect to participate in
        various science plays! Workshops are typically an hour long, but can be
        booked for longer upon requests. Workshops can be booked in advance and
        are completely free.
      </p>
      <Link to="/" target="_blank">
        <Button>Book a Workshop</Button>
      </Link>

      <h1>Activity Sheets Bank</h1>
      <p>
        Jit Jots activity sheets contain educational yet fun activities with the
        aim of teaching elementary school students various educational topics.
        Take a look at our selection and feel free to make some copies! We're
        always cooking up new worksheets, so be sure to come back and check!
      </p>
      <Link to="https://drive.google.com" target="_blank">
        <Button>View Worksheets</Button>
      </Link>
    </div>
  );
}

export default EventsPage;

import Button from "@/components/Button";
import "./styles.scss";
import { Link } from "react-router-dom";

function GetInvolvedPage() {
  return (
    <div className="getinvolvedpage">
      <h1>Sponsors</h1>
      <p>
        Thank you for your interest in getting involved! Below are the ways that
        you can support our mission.
      </p>

      <h1>Volunteers</h1>
      <p>
        Want to help grow the next generation of scientists with us? We'd love
        to hear from you!
      </p>
      <Link to={"https://forms.gle/Qc821h1itrYqp5RG6"} target="_blank">
        <Button>Apply Here</Button>
      </Link>
    </div>
  );
}

export default GetInvolvedPage;

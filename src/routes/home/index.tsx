import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import test from "@/assets/home.jpeg";

import "./styles.scss";
import Carousel from "@/components/Carousel";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="homepage">
      <p className="homepage__oneliner">
        ✨ Instilling curiosity and wonder in scientists of the future ✨
      </p>

      <span className="homepage__section">
        <img src={test} className="image" />
        <div className="homepage__section-content">
          <div>
            <h2>🚀 Our goal</h2>
            <p>
              We are a team of passionate science students who want to share our
              love of science
            </p>
          </div>
          <Button onClick={() => navigate("/about")} actionType="primary">
            About Us
          </Button>
        </div>
      </span>

      <div className="separator separator--before" />
      <span className="homepage__section homepage__section--reverse">
        <img src={test} className="image" />
        <div className="homepage__section-content">
          <div>
            <h2>🔬 Workshops</h2>
            <p>
              Our workshops present various science topics through hands-on
              experiments and engaging demonstrations.
            </p>
          </div>
          <div className="homepage__buttongroup homepage__buttongroup--reverse">
            <Button
              onClick={() => navigate("TODO: add link to form for signing up")}
              actionType="primary"
            >
              Book a Workshop
            </Button>
            <Button onClick={() => navigate("/events")} actionType="secondary">
              Learn More
            </Button>
          </div>
        </div>
      </span>
      <div className="separator separator--after" />

      <span className="homepage__section">
        <img src={test} className="image" />
        <div className="homepage__section-content">
          <div>
            <h2>📝 Worksheets</h2>
            <p>
              Our printable worksheets include fun activities and passages that
              discuss current science trends, discoveries, and concerns.
            </p>
          </div>
          <div className="homepage__buttongroup">
            <Button
              onClick={() => navigate("TODO: add link to worksheets")}
              actionType="primary"
            >
              View Worksheets
            </Button>
            <Button onClick={() => navigate("/events")} actionType="secondary">
              Learn More
            </Button>
          </div>
        </div>
      </span>

      <blockquote className="homepage__blockquote">
        <div>
          <p className="quote">A scientist is just a kid who never grew up.</p>
          <p className="author">- Neil deGrasse Tyson</p>
        </div>
      </blockquote>

      <section></section>

      <Carousel />

      <p>
        Jit Jots is a team of passionate science students who want to share
        their love of science to others. Our goal is to instill curiosity and
        wonder in aspiring scientists of the future! Growing up, many of us
        viewed science as merely textbooks and diagrams, which deterred many
        great, science-oriented minds from the amazing subject. Jit Jots was
        founded to dispel the notion that “science is boring” and to share our
        interest in learning more about how our crazy universe works.
      </p>
    </div>
  );
}

export default HomePage;

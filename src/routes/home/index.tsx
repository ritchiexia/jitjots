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
        🚀 Inspiring the scientists of tomorrow
      </p>
      <span className="homepage__booking">
        <img src={test} className="image" />
        <div>
          <p>
            Jit Jots is a team of passionate science students who want to share
            their love of science to others. Our goal is to instill curiosity
            and wonder in aspiring scientists of the future! Growing up, many of
            us viewed science as merely textbooks and diagrams, which deterred
            many great, science-oriented minds from the amazing subject. Jit
            Jots was founded to dispel the notion that “science is boring” and
            to share our interest in learning more about how our crazy universe
            works.
          </p>
          <div className="homepage__buttongroup">
            <Button onClick={() => navigate("/booking")} actionType="primary">
              Book a Workshop
            </Button>
            <Button onClick={() => navigate("/about")} actionType="secondary">
              About Us
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

      <Carousel />
    </div>
  );
}

export default HomePage;

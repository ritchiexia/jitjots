import { useNavigate, Link } from "react-router-dom";
import Button from "@/components/Button";
import OurGoalImage from "@/assets/home.jpeg";
import Workshops1 from "@/assets/Workshops1.png";
import Worksheets from "@/assets/worksheets.png";
import JJ from "@/assets/JJ_default.png";
import JJ_labcoat_L from "@/assets/JJ_labcoat_L.png";
import JJ_spacesuit from "@/assets/JJ_spacesuit.png";

import "./styles.scss";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="homepage">
      <p className="homepage__oneliner">
        ✨ Instilling curiosity and wonder in scientists of the future ✨
      </p>

      <span className="homepage__section">
        <div className="image-frame">
          <img src={OurGoalImage} className="image" />
          <img src={JJ} className="image__decoration image__decoration--left" />
        </div>
        <div className="homepage__section-content">
          <div>
            <h2>🚀 Our goal</h2>
            <p>
              We are a team of passionate students who want to share our love of
              science to inspire the next generation of curious minds.
            </p>
          </div>
          <Button onClick={() => navigate("/about")} actionType="primary">
            About Us
          </Button>
        </div>
      </span>

      <div className="separator separator--before" />
      <span className="homepage__section homepage__section--reverse">
        <div className="image-frame">
          <img src={Workshops1} className="image" />
          <img
            src={JJ_labcoat_L}
            className="image__decoration image__decoration--right"
          />
        </div>
        <div className="homepage__section-content">
          <div>
            <h2>🔬 Workshops</h2>
            <p>
              Our workshops present various science topics through hands-on
              experiments and engaging demonstrations.
            </p>
          </div>
          <div className="homepage__buttongroup homepage__buttongroup--reverse">
            <Link to="https://forms.gle/aJbnMDKzNFnuWeDB6" target="_blank">
              <Button actionType="primary">Book a Workshop</Button>
            </Link>
            <Button onClick={() => navigate("/events")} actionType="secondary">
              Learn More
            </Button>
          </div>
        </div>
      </span>
      <div className="separator separator--after" />

      <span className="homepage__section">
        <div className="image-frame">
          <img src={Worksheets} className="image" />
          <img
            src={JJ_spacesuit}
            className="image__decoration image__decoration--left"
          />
        </div>
        <div className="homepage__section-content">
          <div>
            <h2>📝 Worksheets</h2>
            <p>
              Our printable worksheets include fun activities and passages that
              discuss current science trends, discoveries, and concerns.
            </p>
          </div>
          <div className="homepage__buttongroup">
            <Link
              to="https://drive.google.com/drive/folders/1vUK6vKhJydhI3UISJYHpvDY4wtJzhli2?usp=sharing"
              target="_blank"
            >
              <Button>View Worksheets</Button>
            </Link>
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
    </div>
  );
}

export default HomePage;

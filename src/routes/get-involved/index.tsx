import Button from "@/components/Button";
import { Link } from "react-router-dom";
import DesignTeamGraphic from "@/assets/design-team-graphic.svg";
import CommunicationsTeamGraphic from "@/assets/communications-team-graphic.svg";
import OutreachTeamGraphic from "@/assets/outreach-team-graphic.svg";
import MarketingTeamGraphic from "@/assets/marketing-team-graphic.svg";

import "./styles.scss";

function GetInvolvedPage() {
  return (
    <div className="getinvolvedpage">
      {/* <h1>Partners</h1>
      <p>
        Thank you for your interest in getting involved! Below are the ways that
        you can support our mission.
      </p> */}

      <h1>Volunteers</h1>
      <p>
        Want to help grow the next generation of scientists with us? Apply to
        join one of our volunteer teams!
      </p>
      <Link to={"https://forms.gle/Qc821h1itrYqp5RG6"} target="_blank">
        <Button>Apply Here</Button>
      </Link>

      <div className="volunteers__team-content">
        <div>
          <h2>Design Team</h2>
          <p>
            The design team is responsible for designing the structure of
            science workshops, including activities, slideshows, videos, and
            more! You will also be responsible for researching interesting and
            cool science subjects that can be presented in our workshops. Do not
            think that you are confined in terms of what you are allowed to
            plan. Let your imagination and creativity run wild!
          </p>
        </div>
        <img
          src={DesignTeamGraphic}
          alt="Design Team Graphic"
          className="volunteers__graphic"
        />
      </div>

      <div className="volunteers__team-content">
        <div>
          <h2>Communications Team</h2>
          <p>
            As part of the communications team, your role is to enhance the
            presence of Jit Jots across various social media platforms as well
            as market upcoming events and notices of importance. Communications
            volunteers are expected to use graphic design softwares such as
            Canva to create visually appealing graphics to be posted on Jit
            Jots’ social media. Other tasks may include editing newsletters,
            logging volunteer hours, and video editing. Ultimately, the biggest
            perk of being a communications volunteer is the flexibility and
            openness in terms of responsibilities.
          </p>
        </div>
        <img
          src={CommunicationsTeamGraphic}
          alt="Communications Team Graphic"
          className="volunteers__graphic"
        />
      </div>

      <div className="volunteers__team-content">
        <div>
          <h2>Outreach Team</h2>
          <p>
            The community outreach team is broadly responsible for developing
            and maintaining Jit Jots relationships with other organizations,
            daycares, recreational centers, community programs, and sponsors.
            Typical tasks include finding new sponsors, creating fundraisers,
            and reaching out to daycares and afterschool programs. The outreach
            team will also be working very closely with the design team to
            organize and schedule workshop presentation dates. The role is very
            flexible and there is definitely room to take on bigger initiatives!
          </p>
        </div>
        <img
          src={OutreachTeamGraphic}
          alt="Outreach Team Graphic"
          className="volunteers__graphic"
        />
      </div>

      <div className="volunteers__team-content">
        <div>
          <h2>Marketing Team</h2>
          <p>
            The marketing team will be primarily responsible for fundraising via
            contacting sponsors and planning fundraisers. All of the fundraising
            collected through the efforts of the marketing team will be directly
            invested into bettering Jit Jots’ workshops and put towards select
            charities. The team offers a lot of room for creativity and
            flexibility, in that one can freely plan and decide on the types of
            fundraising events, as well as what organizations to reach out to
            for sponsorships. The marketing team will also be responsible for
            volunteer recruitment pitching. Overall, the marketing team is vital
            for Jit Jots to maintain high quality workshops for everyone to
            enjoy!
          </p>
        </div>
        <img
          src={MarketingTeamGraphic}
          alt="Marketing Team Graphic"
          className="volunteers__graphic"
        />
      </div>
    </div>
  );
}

export default GetInvolvedPage;

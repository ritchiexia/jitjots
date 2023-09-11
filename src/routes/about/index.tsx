import Profile from "@/components/Profile";
import "./styles.scss";
import { getProfiles } from "@/services/ProfilesService";

function AboutPage() {
  const profiles = getProfiles();

  return (
    <div className="aboutpage">
      <h1>📖 About us!</h1>
      <p>
        Jit Jots is a non-profit organization founded by a group of UBC students
        in the faculty of science. Our mission is to share our passion for the
        subject, and hope to inspire a positive learning environment for the
        youth in our community. We strive to make learning fun through weekly
        activity sheets and online workshops where we will guide kids through
        exciting experiments they can do at home and interactive quizzes!
      </p>

      <h1>👋 Meet the team!</h1>
      <div className="profiles">
        {profiles.map((profile) => (
          <Profile {...profile} />
        ))}
      </div>
    </div>
  );
}

export default AboutPage;

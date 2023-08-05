import Profile from "@/components/Profile";
import "./styles.scss";

function AboutPage() {
  return (
    <>
      <div className="aboutpage">
        <h1>About us!</h1>
        <h2 className="aboutpage__section-header">📖 Our Story</h2>
        <p>
          Jit Jots is a non-profit organization founded by a group of UBC
          students in the faculty of science. Our mission is to share our
          passion for the subject, and hope to inspire a positive learning
          environment for the youth in our community. We strive to make learning
          fun through weekly activity sheets and online workshops where we will
          guide kids through exciting experiments they can do at home and
          interactive quizzes!
        </p>

        <h2 className="aboutpage__section-header">🔬 What we do</h2>
        <h3>Workshops</h3>
        <p>
          Jit Jots workshops aim to present various science topics through fun
          activities and engaging demonstrations. From dry ice bubbles to
          extracting DNA from strawberries, children can expect to participate
          in various science plays! Workshops are typically an hour long, but
          can be booked for longer upon requests. Workshops can be booked in
          advance and are completely free.
        </p>
        <h3>Activity Sheets</h3>
        <p>
          Jit Jots activity sheets contain educational yet fun activities with
          the aim of teaching young students various science topics. These
          sheets will soon be available to be downloaded. Stay tuned!
        </p>

        <h2 className="aboutpage__section-header">📱Contact</h2>
        <p>
          Check us out at our website jitjots.com and on our Instagram
          (@JitJotsofficial)! If you have any questions feel free to contact us
          at contact@jitjots.com.
        </p>
      </div>
      <div className="introductions">
        <h1>Meet the team!</h1>
        <Profile />
      </div>
    </>
  );
}

export default AboutPage;

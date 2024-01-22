import InstagramLogo from "@/assets/instagram.svg";
import EmailLogo from "@/assets/email.svg";
import FacebookLogo from "@/assets/facebook.svg";
import TikTok from "@/assets/tiktok.svg";
import YouTube from "@/assets/youtube.svg";

import "./styles.scss";

function Footer() {
  return (
    <footer className="footer">
      <h2>Contact us!</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <div className="footer__icon-group">
          <a href="https://www.instagram.com/jitjotsofficial/" target="_blank">
            <div>
              <img
                src={InstagramLogo}
                alt="Instagram Logo"
                className="footer__icon"
              />
              <b>@jitjotsofficial</b>
            </div>
          </a>
          <a href="mailto:jitjotsactivities@gmail.com">
            <div>
              <img src={EmailLogo} alt="Email Logo" className="footer__icon" />
              <b>jitjotsactivities@gmail.com</b>
            </div>
          </a>
          <a href="https://www.facebook.com/jitjotsactivities/" target="_blank">
            <div>
              <img
                src={FacebookLogo}
                alt="Facebook Logo"
                className="footer__icon"
              />
              <b>@jitjotsactivities</b>
            </div>
          </a>
        </div>
        <div className="footer__icon-group">
          <a href="https://www.tiktok.com/@jitjotsofficial" target="_blank">
            <div>
              <img src={TikTok} alt="TikTok Logo" className="footer__icon" />
              <b>@jitjotsofficial</b>
            </div>
          </a>
          <a href="https://www.youtube.com/@JitJotsEducation" target="_blank">
            <div>
              <img src={YouTube} alt="YouTube Logo" className="footer__icon" />
              <b>JitJots Education</b>
            </div>
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

import InstagramLogo from "@/assets/instagram.svg";
import EmailLogo from "@/assets/email.svg";
import FacebookLogo from "@/assets/facebook.svg";

import "./styles.scss";

function Footer() {
  return (
    <footer className="footer">
      <h2>Contact us!</h2>
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
    </footer>
  );
}

export default Footer;

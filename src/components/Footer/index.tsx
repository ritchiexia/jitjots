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
          <img
            src={InstagramLogo}
            alt="Instagram Logo"
            className="footer__icon"
          />
        </a>
        <a href="mailto:contact@jitjots.com">
          <img src={EmailLogo} alt="Email Logo" className="footer__icon" />
        </a>
        <a href="https://www.facebook.com/jitjotsactivities/" target="_blank">
          <img
            src={FacebookLogo}
            alt="Facebook Logo"
            className="footer__icon"
          />
        </a>
      </div>
    </footer>
  );
}

export default Footer;

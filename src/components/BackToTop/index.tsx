import "./styles.scss";

function BackToTop({ showBackToTop }: BackToTopProps) {
  const handleScrollBackToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div
      className={showBackToTop ? "backtotop" : "hidden"}
      onClick={handleScrollBackToTop}
    />
  );
}

type BackToTopProps = {
  showBackToTop: boolean;
};

export default BackToTop;

import { useRef } from "react";
import ChevronRight from "@/assets/chevron-right.svg";
import ChevronLeft from "@/assets/chevron-left.svg";

import "./styles.scss";

function Carousel() {
  const carouselRef = useRef<null | HTMLDivElement>(null);

  const handleLeftScroll = () => {
    carouselRef.current!.scrollLeft -= carouselRef.current!.offsetWidth;
  };

  const handleRightScroll = () => {
    carouselRef.current!.scrollLeft += carouselRef.current!.offsetWidth;
  };

  return (
    <div className="carousel">
      <button onClick={handleLeftScroll} className="arrow arrow--left">
        <img
          src={ChevronLeft}
          alt="Carousel Left Arrow"
          className="arrow__icon"
        />
      </button>

      <div className="carousel__content" ref={carouselRef}>
        <img src="https://picsum.photos/300" className="carousel__item" />
        <img src="https://picsum.photos/300" className="carousel__item" />
        <img src="https://picsum.photos/300" className="carousel__item" />
        <img src="https://picsum.photos/300" className="carousel__item" />
      </div>

      <button onClick={handleRightScroll} className="arrow arrow--right">
        <img
          src={ChevronRight}
          alt="Carousel Right Arrow"
          className="arrow__icon"
        />
      </button>
    </div>
  );
}

export default Carousel;

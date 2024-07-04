import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

import testImage from "public/images/home.jpeg";

const images = [
  {
    src: testImage,
    alt: "Home page image",
    title: "Title 1",
    desc: "A test description 1, where we did something at somewhere on some date.",
    width: 1,
    height: 2,
  },
  {
    src: testImage,
    alt: "Home page image",
    title: "Title 2",
    desc: "A test description",
    width: 1,
    height: 1,
  },
  {
    src: testImage,
    alt: "Home page image",
    title: "A test title",
    desc: "June 10, 2024: A test description talking about where the photo was taken and what the workshop was for",
    width: 1,
    height: 1,
  },
  {
    src: testImage,
    alt: "Home page image",
    title: "A test title",
    desc: "June 10, 2024: A test description talking about where the photo was taken and what the workshop was for",
    width: 1,
    height: 1,
  },
  {
    src: testImage,
    alt: "Home page image",
    title: "A test title",
    desc: "June 10, 2024: A test description talking about where the photo was taken and what the workshop was for",
    width: 1,
    height: 1,
  },
  {
    src: testImage,
    alt: "Home page image",
    title: "A test title",
    desc: "June 10, 2024: A test description talking about where the photo was taken and what the workshop was for",
    width: 1,
    height: 1,
  },
];

export default function PhotoGallery() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 w-full">
      {images.map((image, idx) => (
        <Dialog key={idx}>
          <DialogTrigger asChild>
            <div
              className={`relative cursor-pointer row-span-${image.width} col-span-${image.height}`}
            >
              <Image src={image.src} alt={image.alt} />
              <h5 className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-gray-50 text-sm p-2 rounded">
                {image.title}
              </h5>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <Image src={image.src} alt={image.alt} />
            <p className="text-lg text-wrap">{image.desc}</p>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}

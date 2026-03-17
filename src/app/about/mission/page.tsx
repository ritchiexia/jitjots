export default function Mission() {
  return (
    <main className="flex min-h-screen flex-col items-center lg:px-32 gap-20">
      <div className="container pt-10 sm:pt-16 space-y-4">
        <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
          About Us
        </h2>
        <div className="text-xl text-muted-foreground space-y-2">
          <p>
            Jit Jots is a{" "}
            <b className="font-medium">non-profit organization</b> founded by
            a group of UBC students in the faculty of science.
          </p>
          <p>
            Our mission is to share our passion for the subject, and hope to
            inspire a positive learning environment for the youth in our
            community.
          </p>
          <p>
            We strive to make learning fun through <b className="font-medium">monthly</b> activity sheets
            and <b className="font-medium">in-person</b> workshops where we will guide kids through exciting
            experiments they can do at home!
          </p>
        </div>
      </div>
    </main>
  );
}

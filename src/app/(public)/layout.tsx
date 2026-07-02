import NavBar from '@/components/navbar';
import Footer from '@/components/footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
      <div className="mt-16">
        <Footer />
      </div>
    </>
  );
}

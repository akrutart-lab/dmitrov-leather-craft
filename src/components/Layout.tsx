import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ChatWidget from './ChatWidget';
import ScrollToTop from './ScrollToTop';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

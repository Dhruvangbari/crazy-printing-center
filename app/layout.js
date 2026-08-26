import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WebNotificationListener from "../components/WebNotificationListener";
import BetaTestingNotice from "../components/BetaTestingNotice";
import LiveUserTracker from "../components/LiveUserTracker";

export const metadata = {
  title: "DHRUVANG CRAZY PRINTING CENTER — Fast Online Document & Xerox Printing",
  description: "Upload your documents, customize print options, pay seamlessly via UPI, and track printing and delivery in real-time with Dhruvang Crazy Printing Center.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <Navbar />
        {children}
        <Footer />
        <BetaTestingNotice />
        <WebNotificationListener />
        <LiveUserTracker />
      </body>
    </html>
  );
}
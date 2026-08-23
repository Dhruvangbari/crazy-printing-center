import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WebNotificationListener from "../components/WebNotificationListener";

export const metadata = {
  title: "Crazy Printing Center — Fast Online Document & Photo Printing",
  description: "Upload your documents, choose print options, pay seamlessly via UPI, and track printing and delivery in real-time.",
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
        <WebNotificationListener />
      </body>
    </html>
  );
}
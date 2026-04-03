import "./globals.css";

export const metadata = {
  title: "ToxiPlays | Project Hub",
  description: "ToxiPlays project hub: experimental web tools, games, and utility projects.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

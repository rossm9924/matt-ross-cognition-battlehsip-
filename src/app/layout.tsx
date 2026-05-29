import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Battleship War",
  description: "Naval combat simulator — single-player Battleship against AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Ops+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: "hidden", backgroundColor: "#000" }}>
        {children}
      </body>
    </html>
  );
}

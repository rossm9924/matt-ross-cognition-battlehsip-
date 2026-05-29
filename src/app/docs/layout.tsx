export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div style={{ overflow: "auto", height: "100vh" }}>
      {children}
    </div>
  );
}

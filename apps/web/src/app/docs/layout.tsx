export const metadata = {
  title: {
    default: "Docs - Robô MultiPost",
    template: "%s - Robô MultiPost Docs",
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {children}
    </div>
  );
}

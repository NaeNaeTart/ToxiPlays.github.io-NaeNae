const projects = [
  {
    type: "Utility",
    title: "TextFlag",
    href: "/textflag/",
    description: "Generate structured Markdown notes from TTML lyric files in a few clicks.",
  },
  {
    type: "Visualizer",
    title: "Gradient Viewer",
    href: "/gv/",
    description: "Extract and tweak Genius-style gradients directly from song pages.",
  },
  {
    type: "Game",
    title: "Imperfect Wordy",
    href: "/wordy/",
    description: "A handmade Wordle-like game with its own chaotic personality.",
  },
  {
    type: "Parody",
    title: "SouljaFood",
    href: "/souljafood/",
    description: "A class project mock storefront for rapper-branded snacks and jokes.",
  },
  {
    type: "Renderer",
    title: "TTMLRenderer",
    href: "/ttmlrenderer/",
    description: "Render and inspect TTML content in-browser with a practical workflow.",
  },
  {
    type: "Info",
    title: "Comms",
    href: "/static/comms/",
    description: "Commission details, policies, and terms of service in one place.",
  },
];

export default function HomePage() {
  return (
    <main className="frame">
      <section className="hero">
        <span className="eyebrow">ToxiPlays Network</span>
        <h1>Projects, tools, and glorious internet nonsense.</h1>
        <p className="subtitle">
          This is the launchpad for everything on ToxiPlays: utility apps, experiments, and weird side quests.
          Pick a card and jump in.
        </p>
      </section>

      <section className="grid" aria-label="Project links">
        {projects.map((project) => (
          <a key={project.title} href={project.href} className="card">
            <div className="card-type">{project.type}</div>
            <div className="card-title">{project.title}</div>
            <div className="card-desc">{project.description}</div>
          </a>
        ))}
      </section>

      <footer>
        <span>Hosted on</span>
        <a href="https://pages.github.com/">GitHub Pages</a>
        <span className="tiny-credit">Site support: Estopia Engineering</span>
      </footer>
    </main>
  );
}

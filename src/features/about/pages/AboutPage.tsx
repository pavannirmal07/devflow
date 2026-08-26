import { User, ExternalLink, Globe, BookOpen } from "lucide-react";
import { GitHubIcon } from "@/features/github/components/GitHubIcon";
import { InstagramIcon } from "../components/InstagramIcon";
import "../about.css";

export function AboutPage() {
  const appVersion = import.meta.env.VITE_APP_VERSION || "";
  const displayVersion = appVersion
    ? appVersion.startsWith("v")
      ? appVersion
      : `v${appVersion}`
    : "";

  return (
    <div className="devflow-about-page">
      {/* Page Subtitle Header */}
      <header className="devflow-about-header">
        <p className="devflow-about-subtitle">
          Learn about DevFlow and its creator.
        </p>
      </header>

      {/* Developer & About Section */}
      <section className="devflow-about-section" aria-labelledby="developer-heading">
        <div className="devflow-about-section-header">
          <h2 id="developer-heading" className="devflow-about-section-title">
            <User className="size-4 text-accent shrink-0" />
            <span>Developer &amp; About</span>
          </h2>
          <p className="devflow-about-tagline">
            &ldquo;Built for developers, by a developer.&rdquo;
          </p>
        </div>

        <div className="devflow-about-list">
          <div className="devflow-about-row">
            <span className="devflow-about-label">Developer</span>
            <span className="devflow-about-val font-semibold text-foreground">
              Pavan Nirmal
            </span>
          </div>

          <div className="devflow-about-row">
            <span className="devflow-about-label">GitHub</span>
            <a
              href="https://github.com/pavannirmal07"
              target="_blank"
              rel="noopener noreferrer"
              className="devflow-about-link"
              aria-label="Pavan Nirmal GitHub Profile (opens in new tab)"
            >
              <GitHubIcon className="size-3.5 shrink-0" />
              <span>pavannirmal07</span>
              <ExternalLink className="size-3 shrink-0 opacity-70" />
            </a>
          </div>

          <div className="devflow-about-row">
            <span className="devflow-about-label">Portfolio</span>
            <a
              href="https://pavannirmal07.github.io/Portfolio/"
              target="_blank"
              rel="noopener noreferrer"
              className="devflow-about-link"
              aria-label="Pavan Nirmal Portfolio (opens in new tab)"
            >
              <Globe className="size-3.5 shrink-0" />
              <span>Portfolio</span>
              <ExternalLink className="size-3 shrink-0 opacity-70" />
            </a>
          </div>

          <div className="devflow-about-row">
            <span className="devflow-about-label">Blog (Lekhani)</span>
            <a
              href="https://pavannirmal.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="devflow-about-link"
              aria-label="Lekhani Blog Web App (opens in new tab)"
            >
              <BookOpen className="size-3.5 shrink-0" />
              <span>pavannirmal.vercel.app</span>
              <ExternalLink className="size-3 shrink-0 opacity-70" />
            </a>
          </div>

          <div className="devflow-about-row">
            <span className="devflow-about-label">Instagram</span>
            <a
              href="https://www.instagram.com/pavan__nirmal/"
              target="_blank"
              rel="noopener noreferrer"
              className="devflow-about-link"
              aria-label="Pavan Nirmal Instagram Profile (opens in new tab)"
            >
              <InstagramIcon className="size-3.5 shrink-0" />
              <span>@pavan__nirmal</span>
              <ExternalLink className="size-3 shrink-0 opacity-70" />
            </a>
          </div>

          <div className="devflow-about-row">
            <span className="devflow-about-label">Application</span>
            <span className="devflow-about-val">DevFlow</span>
          </div>

          <div className="devflow-about-row">
            <span className="devflow-about-label">Version</span>
            <span className="devflow-about-val">{displayVersion}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

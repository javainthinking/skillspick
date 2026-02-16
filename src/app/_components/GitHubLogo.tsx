/** Light mode: github_light.svg; dark mode: github.svg */
export default function GitHubLogo({ className = "h-4 w-4 opacity-85" }: { className?: string }) {
  return (
    <span className="inline-block size-4">
      <img
        src="/brands/github_light.svg"
        alt="GitHub"
        className={`${className} dark:hidden`}
      />
      <img
        src="/brands/github.svg"
        alt="GitHub"
        className={`${className} hidden dark:block`}
      />
    </span>
  );
}
